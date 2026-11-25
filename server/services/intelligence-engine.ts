import { prisma } from "../db";
import { rebalanceAgent, type SupportedLlmModel as AgentSupportedModel } from "../agent/rebalance-agent";

export type SupportedLlmModel =
  | "gemini-2.5-flash"
  | "gemini-3.5-flash"
  | "gemini-3.1-pro-preview"
  | "gemini-flash-latest"
  | "gemini-1.5-flash"
  | "gemini-1.5-pro"
  | "gemini-2.0-flash-exp"
  | "deterministic-rule-engine";

export interface LlmModelMetadata {
  id: SupportedLlmModel;
  name: string;
  provider: "Google Gemini" | "Deterministic Rule Engine";
  description: string;
  recommendedFor: string;
  isAvailable: boolean;
}

export const AVAILABLE_LLM_MODELS: LlmModelMetadata[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash (Production Default)",
    provider: "Google Gemini",
    description: "High-speed, low-latency multimodal reasoning optimized for high-volume inventory rebalancing.",
    recommendedFor: "General network-wide rebalancing & standard DOI explanations",
    isAvailable: true,
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash (High Capacity)",
    provider: "Google Gemini",
    description: "Next-generation Gemini architecture with accelerated inference and enhanced mathematical precision.",
    recommendedFor: "High-throughput network evaluation & real-time simulations",
    isAvailable: true,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro (Deep Multi-Echelon)",
    provider: "Google Gemini",
    description: "Advanced reasoning model with deep contextual window for complex cross-regional supply chain constraints.",
    recommendedFor: "Multi-regional supply chain disruptions & critical stockouts",
    isAvailable: true,
  },
  {
    id: "deterministic-rule-engine",
    name: "Deterministic Rule Engine (Offline Fallback)",
    provider: "Deterministic Rule Engine",
    description: "Zero-latency, strictly deterministic rule-based generator that runs entirely offline without external API dependencies.",
    recommendedFor: "Air-gapped deployments or when external LLM API quotas are exhausted",
    isAvailable: true,
  },
];

export class IntelligenceEngineService {
  getActiveModel(): SupportedLlmModel {
    return rebalanceAgent.getActiveModel();
  }

  setActiveModel(model: SupportedLlmModel): void {
    if (AVAILABLE_LLM_MODELS.some((m) => m.id === model)) {
      rebalanceAgent.setActiveModel(model as AgentSupportedModel);
    }
  }

  getModelMetadata(modelId?: SupportedLlmModel): LlmModelMetadata {
    const id = modelId || rebalanceAgent.getActiveModel();
    return AVAILABLE_LLM_MODELS.find((m) => m.id === id) || AVAILABLE_LLM_MODELS[0];
  }

  /**
   * Generates a grounded AI narrative using LangChain ChatGoogleGenerativeAI
   */
  async generateAiNarrative(params: {
    productName: string;
    sku: string;
    units: number;
    destStoreName: string;
    destStoreCode: string;
    destDOI: number;
    destADS: number;
    donorStoreName: string | null;
    donorStoreCode: string | null;
    donorPostDOI: number | null;
    donorADS: number | null;
    distanceKm: number;
  }): Promise<string> {
    return rebalanceAgent.generateNarrative(params);
  }

  /**
   * Evaluates store inventories using the LangChain Rebalance Agent with the Funnel Architecture
   */
  async evaluateNetworkAndGenerateRecommendations(params?: {
    regionId?: string;
    storeId?: string;
  }): Promise<{
    evaluatedCount: number;
    generatedCount: number;
    recommendations: any[];
  }> {
    const res = await rebalanceAgent.runScan(params);
    return {
      evaluatedCount: res.evaluatedPairs,
      generatedCount: res.createdRecommendations,
      recommendations: res.recommendations,
    };
  }
}

export const intelligenceEngine = new IntelligenceEngineService();
