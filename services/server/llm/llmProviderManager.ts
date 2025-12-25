/**
 * LLM Provider Manager
 * Manages multiple LLM providers with fallback, load balancing, and selection logic
 */

import type {
  LLMProvider,
  LLMConfig,
  LLMProviderInterface,
  ProviderSelectionStrategy
} from '../../shared/llm/types';
import { GeminiAdapter } from './providers/geminiAdapter';
import { OpenAIAdapter } from './providers/openaiAdapter';
import { AnthropicAdapter } from './providers/anthropicAdapter';
import { LocalAdapter } from './providers/localAdapter';
import { HuggingFaceAdapter } from './providers/huggingfaceAdapter';

export class LLMProviderManager {
  private static instance: LLMProviderManager;
  private providers: Map<LLMProvider, LLMProviderInterface> = new Map();
  private defaultStrategy: ProviderSelectionStrategy;
  private providerConfigs: Map<LLMProvider, LLMConfig> = new Map();

  private constructor() {
    this.defaultStrategy = {
      primary: LLMProvider.GEMINI,
      fallbacks: [LLMProvider.OPENAI, LLMProvider.LOCAL]
    };
  }

  public static getInstance(): LLMProviderManager {
    if (!LLMProviderManager.instance) {
      LLMProviderManager.instance = new LLMProviderManager();
    }
    return LLMProviderManager.instance;
  }

  /**
   * Register a provider with its configuration
   */
  public registerProvider(config: LLMConfig): void {
    let adapter: LLMProviderInterface;

    switch (config.provider) {
      case LLMProvider.GEMINI:
        adapter = new GeminiAdapter(config);
        break;
      case LLMProvider.OPENAI:
        adapter = new OpenAIAdapter(config);
        break;
      case LLMProvider.ANTHROPIC:
        adapter = new AnthropicAdapter(config);
        break;
      case LLMProvider.LOCAL:
        adapter = new LocalAdapter(config);
        break;
      case LLMProvider.HUGGINGFACE:
        adapter = new HuggingFaceAdapter(config);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }

    this.providers.set(config.provider, adapter);
    this.providerConfigs.set(config.provider, config);
  }

  /**
   * Get a provider by name
   */
  public getProvider(provider: LLMProvider): LLMProviderInterface | null {
    return this.providers.get(provider) || null;
  }

  /**
   * Select the best provider based on strategy
   */
  public async selectProvider(
    strategy?: Partial<ProviderSelectionStrategy>
  ): Promise<LLMProviderInterface | null> {
    const selectionStrategy = strategy || this.defaultStrategy;
    const providersToTry = [
      selectionStrategy.primary,
      ...(selectionStrategy.fallbacks || [])
    ];

    for (const provider of providersToTry) {
      const adapter = this.providers.get(provider);
      if (!adapter) {
        continue;
      }

      // Check if provider is available
      try {
        const isAvailable = await adapter.isAvailable();
        if (isAvailable) {
          return adapter;
        }
      } catch (error) {
        // Provider unavailable, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Get all registered providers
   */
  public getRegisteredProviders(): LLMProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  public isProviderRegistered(provider: LLMProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get provider configuration
   */
  public getProviderConfig(provider: LLMProvider): LLMConfig | null {
    return this.providerConfigs.get(provider) || null;
  }

  /**
   * Set default selection strategy
   */
  public setDefaultStrategy(strategy: ProviderSelectionStrategy): void {
    this.defaultStrategy = strategy;
  }

  /**
   * Initialize providers from environment variables
   */
  public initializeFromEnv(): void {
    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      this.registerProvider({
        provider: LLMProvider.GEMINI,
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
        timeout: parseInt(process.env.GEMINI_TIMEOUT || '60000')
      });
    }

    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.registerProvider({
        provider: LLMProvider.OPENAI,
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL,
        defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000')
      });
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.registerProvider({
        provider: LLMProvider.ANTHROPIC,
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.ANTHROPIC_BASE_URL,
        defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
        timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '60000')
      });
    }

    // Initialize Local (Ollama)
    if (process.env.OLLAMA_BASE_URL || process.env.LOCAL_LLM_ENABLED === 'true') {
      this.registerProvider({
        provider: LLMProvider.LOCAL,
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3:8b',
        timeout: parseInt(process.env.OLLAMA_TIMEOUT || '120000')
      });
    }

    // Initialize Hugging Face
    if (process.env.HUGGINGFACE_API_KEY) {
      this.registerProvider({
        provider: LLMProvider.HUGGINGFACE,
        apiKey: process.env.HUGGINGFACE_API_KEY,
        baseURL: process.env.HUGGINGFACE_BASE_URL,
        defaultModel: process.env.HUGGINGFACE_DEFAULT_MODEL || 'meta-llama/Llama-3-8b-chat-hf',
        timeout: parseInt(process.env.HUGGINGFACE_TIMEOUT || '120000')
      });
    }

    // Set default strategy from env
    const primaryProvider = process.env.LLM_PROVIDER as LLMProvider;
    const fallbackProviders = process.env.LLM_FALLBACK_PROVIDERS?.split(',') as LLMProvider[];

    if (primaryProvider) {
      this.setDefaultStrategy({
        primary: primaryProvider,
        fallbacks: fallbackProviders || []
      });
    }
  }

  /**
   * Health check for all providers
   */
  public async healthCheck(): Promise<Record<LLMProvider, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [provider, adapter] of this.providers.entries()) {
      try {
        results[provider] = await adapter.isAvailable();
      } catch (error) {
        results[provider] = false;
      }
    }

    return results as Record<LLMProvider, boolean>;
  }
}

