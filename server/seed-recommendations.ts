import { prisma } from './db';
import { logger } from './utils/logger';

export async function seedRecommendations() {
  logger.info("Starting seeding of 10 additional Action Center recommendations...");

  // Safe store & product resolver helpers
  const allStores = await prisma.store.findMany();
  const allProducts = await prisma.product.findMany();
  const fallbackStore = allStores[0];
  const fallbackProduct = allProducts[0];

  const getStore = (code: string) => allStores.find((s) => s.storeCode === code) || fallbackStore;
  const getProduct = (sku: string) => allProducts.find((p) => p.sku === sku) || fallbackProduct;

  const storeInd001 = getStore("IND-001");
  const storeBpl001 = getStore("BPL-001");
  const storeBpl011 = getStore("BPL-011");
  const storeMum005 = getStore("MUM-005");
  const storeMum045 = getStore("MUM-045");
  const storeBlr032 = getStore("BLR-032");
  const storeBlr024 = getStore("BLR-024");
  const storeBlr048 = getStore("BLR-048");
  const storeDel047 = getStore("DEL-047");
  const storeDel039 = getStore("DEL-039");
  const storeDel007 = getStore("DEL-007");
  const storeDel015 = getStore("DEL-015");
  const storePun014 = getStore("PUN-014");
  const storePun006 = getStore("PUN-006");
  const storeLko026 = getStore("LKO-026");
  const storeLko018 = getStore("LKO-018");
  const storeHyd041 = getStore("HYD-041");
  const storeHyd033 = getStore("HYD-033");

  const pTea = getProduct("SKU-1375");
  const pOil = getProduct("SKU-1491");
  const pDairy = getProduct("SKU-1263");
  const pRice = getProduct("SKU-1372");
  const pParle = getProduct("SKU-1314");
  const pDaawat = getProduct("SKU-1462");
  const pDet = getProduct("SKU-1107");
  const pMarico = getProduct("SKU-1490");
  const pBikaji = getProduct("SKU-1239");
  const pNirma = getProduct("SKU-1420");

  const recDefs = [
    {
      recommendationNumber: "REC-1002",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "HIGH",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeBpl001?.id || fallbackStore.id,
      fromStoreId: storeInd001?.id || null,
      productId: pTea?.id || fallbackProduct.id,
      recommendedQuantity: 20,
      reason:
        "Critical stockout risk: Bhopal MP Nagar Store has dropped to 1.60 days DOI (4 units on hand, 2.5 units/day ADS). Indore Vijay Nagar holds 72 units (60.0d DOI excess). Inter-store transfer of 20 units restores Bhopal to 9.60d DOI while Indore retains 43.3d cushion.",
      aiExplanation:
        "Bhopal MP Nagar Store (BPL-001) will exhaust Godrej Tea inventory within 38 hours. Indore Vijay Nagar (IND-001) holds 72.000 units (60.0d DOI) at 195 km road transit. Rebalancing 20.000 units elevates Bhopal to 9.60d DOI, maintaining healthy regional availability without risking donor stockout.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "4 units", description: "Bhopal MP Nagar available shelf stock" },
        { metric: "Days of Inventory (Dest)", value: "1.60 days", description: "Critical stockout threshold (< 3.0d)" },
        { metric: "Average Daily Sales (Dest)", value: "2.50 units/day", description: "30-day rolling velocity" },
        { metric: "Current Stock (Source)", value: "72 units", description: "Indore Vijay Nagar available shelf stock" },
        { metric: "Days of Inventory (Source)", value: "60.0 days", description: "Donor holding excess (> 45.0d)" },
        { metric: "Distance & Transit", value: "195 km / 4.5 hrs", description: "NH-86 regional logistics corridor" },
        { metric: "Post-Transfer Dest DOI", value: "9.60 days", description: "Bhopal stock buffer restored" },
        { metric: "Post-Transfer Source DOI", value: "43.3 days", description: "Indore safely protected above floor" },
      ],
    },
    {
      recommendationNumber: "REC-1003",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "HIGH",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeMum005?.id || fallbackStore.id,
      fromStoreId: storeMum045?.id || null,
      productId: pOil?.id || fallbackProduct.id,
      recommendedQuantity: 30,
      reason:
        "High-velocity stockout alert: Mumbai Sector-6 Express Hub has 1.07 days DOI (3 units on hand, 2.8 units/day ADS) for Patanjali Edible Oil. Mumbai Sector-1 Hypermarket holds 120 units (54.5d DOI). Inter-store transfer of 30 units protects ₹9,480 in weekly gross revenue.",
      aiExplanation:
        "Mumbai Sector-6 Express Hub (MUM-005) is projected to stock out of Patanjali Edible Oil in 25 hours. Mumbai Sector-1 Hypermarket (MUM-045), located 18 km away via Western Express Highway, holds 120.000 units (54.5d DOI). Rebalancing 30.000 units elevates Sector-6 to 11.79d DOI while Sector-1 retains 40.9d DOI.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "3 units", description: "Mumbai Sector-6 Express Hub stock" },
        { metric: "Days of Inventory (Dest)", value: "1.07 days", description: "Critical threshold alert" },
        { metric: "Average Daily Sales (Dest)", value: "2.80 units/day", description: "Fast-moving edible oil basket" },
        { metric: "Current Stock (Source)", value: "120 units", description: "Mumbai Sector-1 Hypermarket stock" },
        { metric: "Days of Inventory (Source)", value: "54.5 days", description: "Surplus inventory tier" },
        { metric: "Distance & Transit", value: "18 km / 0.8 hrs", description: "Intra-city metro corridor" },
        { metric: "Post-Transfer Dest DOI", value: "11.79 days", description: "Restored to target healthy buffer" },
        { metric: "Post-Transfer Source DOI", value: "40.9 days", description: "Donor maintains generous safety cover" },
      ],
    },
    {
      recommendationNumber: "REC-1004",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "HIGH",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeBlr032?.id || fallbackStore.id,
      fromStoreId: storeBlr024?.id || null,
      productId: pDairy?.id || fallbackProduct.id,
      recommendedQuantity: 35,
      reason:
        "Rapid depletion alert: Bengaluru Sector-3 Express Hub holds 1.71 days DOI (6 units on hand, 3.5 units/day ADS) of Amul UHT Dairy Pack. Sector-10 Hypermarket holds 110 units (55.0d DOI). Transfer of 35 units normalizes stock to 11.71d DOI.",
      aiExplanation:
        "Bengaluru Sector-3 Express Hub (BLR-032) faces imminent weekend stockout for high-turnover UHT dairy. Transferring 35 units from Bengaluru Sector-10 Hypermarket (BLR-024, 14 km transit) raises Sector-3 to 11.71d DOI and leaves Sector-10 well-buffered at 37.5d DOI.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "6 units", description: "Bengaluru Sector-3 current stock" },
        { metric: "Days of Inventory (Dest)", value: "1.71 days", description: "Stockout risk window: 41 hours" },
        { metric: "Average Daily Sales (Dest)", value: "3.50 units/day", description: "High turnover staple" },
        { metric: "Current Stock (Source)", value: "110 units", description: "Sector-10 Hypermarket available stock" },
        { metric: "Days of Inventory (Source)", value: "55.0 days", description: "Excess stock above ceiling" },
        { metric: "Distance & Transit", value: "14 km / 0.7 hrs", description: "Outer Ring Road corridor" },
        { metric: "Post-Transfer Dest DOI", value: "11.71 days", description: "Balanced stock level" },
        { metric: "Post-Transfer Source DOI", value: "37.5 days", description: "Healthy donor safety cushion" },
      ],
    },
    {
      recommendationNumber: "REC-1005",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "HIGH",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeDel047?.id || fallbackStore.id,
      fromStoreId: storeDel039?.id || null,
      productId: pRice?.id || fallbackProduct.id,
      recommendedQuantity: 15,
      reason:
        "Critical grocery alert: Gurugram Sector-3 Express Hub holds 1.25 days DOI (2 units on hand, 1.6 units/day ADS) of Mother Rice. Gurugram Sector-10 Hypermarket holds 65 units (59.1d DOI). Inter-store transfer of 15 units prevents empty shelves.",
      aiExplanation:
        "Gurugram Sector-3 Express Hub (DEL-047) has 1.25d DOI for Mother Rice. Rebalancing 15 units from Gurugram Sector-10 Hypermarket (DEL-039, 12 km transit) restores Sector-3 to 10.63d DOI while maintaining 45.5d DOI in Sector-10.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "2 units", description: "Gurugram Sector-3 current stock" },
        { metric: "Days of Inventory (Dest)", value: "1.25 days", description: "Severe risk (< 3.0d)" },
        { metric: "Average Daily Sales (Dest)", value: "1.60 units/day", description: "Steady staple demand" },
        { metric: "Current Stock (Source)", value: "65 units", description: "Sector-10 Hypermarket stock" },
        { metric: "Days of Inventory (Source)", value: "59.1 days", description: "Excess inventory tier" },
        { metric: "Distance & Transit", value: "12 km / 0.5 hrs", description: "NH-48 express corridor" },
        { metric: "Post-Transfer Dest DOI", value: "10.63 days", description: "Healthy replenishment cushion" },
        { metric: "Post-Transfer Source DOI", value: "45.5 days", description: "Safe donor stock level" },
      ],
    },
    {
      recommendationNumber: "REC-1006",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "MEDIUM",
      status: "OPEN",
      isManualRequest: false,
      storeId: storePun014?.id || fallbackStore.id,
      fromStoreId: storePun006?.id || null,
      productId: pParle?.id || fallbackProduct.id,
      recommendedQuantity: 25,
      reason:
        "Proactive replenishment: Pune Sector-15 Express Hub holds 4.76 days DOI (10 units on hand, 2.1 units/day ADS). Pune Sector-7 Hypermarket holds 85 units (47.2d DOI). Inter-store transfer of 25 units elevates stock to 16.67d DOI ahead of weekend traffic.",
      aiExplanation:
        "Pune Sector-15 Express Hub (PUN-014) is approaching reorder threshold at 4.76d DOI. Transferring 25 units from Pune Sector-7 Hypermarket (PUN-006, 22 km transit) levels stock to 16.67d DOI while retaining 33.3d DOI in Sector-7.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "10 units", description: "Pune Sector-15 current stock" },
        { metric: "Days of Inventory (Dest)", value: "4.76 days", description: "Reorder queue threshold" },
        { metric: "Average Daily Sales (Dest)", value: "2.10 units/day", description: "Weekly rolling velocity" },
        { metric: "Current Stock (Source)", value: "85 units", description: "Pune Sector-7 Hypermarket stock" },
        { metric: "Days of Inventory (Source)", value: "47.2 days", description: "Overstocked tier" },
        { metric: "Distance & Transit", value: "22 km / 1.0 hrs", description: "Pune bypass road corridor" },
        { metric: "Post-Transfer Dest DOI", value: "16.67 days", description: "Optimized inventory position" },
        { metric: "Post-Transfer Source DOI", value: "33.3 days", description: "Healthy donor safety buffer" },
      ],
    },
    {
      recommendationNumber: "REC-1007",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "MEDIUM",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeLko026?.id || fallbackStore.id,
      fromStoreId: storeLko018?.id || null,
      productId: pDaawat?.id || fallbackProduct.id,
      recommendedQuantity: 20,
      reason:
        "Regional rebalance: Lucknow Sector-12 Express Hub holds 4.21 days DOI (8 units on hand, 1.9 units/day ADS) of Daawat Rice. Lucknow Sector-4 Hypermarket holds 90 units (40.9d DOI). Transfer of 20 units raises Sector-12 to 14.74d DOI.",
      aiExplanation:
        "Lucknow Sector-12 Express Hub (LKO-026) has 4.21d DOI. Intra-city dispatch of 20 units from Lucknow Sector-4 Hypermarket (LKO-018, 16 km via Shaheed Path) balances both stores within regional target.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "8 units", description: "Lucknow Sector-12 current stock" },
        { metric: "Days of Inventory (Dest)", value: "4.21 days", description: "Approaching reorder point" },
        { metric: "Average Daily Sales (Dest)", value: "1.90 units/day", description: "Packaged rice velocity" },
        { metric: "Current Stock (Source)", value: "90 units", description: "Lucknow Sector-4 Hypermarket stock" },
        { metric: "Days of Inventory (Source)", value: "40.9 days", description: "Surplus holding tier" },
        { metric: "Distance & Transit", value: "16 km / 0.6 hrs", description: "Shaheed Path urban corridor" },
        { metric: "Post-Transfer Dest DOI", value: "14.74 days", description: "Normalized buffer" },
        { metric: "Post-Transfer Source DOI", value: "31.8 days", description: "Safe post-transfer reserve" },
      ],
    },
    {
      recommendationNumber: "REC-1008",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "LOW",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeHyd041?.id || fallbackStore.id,
      fromStoreId: storeHyd033?.id || null,
      productId: pDet?.id || fallbackProduct.id,
      recommendedQuantity: 15,
      reason:
        "Routine buffer leveling: Hyderabad Sector-12 Express Hub holds 7.00 days DOI (14 units on hand, 2.0 units/day ADS). Hyderabad Sector-4 Hypermarket holds 95 units (50.0d DOI). Rebalancing 15 units optimizes store DOI to 14.50d.",
      aiExplanation:
        "Automated velocity scan detected minor buffer disparity for Britannia Detergents in Hyderabad. Transferring 15 units from Sector-4 Hypermarket to Sector-12 Express Hub brings both stores to uniform inventory turnover.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "14 units", description: "Hyderabad Sector-12 stock" },
        { metric: "Days of Inventory (Dest)", value: "7.00 days", description: "Healthy baseline" },
        { metric: "Average Daily Sales (Dest)", value: "2.00 units/day", description: "Household cleaning velocity" },
        { metric: "Current Stock (Source)", value: "95 units", description: "Hyderabad Sector-4 stock" },
        { metric: "Days of Inventory (Source)", value: "50.0 days", description: "Holding excess" },
        { metric: "Distance & Transit", value: "25 km / 1.1 hrs", description: "PVNR Expressway corridor" },
        { metric: "Post-Transfer Dest DOI", value: "14.50 days", description: "Optimized turnover" },
        { metric: "Post-Transfer Source DOI", value: "42.1 days", description: "Robust donor buffer" },
      ],
    },
    {
      recommendationNumber: "REC-1009",
      recommendationType: "CENTRAL_REPLENISHMENT",
      priority: "HIGH",
      status: "OPEN",
      isManualRequest: false,
      storeId: storeBpl011?.id || fallbackStore.id,
      fromStoreId: null,
      productId: pMarico?.id || fallbackProduct.id,
      recommendedQuantity: 40,
      reason:
        "Central Supply Fallback: Bhopal Sector-12 Express Hub has 0.56 days DOI (1 unit on hand, 1.8 units/day ADS) for Marico Festive Pack. No regional store holds > 30d excess stock. Automated fallback escalated order to Central Supply / Mother Hub for 40 units.",
      aiExplanation:
        "Bhopal Sector-12 Express Hub (BPL-011) has only 1.000 unit remaining (0.56d DOI). Exhaustive regional scan found zero peer stores in Central MP holding excess cover. Order automatically routed to Central Supply / Mother Hub for direct cross-dock replenishment.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "1 units", description: "Bhopal Sector-12 critical depletion" },
        { metric: "Days of Inventory (Dest)", value: "0.56 days", description: "Imminent stockout (< 12 hours)" },
        { metric: "Average Daily Sales (Dest)", value: "1.80 units/day", description: "Dry fruits & festive velocity" },
        { metric: "Source / Donor", value: "Central Supply (Mother Hub)", description: "No peer donor within 300 km" },
        { metric: "Routing Mechanism", value: "Automated Central Fallback", description: "Tier-1 distribution center" },
        { metric: "Post-Transfer Dest DOI", value: "22.78 days", description: "Full cycle replenishment" },
      ],
    },
    {
      recommendationNumber: "REC-1010",
      recommendationType: "MANUAL_STORE_REQUEST",
      priority: "HIGH",
      status: "OPEN",
      isManualRequest: true,
      storeId: storeBlr024?.id || fallbackStore.id,
      fromStoreId: storeBlr048?.id || null,
      productId: pBikaji?.id || fallbackProduct.id,
      recommendedQuantity: 25,
      reason:
        "Manual Store Request submitted by Store Manager Rajesh Kumar: Upcoming weekend promotional drive requires additional 25 units of Baby Nutrition pack to meet expected 3x customer footfall surge.",
      aiExplanation:
        "Store Manager manual request from Bengaluru Sector-10 Hypermarket (BLR-024) approved for routing. Candidate donor Bengaluru Sector-4 Hypermarket (BLR-048, 15 km transit) holds 75 units (50.0d DOI) and can transfer 25 units without stock risk.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "5 units", description: "Bengaluru Sector-10 current stock" },
        { metric: "Days of Inventory (Dest)", value: "1.56 days", description: "Depleted stock facing promotion" },
        { metric: "Average Daily Sales (Dest)", value: "3.20 units/day", description: "Pre-promotion velocity" },
        { metric: "Current Stock (Source)", value: "75 units", description: "Sector-4 Hypermarket donor stock" },
        { metric: "Days of Inventory (Source)", value: "50.0 days", description: "Donor excess buffer" },
        { metric: "Request Type", value: "Manual Store Manager Escalation", description: "Promotional surge demand" },
        { metric: "Post-Transfer Dest DOI", value: "9.38 days", description: "Adequate promotion buffer" },
        { metric: "Post-Transfer Source DOI", value: "33.3 days", description: "Donor remains safely buffered" },
      ],
    },
    {
      recommendationNumber: "REC-1011",
      recommendationType: "REBALANCE_TRANSFER",
      priority: "HIGH",
      status: "APPROVED",
      isManualRequest: false,
      storeId: storeDel007?.id || fallbackStore.id,
      fromStoreId: storeDel015?.id || null,
      productId: pNirma?.id || fallbackProduct.id,
      recommendedQuantity: 18,
      reason:
        "Completed inter-store rebalance TRF-20261028-0042: Successfully transferred 18 units from Gurugram Sector-1 to Gurugram Sector-8, normalizing destination inventory to 10.48d DOI.",
      aiExplanation:
        "Historical recommendation executed on 2026-10-28. Dispatch approved by Regional Manager Vikram Aditya. Transit completed via Dedicated Express Van DL-1LE-4902 in 35 minutes.",
      evidence: [
        { metric: "Current Stock (Dest)", value: "4 units", description: "Stock before transfer" },
        { metric: "Days of Inventory (Dest)", value: "1.90 days", description: "Pre-transfer DOI" },
        { metric: "Average Daily Sales (Dest)", value: "2.10 units/day", description: "Dry fruits velocity" },
        { metric: "Current Stock (Source)", value: "80 units", description: "Source stock before dispatch" },
        { metric: "Days of Inventory (Source)", value: "50.0 days", description: "Donor initial DOI" },
        { metric: "Status Note", value: "APPROVED & DISPATCHED", description: "Completed logistics execution" },
        { metric: "Post-Transfer Dest DOI", value: "10.48 days", description: "Achieved target buffer" },
        { metric: "Post-Transfer Source DOI", value: "38.8 days", description: "Maintained donor safety cushion" },
      ],
    },
  ];

  for (const def of recDefs) {
    const existing = await prisma.recommendation.findUnique({
      where: { recommendationNumber: def.recommendationNumber },
    });

    if (existing) {
      await prisma.recommendationEvidence.deleteMany({
        where: { recommendationId: existing.id },
      });
      await prisma.recommendation.update({
        where: { id: existing.id },
        data: {
          recommendationType: def.recommendationType,
          priority: def.priority,
          status: def.status,
          isManualRequest: def.isManualRequest,
          storeId: def.storeId,
          fromStoreId: def.fromStoreId,
          toStoreId: def.storeId,
          productId: def.productId,
          recommendedQuantity: def.recommendedQuantity,
          reason: def.reason,
          aiExplanation: def.aiExplanation,
          evidence: {
            create: def.evidence,
          },
        },
      });
      logger.info(`Updated existing recommendation ${def.recommendationNumber}`);
    } else {
      await prisma.recommendation.create({
        data: {
          recommendationNumber: def.recommendationNumber,
          recommendationType: def.recommendationType,
          priority: def.priority,
          status: def.status,
          isManualRequest: def.isManualRequest,
          storeId: def.storeId,
          fromStoreId: def.fromStoreId,
          toStoreId: def.storeId,
          productId: def.productId,
          recommendedQuantity: def.recommendedQuantity,
          reason: def.reason,
          aiExplanation: def.aiExplanation,
          evidence: {
            create: def.evidence,
          },
        },
      });
      logger.info(`Created new recommendation ${def.recommendationNumber}`);
    }
  }

  logger.info("Successfully seeded 10 additional Action Center recommendations!");
}

if (process.argv[1] && process.argv[1].includes("seed-recommendations")) {
  seedRecommendations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
