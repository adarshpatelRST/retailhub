import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { ILlmProvider, LLM_PROVIDER } from './interfaces/llm-provider.interface';
import { TemplateFallbackProvider } from './providers/template-fallback.provider';
import { RebalanceFactsDto } from './dto/rebalance-facts.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: ILlmProvider,
    private readonly fallbackProvider: TemplateFallbackProvider,
  ) {}

  /**
   * Returns cached AI explanation from DB if available (`forceRefresh = false`),
   * otherwise builds structured facts, calls LangChain with a 4s timeout,
   * falls back to TemplateFallbackProvider on error, and caches result in DB.
   */
  async getOrGenerateExplanation(
    recommendationId: string,
    forceRefresh = false,
  ): Promise<{ recommendationId: string; explanation: string; providerUsed: string; cached: boolean }> {
    const rec = await this.prisma.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        product: true,
        fromStore: true,
        toStore: true,
        evidences: true,
      },
    });

    if (!rec) {
      throw new NotFoundException(`Recommendation ${recommendationId} not found`);
    }

    if (rec.aiExplanation && !forceRefresh) {
      return {
        recommendationId: rec.id,
        explanation: rec.aiExplanation,
        providerUsed: 'DB_CACHE',
        cached: true,
      };
    }

    // Extract metrics from Evidence snapshot if present
    const snapshotEvidence = rec.evidences.find((e) => e.factorType === 'STOCK_VELOCITY_SNAPSHOT');
    const candidateEvidence = rec.evidences.find((e) => e.factorType === 'REGIONAL_CANDIDATE_RANKING');
    const rawSnapshot = (snapshotEvidence?.rawMetrics as Record<string, any>) || {};
    const rawCandidates = (candidateEvidence?.rawMetrics as Record<string, any>) || {};
    const primaryCandidate = Array.isArray(rawCandidates.candidates) ? rawCandidates.candidates[0] : null;

    const facts: RebalanceFactsDto = {
      recommendationId: rec.id,
      recommendationType: rec.recommendationType,
      priority: rec.priority,
      productName: rec.product.name,
      sku: rec.product.sku,
      recommendedQuantity: Number(rec.recommendedQuantity),
      destStoreName: rec.toStore.name,
      destStoreCode: rec.toStore.storeCode,
      destAvailableStock: Number(rawSnapshot.destAvailableStock ?? 0),
      destADS: Number(rawSnapshot.destADS ?? 1.0),
      destCurrentDOI: Number(rawSnapshot.destCurrentDOI ?? 0),
      destTargetDOI: Number(rawSnapshot.targetDOI ?? 14),
      sourceStoreName: rec.fromStore?.name ?? null,
      sourceStoreCode: rec.fromStore?.storeCode ?? null,
      sourceAvailableStock: Number(primaryCandidate?.availableStock ?? rawSnapshot.sourceAvailableStock ?? 0),
      sourceADS: Number(primaryCandidate?.ads ?? 0),
      sourceCurrentDOI: Number(primaryCandidate?.currentDOI ?? 35),
      sourcePostTransferDOI: Number(primaryCandidate?.postTransferDOI ?? 18),
      distanceKm: primaryCandidate?.distanceKm != null ? Number(primaryCandidate.distanceKm) : null,
    };

    let explanation: string;
    let providerUsed = (process.env.LLM_PROVIDER || 'GEMINI').toUpperCase();

    try {
      explanation = await Promise.race([
        this.llmProvider.generateNarrative(facts),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('LLM request timed out after 4000ms')), 4000),
        ),
      ]);
    } catch (error) {
      this.logger.warn(
        `Primary LLM failed for Recommendation ${rec.id} (${(error as Error).message}). Using TemplateFallbackProvider.`,
      );
      explanation = await this.fallbackProvider.generateNarrative(facts);
      providerUsed = 'TEMPLATE_FALLBACK';
    }

    await this.prisma.recommendation.update({
      where: { id: rec.id },
      data: { aiExplanation: explanation },
    });

    return {
      recommendationId: rec.id,
      explanation,
      providerUsed,
      cached: false,
    };
  }
}
