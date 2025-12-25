/**
 * Hugging Face Provider Adapter
 * Adapts Hugging Face Inference API to unified LLM interface
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

export class HuggingFaceAdapter extends BaseProvider {
  private baseURL = 'https://api-inference.huggingface.co';
  private defaultModel = 'meta-llama/Llama-3-8b-chat-hf';

  constructor(config: LLMConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('Hugging Face API key is required');
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
      // Build prompt with system instruction
      let fullPrompt = request.prompt;
      if (request.systemInstruction) {
        fullPrompt = `${request.systemInstruction}\n\n${request.prompt}`;
      }

      const payload: any = {
        inputs: fullPrompt,
        parameters: {}
      };

      if (request.temperature !== undefined) {
        payload.parameters.temperature = request.temperature;
      } else if (mergedConfig.temperature !== undefined) {
        payload.parameters.temperature = mergedConfig.temperature;
      }

      if (request.maxTokens !== undefined) {
        payload.parameters.max_new_tokens = request.maxTokens;
      } else if (mergedConfig.maxTokens !== undefined) {
        payload.parameters.max_new_tokens = mergedConfig.maxTokens;
      }

      if (request.topP !== undefined) {
        payload.parameters.top_p = request.topP;
      }

      // Make API call
      const response = await axios.post(
        `${this.baseURL}/models/${model}`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${mergedConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: mergedConfig.timeout || 120000
        }
      );

      const latency = Date.now() - startTime;
      
      // Hugging Face returns array of generated text
      let responseText = '';
      if (Array.isArray(response.data)) {
        responseText = response.data[0]?.generated_text || '';
      } else if (response.data.generated_text) {
        responseText = response.data.generated_text;
      } else {
        responseText = JSON.stringify(response.data);
      }

      // Remove the original prompt from response if it's included
      if (responseText.startsWith(fullPrompt)) {
        responseText = responseText.substring(fullPrompt.length).trim();
      }
      
      const inputTokens = this.estimateTokenCount(request.prompt);
      const outputTokens = this.estimateTokenCount(responseText);
      
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
        finishReason: 'stop',
        metadata: {
          model: model
        }
      };
    } catch (error: any) {
      if (error.response?.status === 503) {
        throw new Error('Hugging Face model is loading, please try again in a few moments');
      }
      if (error.response) {
        throw new Error(`Hugging Face API error: ${error.response.data?.error || error.message}`);
      }
      throw new Error(`Hugging Face API error: ${error.message}`);
    }
  }

  async getModels(): Promise<Model[]> {
    // Common Hugging Face models (pricing varies, some are free)
    return [
      {
        id: 'meta-llama/Llama-3-8b-chat-hf',
        name: 'Llama 3 8B Chat',
        provider: LLMProvider.HUGGINGFACE,
        contextLength: 8192,
        inputCostPerToken: 0, // Free tier available
        outputCostPerToken: 0,
        capabilities: {
          chat: true,
          vision: false,
          streaming: false,
          functionCalling: false
        },
        maxTokens: 4096
      },
      {
        id: 'mistralai/Mistral-7B-Instruct-v0.2',
        name: 'Mistral 7B Instruct',
        provider: LLMProvider.HUGGINGFACE,
        contextLength: 8192,
        inputCostPerToken: 0,
        outputCostPerToken: 0,
        capabilities: {
          chat: true,
          vision: false,
          streaming: false,
          functionCalling: false
        },
        maxTokens: 4096
      },
      {
        id: 'google/flan-t5-large',
        name: 'FLAN-T5 Large',
        provider: LLMProvider.HUGGINGFACE,
        contextLength: 512,
        inputCostPerToken: 0,
        outputCostPerToken: 0,
        capabilities: {
          chat: true,
          vision: false,
          streaming: false,
          functionCalling: false
        },
        maxTokens: 512
      }
    ];
  }

  estimateCost(request: LLMRequest, model?: string): number {
    // Many Hugging Face models are free, but some paid tiers exist
    // For now, return 0 as most models are free
    return 0;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if API is reachable
      const response = await axios.get(
        `${this.baseURL}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          timeout: 5000,
          validateStatus: () => true
        }
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

