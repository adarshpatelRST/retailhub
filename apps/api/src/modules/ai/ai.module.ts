import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { LLM_PROVIDER } from './interfaces/llm-provider.interface';
import { LangChainProvider } from './providers/langchain.provider';
import { TemplateFallbackProvider } from './providers/template-fallback.provider';

@Module({
  providers: [
    TemplateFallbackProvider,
    LangChainProvider,
    {
      provide: LLM_PROVIDER,
      useFactory: (langChain: LangChainProvider, fallback: TemplateFallbackProvider) => {
        const mode = (process.env.LLM_PROVIDER || 'GEMINI').toUpperCase();
        return mode === 'TEMPLATE' ? fallback : langChain;
      },
      inject: [LangChainProvider, TemplateFallbackProvider],
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
