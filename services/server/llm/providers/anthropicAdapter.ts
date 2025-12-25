/**
 * Anthropic Claude Provider Adapter
 * Adapts Anthropic Claude API to unified LLM interface
 */

import axios from 'axios';
import { BaseProvider } from './baseProvider';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMConfig,
  Model
} from '../../../shared/llm/types';

export class AnthropicAdapter extends BaseProvider {
  private baseURL = 'https://api.anthropic.com/v1';
  private defaultModel = 'claude-3-5-sonnet-20241022';

  constructor(config: LLMConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.baseURL = config.baseURL || this.baseURL;
    this.defaultModel = config.defaultModel || this.defaultModel;
  }

  async generate(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const mergedConfig = this.mergeConfig(config);

    try {
      // Build messages array
      const messages: any[] = [];
      
      // Handle images in content
      const content: any[] = [];

      if (request.images && request.images.length > 0) {
        request.images.forEach(image => {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mimeType,
              data: image.data
            }
          });
        });
      }

      // Add text
      if (request.prompt) {
        content.push({
          type: 'text',
          text: request.prompt
        });
      }

      messages.push({
        role: 'user',
        content
      });

      // Build request payload
      const payload: any = {
        model,
        max_tokens: request.maxTokens ?? mergedConfig.maxTokens ?? 4096,
        messages
      };

      if (request.systemInstruction) {
        payload.system = request.systemInstruction;
      }

      if (request.temperature !== undefined) {
        payload.temperature = request.temperature;
      } else if (mergedConfig.temperature !== undefined) {
        payload.temperature = mergedConfig.temperature;
      }

      if (request.topP !== undefined) {
        payload.top_p = request.topP;
      }

      // Make API call
      const response = await axios.post(
        `${this.baseURL}/messages`,
        payload,
        {
          headers: {
            'x-api-key': mergedConfig.apiKey!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: mergedConfig.timeout || 60000
        }
      );

      const latency = Date.now() - startTime;
      const responseData = response.data;
      const responseText = responseData.content[0]?.text || '';
      
      const usage = responseData.usage || {};
      const inputTokens = usage.input_tokens || this.estimateTokenCount(request.prompt);
      const outputTokens = usage.output_tokens || this.estimateTokenCount(responseText);
      
      const cost = this.estimateCost(request, model);

      return {
        text: responseText,
        model,
        provider: this.provider,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost,
        latency,
        cached: false,
        finishReason: responseData.stop_reason || 'stop',
        metadata: {
          id: responseData.id,
          type: responseData.type
        }
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Anthropic API error: ${error.response.data?.error?.message || error.message}`);
      }
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  async getModels(): Promise<Model[]> {
    // Anthropic models with pricing (as of 2024)
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: LLMProvider.ANTHROPIC,
        contextLength: 200000,
        inputCostPerToken: 3.00, // $3.00 per 1M tokens
        outputCostPerToken: 15.00, // $15.00 per 1M tokens
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 8192
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: LLMProvider.ANTHROPIC,
        contextLength: 200000,
        inputCostPerToken: 15.00,
        outputCostPerToken: 75.00,
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 4096
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: LLMProvider.ANTHROPIC,
        contextLength: 200000,
        inputCostPerToken: 0.25, // $0.25 per 1M tokens
        outputCostPerToken: 1.25, // $1.25 per 1M tokens
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: false
        },
        maxTokens: 4096
      }
    ];
  }

  estimateCost(request: LLMRequest, model?: string): number {
    const modelId = model || request.model || this.defaultModel;
    const models = this.getModels();
    
    const modelInfo = models.find(m => m.id === modelId);
    if (!modelInfo) {
      return 0;
    }

    const inputTokens = this.estimateTokenCount(request.prompt);
    const estimatedOutputTokens = request.maxTokens || 1000;
    
    const inputCost = (inputTokens / 1000000) * modelInfo.inputCostPerToken;
    const outputCost = (estimatedOutputTokens / 1000000) * modelInfo.outputCostPerToken;
    
    return inputCost + outputCost;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check
      const response = await axios.get(
        `${this.baseURL}/messages`,
        {
          headers: {
            'x-api-key': this.config.apiKey!,
            'anthropic-version': '2023-06-01'
          },
          timeout: 5000,
          validateStatus: () => true // Don't throw on 4xx/5xx
        }
      );
      // Any response means API is reachable
      return true;
    } catch (error) {
      return false;
    }
  }
}

