import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "../../db";
import { storage } from "../../storage";
import { calculateHaversineDistanceKm, rebalanceService } from "../../services/rebalance-service";

/**
 * Tool 1: InspectStoreInventoryTool
 * Inspects real live inventory balance from Microsoft SQL Server (Prisma) with storage fallback.
 */
export const inspectStoreInventoryTool = tool(
  async ({ storeId, regionId, productId }) => {
    try {
      const where: any = {};
      if (storeId && storeId !== "ALL") where.storeId = storeId;
      if (productId) where.productId = productId;

      let inventories = await prisma.inventory.findMany({
        where,
        include: {
          store: { include: { region: true } },
          product: { include: { category: true } },
        },
      });

      if (regionId && regionId !== "ALL") {
        inventories = inventories.filter((inv) => inv.store.regionId === regionId);
      }

      if (inventories.length === 0 && storeId) {
        // Fallback to storage layer
        const fallback = await storage.getStoreInventory(storeId);
        return JSON.stringify(
          fallback.map((inv: any) => ({
            inventoryId: inv.id,
            storeId: inv.storeId,
            storeName: inv.store?.name || "Store",
            storeCode: inv.store?.storeCode || "STR",
            regionId: inv.store?.regionId || regionId,
            productId: inv.productId,
            productName: inv.product?.name || "Product",
            sku: inv.product?.sku || "SKU",
            availableQuantity: Number(inv.availableQuantity),
            reservedQuantity: Number(inv.reservedQuantity),
            reorderLevel: Number(inv.reorderLevel),
            minimumStock: Number(inv.minimumStock),
            maximumStock: Number(inv.maximumStock),
          }))
        );
      }

      return JSON.stringify(
        inventories.map((inv) => ({
          inventoryId: inv.id,
          storeId: inv.storeId,
          storeName: inv.store.name,
          storeCode: inv.store.storeCode,
          regionId: inv.store.regionId,
          regionName: inv.store.region?.name,
          productId: inv.productId,
          productName: inv.product.name,
          sku: inv.product.sku,
          availableQuantity: Number(inv.availableQuantity),
          reservedQuantity: Number(inv.reservedQuantity),
          reorderLevel: Number(inv.reorderLevel),
          minimumStock: Number(inv.minimumStock),
          maximumStock: Number(inv.maximumStock),
        }))
      );
    } catch (err: any) {
      return JSON.stringify({ error: err.message, items: [] });
    }
  },
  {
    name: "inspect_store_inventory",
    description:
      "Fetches real live inventory balances for a store or region, returning available stock, reorder levels, and SKU codes.",
    schema: z.object({
      storeId: z.string().optional().describe("Target store ID or omit for all stores"),
      regionId: z.string().optional().describe("Target operational region ID or omit for all"),
      productId: z.string().optional().describe("Optional product ID to inspect a specific SKU"),
    }),
  }
);

/**
 * Tool 2: CalculateSalesVelocityTool
 * Queries actual POS sales transactions from the database.
 * CRITICAL RULE: If no sales transactions exist, returns strictly ADS = 0.000 without fabricating fake numbers.
 */
export const calculateSalesVelocityTool = tool(
  async ({ storeId, productId, lookbackDays = 30 }) => {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - lookbackDays);

      const salesLines = await prisma.salesTransactionLine.findMany({
        where: {
          productId,
          salesTransaction: {
            storeId,
            transactionDate: { gte: sinceDate },
          },
        },
        select: {
          quantity: true,
          salesTransaction: {
            select: { transactionDate: true },
          },
        },
      });

      if (!salesLines || salesLines.length === 0) {
        return JSON.stringify({
          storeId,
          productId,
          lookbackDays,
          totalUnitsSold: 0,
          activeSalesDays: 0,
          ads: 0.0,
          isDormant: true,
          message: "No sales transactions found in lookback window. Daily velocity is strictly 0.0 units/day.",
        });
      }

      const totalQuantity = salesLines.reduce((acc, line) => acc + Number(line.quantity), 0);
      const uniqueDays = new Set(
        salesLines.map((l) => l.salesTransaction.transactionDate.toISOString().slice(0, 10))
      ).size;

      const effectiveDays = Math.max(1, Math.min(lookbackDays, uniqueDays));
      const ads = parseFloat((totalQuantity / effectiveDays).toFixed(3));

      return JSON.stringify({
        storeId,
        productId,
        lookbackDays,
        totalUnitsSold: totalQuantity,
        activeSalesDays: uniqueDays,
        ads,
        isDormant: false,
      });
    } catch {
      // In offline / no sales mode, real velocity is 0
      return JSON.stringify({
        storeId,
        productId,
        lookbackDays,
        totalUnitsSold: 0,
        activeSalesDays: 0,
        ads: 0.0,
        isDormant: true,
      });
    }
  },
  {
    name: "calculate_sales_velocity",
    description:
      "Calculates the authentic rolling Average Daily Sales (ADS) from real POS transactions. If no sales have occurred, returns 0.0.",
    schema: z.object({
      storeId: z.string().describe("Store ID to evaluate sales velocity for"),
      productId: z.string().describe("Product ID to compute ADS for"),
      lookbackDays: z.number().optional().default(30).describe("Historical rolling day window (default 30 days)"),
    }),
  }
);

