import { RebalanceFactsDto } from '../dto/rebalance-facts.dto';

export const LLM_PROVIDER = 'LLM_PROVIDER';

export interface ILlmProvider {
  /**
   * Generates a natural-language executive narrative from structured rebalance facts.
   */
  generateNarrative(facts: RebalanceFactsDto): Promise<string>;
}
