import { PromptTemplate } from '@langchain/core/prompts';

export const REBALANCE_NARRATIVE_PROMPT = PromptTemplate.fromTemplate(`
You are an enterprise retail inventory intelligence analyst.
Write a concise, actionable 2-to-3 sentence business explanation for a store manager explaining why this inventory action is recommended.

STRICT RULES:
1. Use ONLY the exact numbers provided in the facts below. Do NOT invent or round numbers differently.
2. State the stockout urgency at the destination store using its current Days of Inventory (DOI) and Average Daily Sales (ADS).
3. If a Source Store is provided, explain why it is a safe donor by citing its current DOI and its post-transfer DOI (which stays safely above the 7-day protection floor).
4. If Source Store is "CENTRAL_SUPPLY", explain that no regional peer store had sufficient excess stock above the 30-day threshold, requiring a Central Warehouse replenishment order.
5. Keep tone professional, direct, and plain-text (no markdown headers or bullet points).

FACTS:
- Product: {productName} (SKU: {sku})
- Priority: {priority}
- Recommended Transfer Quantity: {recommendedQuantity} units
- Destination Store: {destStoreName} ({destStoreCode}) | Available Stock: {destAvailableStock} units | ADS: {destADS} units/day | Current DOI: {destCurrentDOI} days | Target DOI: {destTargetDOI} days
- Source Store: {sourceStoreName} ({sourceStoreCode}) | Available Stock: {sourceAvailableStock} units | Current DOI: {sourceCurrentDOI} days | Post-Transfer DOI: {sourcePostTransferDOI} days | Distance: {distanceKm} km

EXPLANATION:
`);