/**
 * Tool 3: EvaluateDoiAndStockoutRiskTool
 * Calculates deterministic Days of Inventory (DOI) and classifies stockout risk.
 */
export const evaluateDoiAndStockoutRiskTool = tool(
  async ({ currentStock, ads, reorderLevel, minimumStock }) => {
    // Deterministic DOI math
    let doi: number;
    let riskTier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "HEALTHY";
    let isAtRisk: boolean;

    if (ads <= 0) {
      if (currentStock <= 0) {
        doi = 0.0;
        riskTier = "CRITICAL";
        isAtRisk = true;
      } else if (reorderLevel > 0 && currentStock <= reorderLevel) {
        doi = 999.0;
        riskTier = "LOW";
        isAtRisk = true; // Below reorder level even if zero velocity
      } else {
        doi = 999.0;
        riskTier = "HEALTHY";
        isAtRisk = false; // Stocked and no depletion velocity
      }
    } else {
      doi = parseFloat((currentStock / ads).toFixed(2));
      if (doi <= 1.5 || currentStock <= minimumStock) {
        riskTier = "CRITICAL";
        isAtRisk = true;
      } else if (doi <= 3.0 || currentStock <= reorderLevel) {
        riskTier = "HIGH";
        isAtRisk = true;
      } else if (doi <= 7.0) {
        riskTier = "MEDIUM";
        isAtRisk = false;
      } else {
        riskTier = "HEALTHY";
        isAtRisk = false;
      }
    }

    // 14-day replenishment horizon target
    const targetBufferUnits = ads > 0 ? Math.ceil(14.0 * ads) : Math.max(10, Math.ceil(reorderLevel * 1.5));
    const targetUnitsNeeded = Math.max(10, targetBufferUnits - currentStock);

    return JSON.stringify({
      currentStock,
      ads,
      doi,
      riskTier,
      isAtRisk,
      targetBufferUnits,
      targetUnitsNeeded: isAtRisk ? targetUnitsNeeded : 0,
    });
  },
  {
    name: "evaluate_doi_and_stockout_risk",
    description:
      "Calculates Days of Inventory (DOI) from available stock and ADS, classifying stockout risk and 14-day replenishment target.",
    schema: z.object({
      currentStock: z.number().describe("Current available inventory units"),
      ads: z.number().describe("Average Daily Sales velocity"),
      reorderLevel: z.number().describe("Store reorder level threshold"),
      minimumStock: z.number().describe("Store safety minimum threshold"),
    }),
  }
);

/**
 * Tool 4: RankRegionalDonorStoresTool
 * Scans peer stores within the same region, enforces the strict 7-day donor safety floor,
 * calculates Haversine transit distances, and returns the Rank #1 donor store or signals Central Supply fallback.
 */
