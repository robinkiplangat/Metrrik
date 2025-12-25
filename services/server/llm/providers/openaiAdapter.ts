/**
 * OpenAI Provider Adapter
 * Adapts OpenAI API to unified LLM interface
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

export class OpenAIAdapter extends BaseProvider {
  private baseURL = 'https://api.openai.com/v1';
  private defaultModel = 'gpt-4o-mini';

  constructor(config: LLMConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
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
      
      if (request.systemInstruction) {
        messages.push({
          role: 'system',
          content: request.systemInstruction
        });
      }

      // Handle images in content
      const content: any[] = [
        { type: 'text', text: request.prompt }
      ];

      if (request.images && request.images.length > 0) {
        request.images.forEach(image => {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.data}`
            }
          });
        });
      }

      messages.push({
        role: 'user',
        content
      });

      // Build request payload
      const payload: any = {
        model,
        messages,
        temperature: request.temperature ?? mergedConfig.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? mergedConfig.maxTokens,
      };

      if (request.topP !== undefined) {
        payload.top_p = request.topP;
      }
      if (request.frequencyPenalty !== undefined) {
        payload.frequency_penalty = request.frequencyPenalty;
      }
      if (request.presencePenalty !== undefined) {
        payload.presence_penalty = request.presencePenalty;
      }
      if (request.stop && request.stop.length > 0) {
        payload.stop = request.stop;
      }

      // Make API call
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${mergedConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: mergedConfig.timeout || 60000
        }
      );

      const latency = Date.now() - startTime;
      const responseData = response.data;
      const responseText = responseData.choices[0]?.message?.content || '';
      
      const usage = responseData.usage || {};
      const inputTokens = usage.prompt_tokens || this.estimateTokenCount(request.prompt);
      const outputTokens = usage.completion_tokens || this.estimateTokenCount(responseText);
      
      const cost = this.estimateCost(request, model);

      return {
        text: responseText,
        model,
        provider: this.provider,
        inputTokens,
        outputTokens,
        totalTokens: usage.total_tokens || inputTokens + outputTokens,
        cost,
        latency,
        cached: false,
        finishReason: responseData.choices[0]?.finish_reason || 'stop',
        metadata: {
          id: responseData.id,
          created: responseData.created
        }
      };
    } catch (error: any) {
      if (error.response) {
        throw new Error(`OpenAI API error: ${error.response.data?.error?.message || error.message}`);
      }
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  async getModels(): Promise<Model[]> {
    // OpenAI models with pricing (as of 2024)
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: LLMProvider.OPENAI,
        contextLength: 128000,
        inputCostPerToken: 2.50, // $2.50 per 1M tokens
        outputCostPerToken: 10.00, // $10.00 per 1M tokens
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 16384
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: LLMProvider.OPENAI,
        contextLength: 128000,
        inputCostPerToken: 0.15, // $0.15 per 1M tokens
        outputCostPerToken: 0.60, // $0.60 per 1M tokens
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 16384
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: LLMProvider.OPENAI,
        contextLength: 128000,
        inputCostPerToken: 10.00,
        outputCostPerToken: 30.00,
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 4096
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: LLMProvider.OPENAI,
        contextLength: 16385,
        inputCostPerToken: 0.50, // $0.50 per 1M tokens
        outputCostPerToken: 1.50, // $1.50 per 1M tokens
        capabilities: {
          chat: true,
          vision: false,
          streaming: true,
          functionCalling: true
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
      const response = await axios.get(
        `${this.baseURL}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 5000
        }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

