import { prisma } from "./db";
import { logger } from "./utils/logger";

export async function purgeExcessRecommendations(): Promise<void> {
  logger.info("Purging excess test recommendations to keep exactly 10 clean records...");

  const allRecs = await prisma.recommendation.findMany({
    select: {
      id: true,
      recommendationNumber: true,
      storeId: true,
      productId: true,
      status: true,
      priority: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  logger.info(`Total recommendations currently in DB: ${allRecs.length}`);

  const keptIds = new Set<string>();
  const seenStoreProd = new Set<string>();

  // Always keep Golden Path REC-1001 if present
  const gpRec = allRecs.find((r) => r.recommendationNumber === "REC-1001");
  if (gpRec) {
    keptIds.add(gpRec.id);
    seenStoreProd.add(`${gpRec.storeId}::${gpRec.productId}`);
  }

  // Fill up to 10 distinct store-product recommendations
  for (const r of allRecs) {
    if (keptIds.size >= 10) break;
    const key = `${r.storeId}::${r.productId}`;
    if (!seenStoreProd.has(key)) {
      seenStoreProd.add(key);
      keptIds.add(r.id);
    }
  }

  // If still fewer than 10, fill from recent
  for (const r of allRecs) {
    if (keptIds.size >= 10) break;
    keptIds.add(r.id);
  }

  const deleteIds = allRecs.filter((r) => !keptIds.has(r.id)).map((r) => r.id);
  logger.info(`Keeping ${keptIds.size} recommendations. Deleting ${deleteIds.length} excess recommendations...`);

  if (deleteIds.length === 0) {
    logger.info("Already at or below 10 recommendations.");
    return;
  }

  // Batch delete in chunks of 500 to respect SQL Server parameter limits
  for (let i = 0; i < deleteIds.length; i += 500) {
    const chunk = deleteIds.slice(i, i + 500);

    // 1. Delete ActionHistory
    const actions = await prisma.action.findMany({
      where: { recommendationId: { in: chunk } },
      select: { id: true },
    });
    const actionIds = actions.map((a) => a.id);
    if (actionIds.length > 0) {
      await prisma.actionHistory.deleteMany({
        where: { actionId: { in: actionIds } },
      });
      await prisma.action.deleteMany({
        where: { id: { in: actionIds } },
      });
    }

    // 2. Delete Evidence
    await prisma.recommendationEvidence.deleteMany({
      where: { recommendationId: { in: chunk } },
    });

    // 3. Delete Recommendations
    await prisma.recommendation.deleteMany({
      where: { id: { in: chunk } },
    });
  }

  const finalCount = await prisma.recommendation.count();
  logger.info(`Purge complete. Exactly ${finalCount} recommendations remain in database.`);
}

if (process.argv[1]?.includes("purge-recommendations")) {
  purgeExcessRecommendations()
    .then(() => {
      logger.info("Purge script completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Purge script failed:", err);
      process.exit(1);
    });
}