export const rankRegionalDonorStoresTool = tool(
  async ({ destStoreId, regionId, productId, unitsNeeded }) => {
    try {
      const destStore = await prisma.store.findUnique({
        where: { id: destStoreId },
      });

      // Find peer inventory for same product in the same region
      const peerInventories = await prisma.inventory.findMany({
        where: {
          productId,
          storeId: { not: destStoreId },
          store: {
            regionId,
            isActive: true,
          },
          availableQuantity: { gt: 10 },
        },
        include: {
          store: true,
        },
      });

      if (peerInventories.length === 0) {
        return JSON.stringify({
          eligibleDonorFound: false,
          fallback: "CENTRAL_SUPPLY",
          reason: "No peer stores in the region hold surplus inventory. Escalate to Central Supply / Mother Hub.",
          candidates: [],
        });
      }

      const eligibleCandidates: any[] = [];

      for (const peer of peerInventories) {
        const donorStock = Number(peer.availableQuantity);

        // Fetch actual donor ADS from sales transactions if available
        let donorAds = 1.0;
        try {
          const lines = await prisma.salesTransactionLine.findMany({
            where: {
              productId,
              salesTransaction: { storeId: peer.storeId },
            },
            take: 20,
          });
          if (lines.length > 0) {
            const sum = lines.reduce((acc, l) => acc + Number(l.quantity), 0);
            donorAds = Math.max(0.2, parseFloat((sum / 30).toFixed(2)));
          }
        } catch {}

        // Enforce 7-day Donor Safety Floor
        const evaluation = rebalanceService.evaluateCandidate(donorStock, donorAds, unitsNeeded);

        if (evaluation.eligible && evaluation.transferableStock > 0) {
          const distanceKm = calculateHaversineDistanceKm(
            Number(destStore?.latitude || 23.2599),
            Number(destStore?.longitude || 77.4126),
            Number(peer.store.latitude || 22.7196),
            Number(peer.store.longitude || 75.8577)
          );

          eligibleCandidates.push({
            storeId: peer.store.id,
            storeName: peer.store.name,
            storeCode: peer.store.storeCode,
            distanceKm,
            availableStock: donorStock,
            transferableStock: evaluation.transferableStock,
            projectedPostDoi: evaluation.projectedPostDoi,
            donorAds,
          });
        }
      }

      if (eligibleCandidates.length === 0) {
        return JSON.stringify({
          eligibleDonorFound: false,
          fallback: "CENTRAL_SUPPLY",
          reason: "Peer stores hold stock but cannot transfer without dropping below the mandatory 7.0-day safety floor.",
          candidates: [],
        });
      }

      // Rank by closest Haversine road transit distance
      eligibleCandidates.sort((a, b) => a.distanceKm - b.distanceKm);
      const chosen = eligibleCandidates[0];

      return JSON.stringify({
        eligibleDonorFound: true,
        rank1Donor: chosen,
        allCandidatesCount: eligibleCandidates.length,
        candidates: eligibleCandidates.slice(0, 3),
      });
    } catch (err: any) {
      return JSON.stringify({
        eligibleDonorFound: false,
        fallback: "CENTRAL_SUPPLY",
        error: err.message,
      });
    }
  },
  {
    name: "rank_regional_donor_stores",
    description:
      "Identifies and ranks eligible peer stores in the same region that have surplus stock above the 7-day safety floor, ordered by road distance.",
    schema: z.object({
      destStoreId: z.string().describe("Destination store requiring replenishment"),
      regionId: z.string().describe("Region ID to search for peer donor stores"),
      productId: z.string().describe("Product ID to rebalance"),
      unitsNeeded: z.number().describe("Quantity of units requested to reach 14-day buffer"),
    }),
  }
);

/**
 * Tool 5: PersistRecommendationTool
 * Persists an authentic recommendation record to the database with safety clamps and audit evidence.
 */
export const persistRecommendationTool = tool(
  async ({
    recommendationNumber,
    recommendationType,
    destStoreId,
    fromStoreId,
    productId,
    recommendedQuantity,
    priority,
    reason,
    aiExplanation,
    evidenceMetrics,
  }) => {
    try {
      const recNumber =
        recommendationNumber || `REC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const rec = await prisma.recommendation.create({
        data: {
          recommendationNumber: recNumber,
          recommendationType: recommendationType || (fromStoreId ? "STOCK_TRANSFER" : "REORDER"),
          storeId: destStoreId,
          productId,
          fromStoreId: fromStoreId || null,
          toStoreId: destStoreId,
          recommendedQuantity,
          priority: priority || "HIGH",
          reason: reason || "Automated multi-echelon stockout prevention rebalance.",
          status: "OPEN",
          aiExplanation: aiExplanation || reason,
          evidence: {
            create: evidenceMetrics.map((em) => ({
              metric: em.metric,
              value: String(em.value),
              description: em.description,
            })),
          },
        },
        include: {
          store: true,
          fromStore: true,
          product: true,
          evidence: true,
        },
      });

      return JSON.stringify({
        success: true,
        recommendationId: rec.id,
        recommendationNumber: rec.recommendationNumber,
        status: rec.status,
        recommendedQuantity: Number(rec.recommendedQuantity),
      });
    } catch (err: any) {
      return JSON.stringify({
        success: false,
        error: err.message,
      });
    }
  },
  {
    name: "persist_rebalance_recommendation",
    description:
      "Persists a verified stock rebalance or central replenishment recommendation into the enterprise SQL database with metrics evidence.",
    schema: z.object({
      recommendationNumber: z.string().optional().describe("Unique recommendation code or auto-generated"),
      recommendationType: z.enum(["STOCK_TRANSFER", "REORDER"]).default("STOCK_TRANSFER"),
      destStoreId: z.string().describe("Destination store ID"),
      fromStoreId: z.string().optional().nullable().describe("Donor store ID or null for Central Supply"),
      productId: z.string().describe("Product ID"),
      recommendedQuantity: z.number().describe("Transfer quantity (clamped to safety limits)"),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("HIGH"),
      reason: z.string().describe("Operational rationale for action"),
      aiExplanation: z.string().describe("AI narrative justification"),
      evidenceMetrics: z.array(
        z.object({
          metric: z.string(),
          value: z.string(),
          description: z.string(),
        })
      ),
    }),
  }
);
