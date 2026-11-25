import { prisma } from "../db";
import { logger } from "../utils/logger";
import { rebalanceAgent, ScanResult } from "../agent/rebalance-agent";
import { backgroundScheduler, SweepExecutionRecord } from "./background-scheduler";
import { calculateHaversineDistanceKm, rebalanceService } from "./rebalance-service";
import * as fs from "fs";
import * as path from "path";

export interface CycleExecutionResult {
  cycle: number;
  name: string;
  region: string;
  salesGenerated: {
    transactionsCount: number;
    linesCount: number;
    totalQuantitySold: number;
  };
  depletedItemsCount: number;
  scanResult: {
    evaluatedPairs: number;
    recommendationsGenerated: number;
    highPriorityCount: number;
    durationMs: number;
  };
  approvalsExecuted: {
    approvedCount: number;
    transfersCreated: number;
    unitsTransferred: number;
    replenishedDestinationCount: number;
  };
  openRemainingCount: number;
  summary: string;
}

export interface SimulationReport {
  timestamp: string;
  totalCyclesExecuted: number;
  baselineDataReplaced: {
    storesCount: number;
    productsCount: number;
    inventoryCount: number;
    historicalSalesLinesCount: number;
  };
  cycles: CycleExecutionResult[];
  finalState: {
    totalInventoryRows: number;
    totalSalesTransactions: number;
    totalSalesLines: number;
    totalStockTransfers: number;
    totalRecommendations: number;
    openRecommendations: number;
    approvedRecommendations: number;
  };
}

