import { Injectable } from '@nestjs/common';
import { ILlmProvider } from '../interfaces/llm-provider.interface';
import { RebalanceFactsDto } from '../dto/rebalance-facts.dto';

@Injectable()
export class TemplateFallbackProvider implements ILlmProvider {
  async generateNarrative(facts: RebalanceFactsDto): Promise<string> {
    const destSummary = `${facts.destStoreName} (${facts.destStoreCode}) currently holds ${facts.destAvailableStock} units of ${facts.productName} (${facts.sku}) with an average daily sales velocity of ${facts.destADS} units/day, resulting in a critical ${facts.destCurrentDOI}-day inventory cover against a ${facts.destTargetDOI}-day target.`;

    if (facts.sourceStoreName && facts.sourceStoreCode) {
      const sourceSummary = `Transferring ${facts.recommendedQuantity} units from regional peer ${facts.sourceStoreName} (${facts.sourceStoreCode}${facts.distanceKm != null ? `, ${facts.distanceKm} km away` : ''}) resolves the deficit while reducing the donor store's cover from ${facts.sourceCurrentDOI} days to ${facts.sourcePostTransferDOI} days, safely above the 7-day protection threshold.`;
      return `${destSummary} ${sourceSummary}`;
    }

    const centralFallbackSummary = `Because no regional peer store within the region holds excess inventory above the 30-day overstock threshold, a Central Warehouse replenishment order of ${facts.recommendedQuantity} units is recommended to restore ${facts.destStoreName} to its ${facts.destTargetDOI}-day target cover.`;
    return `${destSummary} ${centralFallbackSummary}`;
  }
}
