import { prisma } from "../db";

async function clearAllRecommendations() {
  console.log("Starting full recommendation purge...");

  // 1. Delete ActionHistory referencing actions
  await prisma.actionHistory.deleteMany();
  console.log("- Deleted all action histories.");

  // 2. Delete Actions
  await prisma.action.deleteMany();
  console.log("- Deleted all actions.");

  // 3. Delete Recommendation Evidence
  await prisma.recommendationEvidence.deleteMany();
  console.log("- Deleted all recommendation evidence.");

  // 4. Delete Recommendations
  const result = await prisma.recommendation.deleteMany();
  console.log(`- Successfully deleted ${result.count} recommendations.`);

  // 5. Restore inventory in Bhopal (BPL-001) to healthy levels (45.000)
  // so the auto-scheduler does not immediately recreate recommendations on the next tick
  const bhopal = await prisma.store.findFirst({ where: { storeCode: "BPL-001" } });
  if (bhopal) {
    const invRestored = await prisma.inventory.updateMany({
      where: { storeId: bhopal.id },
      data: {
        availableQuantity: 45.000,
        reorderLevel: 15.000,
        lastUpdatedOn: new Date(),
      },
    });
    console.log(`- Restored ${invRestored.count} inventory items at Bhopal to healthy baseline (45 units).`);
  }

  // 6. Record in Audit Log
  await prisma.auditLog.create({
    data: {
      correlationId: `purge-${Date.now()}`,
      userId: null,
      action: "PURGE_ALL_RECOMMENDATIONS",
      entityName: "Recommendation",
      entityId: "ALL",
      oldValues: JSON.stringify({ count: result.count }),
      newValues: JSON.stringify({ count: 0, status: "PURGED" }),
      ipAddress: "127.0.0.1",
      timestamp: new Date(),
    },
  });
  console.log("- Recorded purge action in AuditLog.");

  // 7. Verify counts
  const remaining = await prisma.recommendation.count();
  console.log(`Final check: ${remaining} recommendations remain in database.`);
}

clearAllRecommendations()
  .then(() => {
    console.log("Recommendation cleanup finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  });