export class RealisticSimulationService {
  /**
   * 1. Replaces mass-depleted / test data with realistic healthy operational inventory and sales lines
   */
  async replaceDataWithHealthyBaseline(): Promise<{
    storesCount: number;
    productsCount: number;
    inventoryCount: number;
    historicalSalesLinesCount: number;
  }> {
    logger.info("[RealisticSimulation] Step 1: Purging old recommendations, actions, and transfers...");

    // Clean reverse-dependency purge of transactional recommendations and transfers
    await prisma.$executeRawUnsafe(`
      DELETE FROM ActionHistory;
      DELETE FROM [Action];
      DELETE FROM RecommendationEvidence;
      DELETE FROM Recommendation;
      DELETE FROM StockTransferLine;
      DELETE FROM StockTransfer;
      DELETE FROM InventoryMovement;
    `);

    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, storeCode: true, regionId: true },
      orderBy: { storeCode: "asc" },
    });

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, sku: true, sellingPrice: true },
      orderBy: { sku: "asc" },
    });

    logger.info(`[RealisticSimulation] Found ${stores.length} stores and ${products.length} products.`);

    // 2. Reset all 4,558 inventory balances to realistic operational levels
    logger.info("[RealisticSimulation] Resetting inventory records across healthy buffers and donor surplus...");
    await prisma.$executeRawUnsafe(`
      UPDATE Inventory 
      SET 
        availableQuantity = CASE 
          WHEN (ABS(CHECKSUM(id)) % 10) IN (0, 1) THEN 115.0
          WHEN (ABS(CHECKSUM(id)) % 10) = 2 THEN 95.0
          WHEN (ABS(CHECKSUM(id)) % 10) = 8 THEN 32.0
          ELSE 55.0
        END,
        reservedQuantity = 0.0,
        inTransitQuantity = 0.0,
        minimumStock = 10.0,
        maximumStock = 120.0,
        reorderLevel = 15.0,
        version = 1,
        lastUpdatedOn = GETDATE();
    `);

    const inventoryCount = await prisma.inventory.count();
    logger.info(`[RealisticSimulation] ${inventoryCount} inventory balances restored to healthy state.`);

    // 3. Clean up old sales transactions and seed 30-day baseline historical sales lines
    logger.info("[RealisticSimulation] Seeding 30-day historical POS sales lines so rolling ADS is authentic...");
    await prisma.$executeRawUnsafe(`
      DELETE FROM SalesTransactionLine;
      DELETE FROM SalesTransaction;

      INSERT INTO SalesTransaction (id, transactionNumber, storeId, transactionDate, customerId, totalQuantity, totalAmount)
      SELECT 
        LOWER(NEWID()),
        'POS-BASE-' + s.storeCode,
        s.id,
        DATEADD(day, -5, GETDATE()),
        'REGULAR_RETAIL_SHOPPER',
        COUNT(i.id) * 60.0,
        SUM(p.sellingPrice * 60.0)
      FROM Store s
      JOIN Inventory i ON s.id = i.storeId
      JOIN Product p ON i.productId = p.id
      GROUP BY s.id, s.storeCode;

      INSERT INTO SalesTransactionLine (id, salesTransactionId, productId, quantity, unitPrice, discount, netAmount)
      SELECT 
        LOWER(NEWID()),
        st.id,
        i.productId,
        60.0,
        p.sellingPrice,
        0.0,
        p.sellingPrice * 60.0
      FROM SalesTransaction st
      JOIN Inventory i ON st.storeId = i.storeId
      JOIN Product p ON i.productId = p.id
      WHERE st.transactionNumber LIKE 'POS-BASE-%';
    `);

    const [txCount, totalHistoricalLines] = await Promise.all([
      prisma.salesTransaction.count(),
      prisma.salesTransactionLine.count(),
    ]);

    logger.info(`[RealisticSimulation] Seeded ${txCount} historical transactions with ${totalHistoricalLines} sales lines.`);

    return {
      storesCount: stores.length,
      productsCount: products.length,
      inventoryCount,
      historicalSalesLinesCount: totalHistoricalLines,
    };
  }

  /**
   * 2. Executes a single cycle:
   *   - Depletes a targeted cohort via real POS sales
   *   - Runs the rebalance agent scan to evaluate the network and generate recommendations
   *   - Approves a set of recommendations, creates stock transfers, dispatches & receives inventory
   */
  async executeCycle(params: {
    cycleIndex: number;
    name: string;
    regionCode?: string;
    itemCount: number;
    approveFraction: number; // e.g. 1.0 (approve all) or 0.35 (leave some open)
  }): Promise<CycleExecutionResult> {
    const { cycleIndex, name, regionCode, itemCount, approveFraction } = params;
    logger.info(`[RealisticSimulation] === Starting Cycle ${cycleIndex}: ${name} ===`);

    const defaultUser = (await prisma.user.findFirst({ where: { role: "ADMIN" } })) || (await prisma.user.findFirst());
    const actorUserId = defaultUser?.id || "00000000-0000-0000-0000-000000000000";

    // Step A: Pick stores and products for this cycle's sales depletion wave
    let targetStores = await prisma.store.findMany({
      where: regionCode ? { region: { code: regionCode }, isActive: true } : { isActive: true },
      include: { region: true },
      take: 6,
    });

    if (targetStores.length === 0) {
      targetStores = await prisma.store.findMany({ where: { isActive: true }, take: 6, include: { region: true } });
    }

    const targetStoreIds = targetStores.map((s) => s.id);

    // Find active inventories in these stores that have stock > 30 and don't already have open recs
    const candidateInvs = await prisma.inventory.findMany({
      where: {
        storeId: { in: targetStoreIds },
        availableQuantity: { gte: 30 },
      },
      include: {
        store: { include: { region: true } },
        product: true,
      },
      take: itemCount * 2,
    });

    // Select distinct store-product pairs up to itemCount
    const selectedInvs = candidateInvs.slice(0, itemCount);
    logger.info(`[RealisticSimulation] Cycle ${cycleIndex}: Depleting ${selectedInvs.length} items via POS sales bursts...`);

    // Ingest POS sales burst transactions for each selected item
    let totalQtySold = 0;
    let salesLinesCount = 0;
    const now = new Date();
    const cycleDate = new Date(now.getTime() - (5 - cycleIndex) * 12 * 60 * 60 * 1000); // progressive shift timestamps

    for (const inv of selectedInvs) {
      const currentStock = Number(inv.availableQuantity);
      // Deplete so stock drops to 2.0 - 4.0 units (critical DOI < 2.0d)
      const targetPostStock = 2.0 + (inv.productId.charCodeAt(0) % 3);
      const unitsToSell = Math.max(10, currentStock - targetPostStock);
      const unitPrice = Number(inv.product.sellingPrice || 120);
      const netAmount = unitsToSell * unitPrice;

      const txNumber = `POS-C${cycleIndex}-${inv.store.storeCode}-${Date.now().toString().slice(-5)}-${Math.floor(Math.random() * 1000)}`;

      const tx = await prisma.salesTransaction.create({
        data: {
          transactionNumber: txNumber,
          storeId: inv.storeId,
          transactionDate: cycleDate,
          customerId: `CYCLE_${cycleIndex}_CUSTOMER`,
          totalQuantity: unitsToSell,
          totalAmount: netAmount,
          lines: {
            create: [
              {
                productId: inv.productId,
                quantity: unitsToSell,
                unitPrice,
                discount: 0.0,
                netAmount,
              },
            ],
          },
        },
      });

      // Update inventory balance and record movement
      await prisma.inventory.update({
        where: { id: inv.id },
        data: {
          availableQuantity: targetPostStock,
          version: { increment: 1 },
          lastUpdatedOn: cycleDate,
        },
      });

      await prisma.inventoryMovement.create({
        data: {
          inventoryId: inv.id,
          movementType: "POS_SALE",
          quantity: -unitsToSell,
          referenceType: "SALES_TRANSACTION",
          referenceId: tx.transactionNumber,
          remarks: `Cycle ${cycleIndex} POS sales velocity burst: sold ${unitsToSell} units`,
          createdBy: "POS_TERMINAL_01",
          movementDate: cycleDate,
        },
      });

      totalQtySold += unitsToSell;
      salesLinesCount++;
    }

    logger.info(`[RealisticSimulation] Cycle ${cycleIndex}: Sales complete. ${salesLinesCount} items depleted (${totalQtySold} units sold).`);

    // Step B: Run Intelligence Rebalance Scan
    const scanStartTime = Date.now();
    logger.info(`[RealisticSimulation] Cycle ${cycleIndex}: Running Intelligence Rebalance Scan...`);
    const scanResult: ScanResult = await rebalanceAgent.runScan();
    const scanDuration = Date.now() - scanStartTime;

    logger.info(
      `[RealisticSimulation] Cycle ${cycleIndex} Scan Finished in ${scanDuration}ms: Evaluated ${scanResult.evaluatedPairs} pairs, generated ${scanResult.createdRecommendations} recommendations.`
    );

    // Step C: Approvals & Fulfillment Workflow
    // Query the newly generated recommendations
    const openRecs = await prisma.recommendation.findMany({
      where: {
        status: "OPEN",
        storeId: { in: targetStoreIds },
      },
      include: {
        product: true,
        store: true,
        fromStore: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const countToApprove = Math.round(openRecs.length * approveFraction);
    const recsToApprove = openRecs.slice(0, countToApprove);
    logger.info(`[RealisticSimulation] Cycle ${cycleIndex}: Approving ${recsToApprove.length} of ${openRecs.length} recommendations...`);

    let unitsTransferred = 0;
    let transfersCreated = 0;
    let replenishedCount = 0;

    for (const rec of recsToApprove) {
      const qty = Number(rec.recommendedQuantity);
      const transferNumber = `TRF-C${cycleIndex}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      if (rec.fromStoreId) {
        // Peer-to-peer store transfer
        // 1. Decrement donor store stock
        const donorInv = await prisma.inventory.findFirst({
          where: { storeId: rec.fromStoreId, productId: rec.productId },
        });

        if (donorInv && Number(donorInv.availableQuantity) >= qty) {
          await prisma.inventory.update({
            where: { id: donorInv.id },
            data: {
              availableQuantity: { decrement: qty },
              version: { increment: 1 },
              lastUpdatedOn: cycleDate,
            },
          });

          await prisma.inventoryMovement.create({
            data: {
              inventoryId: donorInv.id,
              movementType: "TRANSFER_OUT_DISPATCH",
              quantity: -qty,
              referenceType: "STOCK_TRANSFER",
              referenceId: transferNumber,
              remarks: `Dispatched ${qty} units to ${rec.store?.name || rec.storeId} via ${transferNumber}`,
              createdBy: "LOGISTICS_DISPATCH_BOT",
              movementDate: cycleDate,
            },
          });
        }

        // 2. Create StockTransfer in RECEIVED state (simulating completed transfer)
        const transfer = await prisma.stockTransfer.create({
          data: {
            transferNumber,
            fromStoreId: rec.fromStoreId,
            toStoreId: rec.storeId,
            status: "RECEIVED",
            carrierName: "BlueDart Express Retail Logistics",
            vehicleNumber: `MH-${12 + cycleIndex}-TR-${1000 + Math.floor(Math.random() * 9000)}`,
            dispatchedAt: cycleDate,
            receivedAt: new Date(cycleDate.getTime() + 4 * 60 * 60 * 1000), // arrived 4h later
            requestedBy: "AI_REBALANCE_ENGINE",
            approvedBy: "OPERATIONS_SUPERVISOR",
            receivedBy: "STORE_INWARD_LEAD",
            lines: {
              create: [
                {
                  productId: rec.productId,
                  requestedQty: qty,
                  approvedQty: qty,
                  receivedQty: qty,
                },
              ],
            },
          },
        });

        transfersCreated++;

        // 3. Replenish destination store inventory
        const destInv = await prisma.inventory.findFirst({
          where: { storeId: rec.storeId, productId: rec.productId },
        });

        if (destInv) {
          await prisma.inventory.update({
            where: { id: destInv.id },
            data: {
              availableQuantity: { increment: qty },
              version: { increment: 1 },
              lastUpdatedOn: new Date(cycleDate.getTime() + 4 * 60 * 60 * 1000),
            },
          });

          await prisma.inventoryMovement.create({
            data: {
              inventoryId: destInv.id,
              movementType: "TRANSFER_IN_RECEIPT",
              quantity: qty,
              referenceType: "STOCK_TRANSFER",
              referenceId: transferNumber,
              remarks: `Inward receipt of ${qty} units from ${rec.fromStore?.name || rec.fromStoreId} via ${transferNumber}`,
              createdBy: "STORE_INWARD_LEAD",
              movementDate: new Date(cycleDate.getTime() + 4 * 60 * 60 * 1000),
            },
          });

          replenishedCount++;
        }

        // 4. Update Recommendation
        await prisma.recommendation.update({
          where: { id: rec.id },
          data: {
            status: "APPROVED",
            stockTransferId: transfer.id,
          },
        });
      } else {
        // Central Supply Fallback: directly inward to destination
        const destInv = await prisma.inventory.findFirst({
          where: { storeId: rec.storeId, productId: rec.productId },
        });

        if (destInv) {
          await prisma.inventory.update({
            where: { id: destInv.id },
            data: {
              availableQuantity: { increment: qty },
              version: { increment: 1 },
              lastUpdatedOn: cycleDate,
            },
          });

          await prisma.inventoryMovement.create({
            data: {
              inventoryId: destInv.id,
              movementType: "INWARD_RECEIPT",
              quantity: qty,
              referenceType: "CENTRAL_SUPPLY",
              referenceId: transferNumber,
              remarks: `Central Supply DC replenishment of ${qty} units`,
              createdBy: "DC_SUPPLY_CHAIN",
              movementDate: cycleDate,
            },
          });

          replenishedCount++;
        }

        await prisma.recommendation.update({
          where: { id: rec.id },
          data: { status: "APPROVED" },
        });
      }

      // Record Action and ActionHistory
      const action = await prisma.action.create({
        data: {
          recommendationId: rec.id,
          actionType: "APPROVE",
          actionedBy: actorUserId,
          actionedOn: cycleDate,
          comments: `Cycle ${cycleIndex}: Approved ${qty} units for network rebalance fulfillment.`,
        },
      });

      await prisma.actionHistory.create({
        data: {
          actionId: action.id,
          previousStatus: "OPEN",
          newStatus: "APPROVED",
          changedBy: "OPERATIONS_MANAGER",
          changedOn: cycleDate,
          comments: `Fulfillment executed successfully: ${transferNumber}`,
        },
      });

      unitsTransferred += qty;
    }

    const openRemaining = await prisma.recommendation.count({
      where: { status: "OPEN" },
    });

    const summary = `Cycle ${cycleIndex} (${name}): ${salesLinesCount} items depleted via sales, ${scanResult.createdRecommendations} recommendations generated, ${recsToApprove.length} approved & fulfilled (${unitsTransferred} units transferred). ${openRemaining} open recommendations remaining.`;

    return {
      cycle: cycleIndex,
      name,
      region: regionCode || "MULTI-REGION",
      salesGenerated: {
        transactionsCount: salesLinesCount,
        linesCount: salesLinesCount,
        totalQuantitySold: totalQtySold,
      },
      depletedItemsCount: salesLinesCount,
      scanResult: {
        evaluatedPairs: scanResult.evaluatedPairs,
        recommendationsGenerated: scanResult.createdRecommendations,
        highPriorityCount: scanResult.highPriorityCount,
        durationMs: scanDuration,
      },
      approvalsExecuted: {
        approvedCount: recsToApprove.length,
        transfersCreated,
        unitsTransferred,
        replenishedDestinationCount: replenishedCount,
      },
      openRemainingCount: openRemaining,
      summary,
    };
  }

  /**
   * 3. Runs the complete 5-Cycle realistic store simulation
   */
  async runFull5CycleSimulation(): Promise<SimulationReport> {
    logger.info("[RealisticSimulation] ========================================================");
    logger.info("[RealisticSimulation] STARTING REALISTIC 5-CYCLE STORE SIMULATION");
    logger.info("[RealisticSimulation] ========================================================");

    // Step 1: Replace & restore healthy baseline data
    const baseline = await this.replaceDataWithHealthyBaseline();

    // Step 2: Define 5 progressive operational cycles
    const cycleConfigs = [
      {
        cycleIndex: 1,
        name: "Central MP Staples & Groceries Wave",
        regionCode: "REG-CENTRAL-MP",
        itemCount: 16,
        approveFraction: 1.0, // 100% approved
      },
      {
        cycleIndex: 2,
        name: "Western MH Packaged Foods & Snacks Wave",
        regionCode: "REG-WEST-MH",
        itemCount: 18,
        approveFraction: 1.0, // 100% approved
      },
      {
        cycleIndex: 3,
        name: "Gujarat Beverages & Dairy Wave",
        regionCode: "REG-GUJARAT",
        itemCount: 18,
        approveFraction: 1.0, // 100% approved
      },
      {
        cycleIndex: 4,
        name: "Delhi NCR Personal Care & Hygiene Wave",
        regionCode: "REG-DELHI-NCR",
        itemCount: 20,
        approveFraction: 1.0, // 100% approved
      },
      {
        cycleIndex: 5,
        name: "Current Active Shift (Live High-Velocity Network Demand)",
        regionCode: undefined, // Network-wide
        itemCount: 22,
        approveFraction: 0.35, // 35% approved, 65% left OPEN for live user action!
      },
    ];

    const cycleResults: CycleExecutionResult[] = [];

    for (const cfg of cycleConfigs) {
      const res = await this.executeCycle(cfg);
      cycleResults.push(res);
      logger.info(`[RealisticSimulation] Cycle ${cfg.cycleIndex} Summary: ${res.summary}`);
    }

    // Step 3: Update scheduler telemetry & scheduler-config.json
    logger.info("[RealisticSimulation] Updating background scheduler telemetry with 5-cycle history...");
    const latestCycle = cycleResults[cycleResults.length - 1];

    const executionsHistory: SweepExecutionRecord[] = cycleResults.map((c) => ({
      id: `sweep-sim-c${c.cycle}-${Date.now()}`,
      timestamp: new Date(Date.now() - (5 - c.cycle) * 60 * 60 * 1000).toISOString(),
      type: "HOURLY",
      durationMs: c.scanResult.durationMs,
      evaluatedPairs: c.scanResult.evaluatedPairs,
      createdRecs: c.scanResult.recommendationsGenerated,
      autoExpiredCount: 0,
      summary: `HOURLY sweep (Cycle ${c.cycle}: ${c.name}) completed in ${c.scanResult.durationMs}ms (${c.scanResult.evaluatedPairs} pairs, ${c.scanResult.recommendationsGenerated} recs generated)`,
    }));

    // Save into backgroundScheduler instance and config file
    backgroundScheduler.setRecentExecutions(executionsHistory);
    backgroundScheduler.setLastTelemetry({
      lastRunAt: new Date().toISOString(),
      lastRunType: "HOURLY",
      lastDurationMs: latestCycle.scanResult.durationMs,
      lastEvaluatedPairs: latestCycle.scanResult.evaluatedPairs,
      lastCreatedRecs: latestCycle.scanResult.recommendationsGenerated,
      lastAutoExpiredCount: 0,
    });

    const [finalInv, finalSalesTx, finalSalesLines, finalTransfers, finalRecs, openRecs, approvedRecs] =
      await Promise.all([
        prisma.inventory.count(),
        prisma.salesTransaction.count(),
        prisma.salesTransactionLine.count(),
        prisma.stockTransfer.count(),
        prisma.recommendation.count(),
        prisma.recommendation.count({ where: { status: "OPEN" } }),
        prisma.recommendation.count({ where: { status: "APPROVED" } }),
      ]);

    const report: SimulationReport = {
      timestamp: new Date().toISOString(),
      totalCyclesExecuted: 5,
      baselineDataReplaced: baseline,
      cycles: cycleResults,
      finalState: {
        totalInventoryRows: finalInv,
        totalSalesTransactions: finalSalesTx,
        totalSalesLines: finalSalesLines,
        totalStockTransfers: finalTransfers,
        totalRecommendations: finalRecs,
        openRecommendations: openRecs,
        approvedRecommendations: approvedRecs,
      },
    };

    logger.info("[RealisticSimulation] ========================================================");
    logger.info("[RealisticSimulation] 5-CYCLE STORE SIMULATION COMPLETED SUCCESSFULLY!");
    logger.info(`[RealisticSimulation] Total Recommendations: ${finalRecs} (${openRecs} OPEN, ${approvedRecs} APPROVED)`);
    logger.info(`[RealisticSimulation] Total Transfers Executed: ${finalTransfers}`);
    logger.info(`[RealisticSimulation] Total Sales Transactions: ${finalSalesTx} (${finalSalesLines} sales lines)`);
    logger.info("[RealisticSimulation] ========================================================");

    return report;
  }
}

export const realisticSimulationService = new RealisticSimulationService();
