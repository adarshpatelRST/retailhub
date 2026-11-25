import { Injectable, Logger } from '@nestjs/common';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { ILlmProvider } from '../interfaces/llm-provider.interface';
import { RebalanceFactsDto } from '../dto/rebalance-facts.dto';
import { REBALANCE_NARRATIVE_PROMPT } from '../prompts/rebalance-narrative.prompt';

@Injectable()
export class LangChainProvider implements ILlmProvider {
  private readonly logger = new Logger(LangChainProvider.name);
  private readonly model: BaseChatModel | null;

  constructor() {
    this.model = this.initializeModel();
  }

  private initializeModel(): BaseChatModel | null {
    const provider = (process.env.LLM_PROVIDER || 'GEMINI').toUpperCase();

    if (provider === 'GEMINI' && process.env.GEMINI_API_KEY) {
      this.logger.log('Initialized LangChain with Google Gemini (gemini-1.5-flash)');
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-1.5-flash',
        temperature: 0.2,
        maxOutputTokens: 250,
      });
    }

    if (provider === 'OPENAI' && process.env.OPENAI_API_KEY) {
      this.logger.log('Initialized LangChain with OpenAI (gpt-4o-mini)');
      return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: 0.2,
        maxTokens: 250,
      });
    }

    this.logger.warn(
      `LLM_PROVIDER="${provider}" configured without valid API key. AI Service will use deterministic TemplateFallbackProvider.`,
    );
    return null;
  }

  async generateNarrative(facts: RebalanceFactsDto): Promise<string> {
    if (!this.model) {
      throw new Error('LLM Model is not initialized (missing API key or TEMPLATE mode active)');
    }

    const chain = REBALANCE_NARRATIVE_PROMPT.pipe(this.model).pipe(new StringOutputParser());

    const result = await chain.invoke({
      productName: facts.productName,
      sku: facts.sku,
      priority: facts.priority,
      recommendedQuantity: facts.recommendedQuantity,
      destStoreName: facts.destStoreName,
      destStoreCode: facts.destStoreCode,
      destAvailableStock: facts.destAvailableStock,
      destADS: facts.destADS,
      destCurrentDOI: facts.destCurrentDOI,
      destTargetDOI: facts.destTargetDOI,
      sourceStoreName: facts.sourceStoreName ?? 'CENTRAL_SUPPLY',
      sourceStoreCode: facts.sourceStoreCode ?? 'CENTRAL_WAREHOUSE',
      sourceAvailableStock: facts.sourceAvailableStock ?? 'N/A',
      sourceCurrentDOI: facts.sourceCurrentDOI ?? 'N/A',
      sourcePostTransferDOI: facts.sourcePostTransferDOI ?? 'N/A',
      distanceKm: facts.distanceKm ?? 'N/A',
    });

    return result.trim();
  }
}
