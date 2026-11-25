import "dotenv/config";
import { realisticSimulationService } from "../services/realistic-simulation-service";
import { logger } from "../utils/logger";
import { prisma } from "../db";

async function main() {
  logger.info("Initializing Realistic 5-Cycle Store Simulation CLI Runner...");

  try {
    const report = await realisticSimulationService.runFull5CycleSimulation();

    console.log("\n================================================================================");
    console.log("                 REALISTIC 5-CYCLE STORE SIMULATION REPORT                      ");
    console.log("================================================================================\n");

    console.log(`Executed At: ${report.timestamp}`);
    console.log(`Total Cycles: ${report.totalCyclesExecuted}`);
    console.log("\n1. BASELINE DATA RESTORATION:");
    console.log(`   - Stores Active: ${report.baselineDataReplaced.storesCount}`);
    console.log(`   - Products Active: ${report.baselineDataReplaced.productsCount}`);
    console.log(`   - Inventory Rows Restored to Healthy Stock: ${report.baselineDataReplaced.inventoryCount}`);
    console.log(`   - 30-Day Historical POS Sales Lines Seeded: ${report.baselineDataReplaced.historicalSalesLinesCount}`);

    console.log("\n2. CYCLE-BY-CYCLE SUMMARY:");
    for (const c of report.cycles) {
      console.log(`\n   --- Cycle ${c.cycle}: ${c.name} [${c.region}] ---`);
      console.log(`   * Sales Depletion: ${c.salesGenerated.transactionsCount} items sold (${c.salesGenerated.totalQuantitySold} units)`);
      console.log(`   * Rebalance Scan: Evaluated ${c.scanResult.evaluatedPairs} pairs in ${c.scanResult.durationMs}ms`);
      console.log(`   * Recommendations Generated: ${c.scanResult.recommendationsGenerated} (${c.scanResult.highPriorityCount} HIGH Priority)`);
      console.log(`   * Approvals & Fulfillments: ${c.approvalsExecuted.approvedCount} approved (${c.approvalsExecuted.unitsTransferred} units transferred via ${c.approvalsExecuted.transfersCreated} stock transfers)`);
      console.log(`   * Replenished Destination Stores: ${c.approvalsExecuted.replenishedDestinationCount}`);
      console.log(`   * Open Recommendations Remaining: ${c.openRemainingCount}`);
    }

    console.log("\n3. FINAL SYSTEM STATE:");
    console.log(`   - Total Active Inventory Records: ${report.finalState.totalInventoryRows}`);
    console.log(`   - Total Sales Transactions: ${report.finalState.totalSalesTransactions} (${report.finalState.totalSalesLines} lines)`);
    console.log(`   - Total Stock Transfers (Received/Fulfilled): ${report.finalState.totalStockTransfers}`);
    console.log(`   - Total Recommendations in Database: ${report.finalState.totalRecommendations}`);
    console.log(`   - Recommendations Currently OPEN: ${report.finalState.openRecommendations}`);
    console.log(`   - Recommendations APPROVED / FULFILLED: ${report.finalState.approvedRecommendations}`);

    console.log("\n================================================================================\n");
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    logger.error("Simulation run failed with error:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
