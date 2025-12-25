/**
 * Base Provider Class
 * Provides common functionality for all LLM provider adapters
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMConfig,
  LLMProviderInterface,
  Model,
  CostBreakdown
} from '../../../shared/llm/types';

export abstract class BaseProvider implements LLMProviderInterface {
  protected config: LLMConfig;
  protected provider: LLMProvider;

  constructor(config: LLMConfig) {
    this.config = config;
    this.provider = config.provider;
  }

  abstract generate(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse>;
  abstract getModels(): Promise<Model[]>;
  abstract estimateCost(request: LLMRequest, model?: string): number;
  abstract isAvailable(): Promise<boolean>;

  getProvider(): LLMProvider {
    return this.provider;
  }

  /**
   * Generate streaming response (optional, override if supported)
   */
  async *generateStreaming(
    request: LLMRequest,
    config?: Partial<LLMConfig>
  ): AsyncGenerator<any> {
    throw new Error(`Streaming not supported for provider: ${this.provider}`);
  }

  /**
   * Calculate token count (approximate, override for accurate counting)
   */
  protected estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost breakdown
   */
  protected calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: Model
  ): CostBreakdown {
    const inputCost = (inputTokens / 1000) * model.inputCostPerToken;
    const outputCost = (outputTokens / 1000) * model.outputCostPerToken;

    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      model: model.id,
      provider: this.provider
    };
  }

  /**
   * Merge request config with provider config
   */
  protected mergeConfig(override?: Partial<LLMConfig>): LLMConfig {
    return {
      ...this.config,
      ...override
    };
  }

  /**
   * Validate request
   */
  protected validateRequest(request: LLMRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (request.maxTokens && request.maxTokens < 1) {
      throw new Error('maxTokens must be greater than 0');
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('temperature must be between 0 and 2');
    }
  }

  /**
   * Create error response
   */
  protected createErrorResponse(error: Error, model: string): LLMResponse {
    return {
      text: `Error: ${error.message}`,
      model,
      provider: this.provider,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      latency: 0,
      cached: false,
      finishReason: 'error',
      metadata: {
        error: error.message,
        errorType: error.constructor.name
      }
    };
  }
}

