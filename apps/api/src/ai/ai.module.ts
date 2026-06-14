import { Module, Logger } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from './ai-provider';
import { AnthropicProvider } from './anthropic.provider';
import { NullAiProvider } from './null.provider';
import { PredictionService } from './prediction.service';

/**
 * Wires the AI provider. Uses Anthropic Claude when ANTHROPIC_API_KEY is set,
 * otherwise the no-op provider so the API runs without AI credentials.
 */
@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (): AiProvider => {
        const key = process.env.ANTHROPIC_API_KEY;
        if (key) {
          Logger.log('AI Failure Prediction: Anthropic provider active.', 'AiModule');
          return new AnthropicProvider(key);
        }
        Logger.log(
          'AI Failure Prediction: no ANTHROPIC_API_KEY — heuristics only.',
          'AiModule',
        );
        return new NullAiProvider();
      },
    },
    PredictionService,
  ],
  exports: [PredictionService],
})
export class AiModule {}
