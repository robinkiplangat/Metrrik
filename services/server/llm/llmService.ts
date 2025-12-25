/**
 * Main LLM Service
 * High-level API for LLM operations with automatic provider selection, caching, and cost tracking
 */

import { LLMProviderManager } from './llmProviderManager';
import { llmCache } from './cache/llmCache';
import { costTracker } from './costTracker';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMTaskType,
  ProviderSelectionStrategy
} from '../../shared/llm/types';
import type { LLMProviderInterface } from '../../shared/llm/types';

export interface LLMServiceOptions {
  provider?: LLMProvider;
  taskType?: LLMTaskType;
  useCache?: boolean;
  trackCost?: boolean;
  userId?: string;
  projectId?: string;
  strategy?: Partial<ProviderSelectionStrategy>;
}

export class LLMService {
  private static instance: LLMService;
  private providerManager: LLMProviderManager;
  private cache?: any; // Will be injected from cache service
  private costTracker?: any; // Will be injected from cost tracker

  private constructor() {
    this.providerManager = LLMProviderManager.getInstance();
    // Initialize cache and cost tracker
    this.setCacheService(llmCache);
    this.setCostTracker(costTracker);
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Set cache service
   */
  public setCacheService(cacheService: any): void {
    this.cache = cacheService;
  }

  /**
   * Set cost tracker service
   */
  public setCostTracker(costTracker: any): void {
    this.costTracker = costTracker;
  }

  /**
   * Generate a response from the LLM
   */
  public async generate(
    request: LLMRequest,
    options: LLMServiceOptions = {}
  ): Promise<LLMResponse> {
    const {
      provider,
      taskType,
      useCache = true,
      trackCost = true,
      userId,
      projectId,
      strategy
    } = options;

    // Check cache first if enabled
    if (useCache && this.cache) {
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          cached: true
        };
      }
    }

    // Select provider
    let adapter: LLMProviderInterface | null;

    if (provider) {
      adapter = this.providerManager.getProvider(provider);
      if (!adapter) {
        throw new Error(`Provider ${provider} is not registered`);
      }
    } else {
      // Auto-select based on task type and strategy
      adapter = await this.selectProviderForTask(taskType, strategy);
      if (!adapter) {
        throw new Error('No available LLM provider found');
      }
    }

    // Make request
    const response = await adapter.generate(request);

    // Store in cache if enabled
    if (useCache && this.cache && !response.cached) {
      await this.cache.set(
        this.generateCacheKey(request),
        response,
        this.getCacheTTL(taskType)
      );
    }

    // Track cost if enabled
    if (trackCost && this.costTracker) {
      await this.costTracker.trackUsage({
        ...response,
        userId,
        projectId,
        taskType
      });
    }

    return response;
  }

  /**
   * Generate streaming response
   */
  public async *generateStreaming(
    request: LLMRequest,
    options: LLMServiceOptions = {}
  ): AsyncGenerator<any> {
    const {
      provider,
      taskType,
      strategy
    } = options;

    // Select provider
    let adapter: LLMProviderInterface | null;

    if (provider) {
      adapter = this.providerManager.getProvider(provider);
      if (!adapter) {
        throw new Error(`Provider ${provider} is not registered`);
      }
    } else {
      adapter = await this.selectProviderForTask(taskType, strategy);
      if (!adapter) {
        throw new Error('No available LLM provider found');
      }
    }

    // Check if streaming is supported
    if (!adapter.generateStreaming) {
      throw new Error(`Streaming not supported for provider: ${adapter.getProvider()}`);
    }

    // Generate streaming response
    yield* adapter.generateStreaming(request);
  }

  /**
   * Select provider based on task type
   */
  private async selectProviderForTask(
    taskType?: LLMTaskType,
    strategy?: Partial<ProviderSelectionStrategy>
  ): Promise<LLMProviderInterface | null> {
    // Use custom strategy if provided
    if (strategy) {
      return await this.providerManager.selectProvider(strategy);
    }

    // Task-specific provider selection
    switch (taskType) {
      case LLMTaskType.VISION:
        // Prefer providers with vision support
        return await this.providerManager.selectProvider({
          primary: LLMProvider.GEMINI,
          fallbacks: [LLMProvider.OPENAI, LLMProvider.ANTHROPIC]
        });

      case LLMTaskType.EMBEDDING:
        // Prefer OpenAI for embeddings (or local)
        return await this.providerManager.selectProvider({
          primary: LLMProvider.OPENAI,
          fallbacks: [LLMProvider.LOCAL]
        });

      case LLMTaskType.CHAT:
      case LLMTaskType.ANALYSIS:
      default:
        // Use default strategy (cost-optimized)
        return await this.providerManager.selectProvider({
          primary: LLMProvider.LOCAL, // Prefer local for cost
          fallbacks: [LLMProvider.GEMINI, LLMProvider.OPENAI]
        });
    }
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: LLMRequest): string {
    const keyParts = [
      request.prompt,
      request.model || 'default',
      request.temperature?.toString() || '0.7',
      request.maxTokens?.toString() || '1000',
      request.systemInstruction || ''
    ];

    if (request.images && request.images.length > 0) {
      // Include image hashes in cache key
      const imageHashes = request.images.map(img => 
        img.data.substring(0, 50) // Use first 50 chars as hash approximation
      );
      keyParts.push(...imageHashes);
    }

    // Simple hash function
    const key = keyParts.join('|');
    return `llm:${this.simpleHash(key)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache TTL based on task type
   */
  private getCacheTTL(taskType?: LLMTaskType): number {
    // Default TTL: 1 hour
    const defaultTTL = 3600;

    switch (taskType) {
      case LLMTaskType.EMBEDDING:
        // Embeddings rarely change, cache longer
        return 86400; // 24 hours
      case LLMTaskType.CHAT:
        // Chat responses can be cached for shorter time
        return 1800; // 30 minutes
      case LLMTaskType.ANALYSIS:
      case LLMTaskType.VISION:
        // Analysis results can be cached
        return 3600; // 1 hour
      default:
        return defaultTTL;
    }
  }

  /**
   * Get available models from all providers
   */
  public async getAvailableModels(): Promise<any[]> {
    const providers = this.providerManager.getRegisteredProviders();
    const allModels: any[] = [];

    for (const provider of providers) {
      const adapter = this.providerManager.getProvider(provider);
      if (adapter) {
        try {
          const models = await adapter.getModels();
          allModels.push(...models);
        } catch (error) {
          // Skip if provider fails
        }
      }
    }

    return allModels;
  }

  /**
   * Estimate cost for a request
   */
  public async estimateCost(
    request: LLMRequest,
    provider?: LLMProvider,
    model?: string
  ): Promise<number> {
    let adapter: LLMProviderInterface | null;

    if (provider) {
      adapter = this.providerManager.getProvider(provider);
    } else {
      adapter = await this.providerManager.selectProvider();
    }

    if (!adapter) {
      return 0;
    }

    return adapter.estimateCost(request, model);
  }

  /**
   * Health check for all providers
   */
  public async healthCheck(): Promise<Record<LLMProvider, boolean>> {
    return await this.providerManager.healthCheck();
  }
}

// Export singleton instance
export const llmService = LLMService.getInstance();

