/**
 * Unified LLM Types and Interfaces
 * Provides type-safe abstractions for LLM operations across all providers
 */

export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  LOCAL = 'local',
  HUGGINGFACE = 'huggingface'
}

export enum LLMTaskType {
  CHAT = 'chat',
  ANALYSIS = 'analysis',
  EMBEDDING = 'embedding',
  VISION = 'vision',
  CODE = 'code'
}

export interface LLMRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  systemInstruction?: string;
  images?: Array<{
    data: string; // base64 encoded
    mimeType: string;
  }>;
  stream?: boolean;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  text: string;
  model: string;
  provider: LLMProvider;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  cached: boolean;
  finishReason?: string;
  metadata?: Record<string, any>;
}

export interface LLMStreamChunk {
  text: string;
  delta: string;
  done: boolean;
  metadata?: Record<string, any>;
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  defaultModel?: string;
  maxTokens?: number;
  temperature?: number;
  headers?: Record<string, string>;
}

export interface Model {
  id: string;
  name: string;
  provider: LLMProvider;
  contextLength: number;
  inputCostPerToken: number; // cost per 1K input tokens
  outputCostPerToken: number; // cost per 1K output tokens
  capabilities: {
    chat: boolean;
    vision: boolean;
    streaming: boolean;
    functionCalling: boolean;
  };
  maxTokens?: number;
}

export interface LLMProviderInterface {
  /**
   * Generate a response from the LLM
   */
  generate(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse>;

  /**
   * Generate a streaming response
   */
  generateStreaming?(request: LLMRequest, config?: Partial<LLMConfig>): AsyncGenerator<LLMStreamChunk>;

  /**
   * Get available models for this provider
   */
  getModels(): Promise<Model[]>;

  /**
   * Estimate the cost for a request
   */
  estimateCost(request: LLMRequest, model?: string): number;

  /**
   * Check if the provider is available/healthy
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider name
   */
  getProvider(): LLMProvider;
}

export interface CostBreakdown {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
  provider: LLMProvider;
}

export interface UsageStats {
  userId?: string;
  projectId?: string;
  provider: LLMProvider;
  model: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  cacheHitRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  keyPrefix: string;
  maxSize?: number; // Maximum cache size in MB
}

export interface ProviderSelectionStrategy {
  primary: LLMProvider;
  fallbacks: LLMProvider[];
  selectionCriteria?: {
    costLimit?: number;
    maxLatency?: number;
    requiredCapabilities?: string[];
  };
}

