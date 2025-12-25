/**
 * LLM Provider Configuration
 * Provider-specific configurations, pricing tables, and capabilities
 */

import { LLMProvider } from '../../../services/shared/llm/types';
import type { Model } from '../../../services/shared/llm/types';

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  defaultModel: string;
  models: Model[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    tokensPerMinute: number;
  };
  capabilities: {
    chat: boolean;
    vision: boolean;
    streaming: boolean;
    functionCalling: boolean;
    embeddings: boolean;
  };
}

export const providerConfigs: Record<LLMProvider, ProviderConfig> = {
  [LLMProvider.GEMINI]: {
    name: 'Google Gemini',
    enabled: !!process.env.GEMINI_API_KEY,
    defaultModel: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
    models: [],
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerDay: 1500,
      tokensPerMinute: 1000000
    },
    capabilities: {
      chat: true,
      vision: true,
      streaming: true,
      functionCalling: true,
      embeddings: false
    }
  },
  [LLMProvider.OPENAI]: {
    name: 'OpenAI',
    enabled: !!process.env.OPENAI_API_KEY,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    models: [],
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerDay: 10000,
      tokensPerMinute: 1000000
    },
    capabilities: {
      chat: true,
      vision: true,
      streaming: true,
      functionCalling: true,
      embeddings: true
    }
  },
  [LLMProvider.ANTHROPIC]: {
    name: 'Anthropic Claude',
    enabled: !!process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-20241022',
    models: [],
    rateLimits: {
      requestsPerMinute: 50,
      requestsPerDay: 5000,
      tokensPerMinute: 40000
    },
    capabilities: {
      chat: true,
      vision: true,
      streaming: true,
      functionCalling: true,
      embeddings: false
    }
  },
  [LLMProvider.LOCAL]: {
    name: 'Local Models (Ollama/vLLM)',
    enabled: process.env.LOCAL_LLM_ENABLED === 'true' || !!process.env.OLLAMA_BASE_URL,
    defaultModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3:8b',
    models: [],
    rateLimits: {
      requestsPerMinute: 1000, // No API limits for local
      requestsPerDay: 100000,
      tokensPerMinute: 100000
    },
    capabilities: {
      chat: true,
      vision: false,
      streaming: true,
      functionCalling: false,
      embeddings: false
    }
  },
  [LLMProvider.HUGGINGFACE]: {
    name: 'Hugging Face',
    enabled: !!process.env.HUGGINGFACE_API_KEY,
    defaultModel: process.env.HUGGINGFACE_DEFAULT_MODEL || 'meta-llama/Llama-3-8b-chat-hf',
    models: [],
    rateLimits: {
      requestsPerMinute: 30,
      requestsPerDay: 1000,
      tokensPerMinute: 50000
    },
    capabilities: {
      chat: true,
      vision: false,
      streaming: false,
      functionCalling: false,
      embeddings: false
    }
  }
};

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  return providerConfigs[provider];
}

/**
 * Get enabled providers
 */
export function getEnabledProviders(): LLMProvider[] {
  return Object.entries(providerConfigs)
    .filter(([_, config]) => config.enabled)
    .map(([provider]) => provider as LLMProvider);
}

/**
 * Check if provider supports a capability
 */
export function providerSupports(
  provider: LLMProvider,
  capability: keyof ProviderConfig['capabilities']
): boolean {
  return providerConfigs[provider]?.capabilities[capability] || false;
}

