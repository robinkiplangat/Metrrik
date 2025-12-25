/**
 * Local Model Provider Adapter (Ollama/vLLM)
 * Adapts local LLM inference to unified LLM interface
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

export class LocalAdapter extends BaseProvider {
  private baseURL: string;
  private defaultModel = 'llama3:8b';
  private providerType: 'ollama' | 'vllm' = 'ollama';

  constructor(config: LLMConfig) {
    super(config);
    
    this.baseURL = config.baseURL || 'http://localhost:11434';
    this.defaultModel = config.defaultModel || this.defaultModel;
    
    // Detect provider type from baseURL
    if (this.baseURL.includes('vllm') || this.baseURL.includes('8000')) {
      this.providerType = 'vllm';
    }
  }

  async generate(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const mergedConfig = this.mergeConfig(config);
    const baseURL = mergedConfig.baseURL || this.baseURL;

    try {
      if (this.providerType === 'ollama') {
        return await this.generateOllama(request, model, baseURL, startTime);
      } else {
        return await this.generateVLLM(request, model, baseURL, startTime);
      }
    } catch (error: any) {
      throw new Error(`Local model error: ${error.message}`);
    }
  }

  private async generateOllama(
    request: LLMRequest,
    model: string,
    baseURL: string,
    startTime: number
  ): Promise<LLMResponse> {
    const payload: any = {
      model,
      prompt: request.prompt,
      stream: false
    };

    if (request.systemInstruction) {
      payload.system = request.systemInstruction;
    }

    if (request.temperature !== undefined) {
      payload.options = {
        temperature: request.temperature
      };
    }

    if (request.maxTokens !== undefined) {
      if (!payload.options) payload.options = {};
      payload.options.num_predict = request.maxTokens;
    }

    const response = await axios.post(
      `${baseURL}/api/generate`,
      payload,
      {
        timeout: 120000 // 2 minutes for local models
      }
    );

    const latency = Date.now() - startTime;
    const responseData = response.data;
    const responseText = responseData.response || '';
    
    const inputTokens = responseData.prompt_eval_count || this.estimateTokenCount(request.prompt);
    const outputTokens = responseData.eval_count || this.estimateTokenCount(responseText);

    return {
      text: responseText,
      model,
      provider: this.provider,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: 0, // Local models have no API cost
      latency,
      cached: false,
      finishReason: 'stop',
      metadata: {
        total_duration: responseData.total_duration,
        load_duration: responseData.load_duration,
        eval_duration: responseData.eval_duration
      }
    };
  }

  private async generateVLLM(
    request: LLMRequest,
    model: string,
    baseURL: string,
    startTime: number
  ): Promise<LLMResponse> {
    const messages: any[] = [];
    
    if (request.systemInstruction) {
      messages.push({
        role: 'system',
        content: request.systemInstruction
      });
    }

    messages.push({
      role: 'user',
      content: request.prompt
    });

    const payload: any = {
      model,
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000
    };

    const response = await axios.post(
      `${baseURL}/v1/chat/completions`,
      payload,
      {
        timeout: 120000
      }
    );

    const latency = Date.now() - startTime;
    const responseData = response.data;
    const responseText = responseData.choices[0]?.message?.content || '';
    
    const usage = responseData.usage || {};
    const inputTokens = usage.prompt_tokens || this.estimateTokenCount(request.prompt);
    const outputTokens = usage.completion_tokens || this.estimateTokenCount(responseText);

    return {
      text: responseText,
      model,
      provider: this.provider,
      inputTokens,
      outputTokens,
      totalTokens: usage.total_tokens || inputTokens + outputTokens,
      cost: 0, // Local models have no API cost
      latency,
      cached: false,
      finishReason: responseData.choices[0]?.finish_reason || 'stop',
      metadata: {
        id: responseData.id
      }
    };
  }

  async getModels(): Promise<Model[]> {
    const baseURL = this.config.baseURL || this.baseURL;
    
    try {
      if (this.providerType === 'ollama') {
        const response = await axios.get(`${baseURL}/api/tags`);
        const models = response.data.models || [];
        
        return models.map((m: any) => ({
          id: m.name,
          name: m.name,
          provider: LLMProvider.LOCAL,
          contextLength: m.details?.context_length || 4096,
          inputCostPerToken: 0,
          outputCostPerToken: 0,
          capabilities: {
            chat: true,
            vision: false,
            streaming: true,
            functionCalling: false
          },
          maxTokens: 4096
        }));
      } else {
        // vLLM - return common models
        return [
          {
            id: 'llama3:8b',
            name: 'Llama 3 8B',
            provider: LLMProvider.LOCAL,
            contextLength: 8192,
            inputCostPerToken: 0,
            outputCostPerToken: 0,
            capabilities: {
              chat: true,
              vision: false,
              streaming: true,
              functionCalling: false
            },
            maxTokens: 4096
          }
        ];
      }
    } catch (error) {
      // Return default models if API is unavailable
      return [
        {
          id: 'llama3:8b',
          name: 'Llama 3 8B',
          provider: LLMProvider.LOCAL,
          contextLength: 8192,
          inputCostPerToken: 0,
          outputCostPerToken: 0,
          capabilities: {
            chat: true,
            vision: false,
            streaming: true,
            functionCalling: false
          },
          maxTokens: 4096
        }
      ];
    }
  }

  estimateCost(request: LLMRequest, model?: string): number {
    // Local models have no API cost
    return 0;
  }

  async isAvailable(): Promise<boolean> {
    const baseURL = this.config.baseURL || this.baseURL;
    
    try {
      if (this.providerType === 'ollama') {
        const response = await axios.get(`${baseURL}/api/tags`, { timeout: 5000 });
        return response.status === 200;
      } else {
        const response = await axios.get(`${baseURL}/health`, { timeout: 5000 });
        return response.status === 200;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull a model (Ollama specific)
   */
  async pullModel(model: string): Promise<void> {
    if (this.providerType !== 'ollama') {
      throw new Error('pullModel is only available for Ollama');
    }

    const baseURL = this.config.baseURL || this.baseURL;
    await axios.post(`${baseURL}/api/pull`, { name: model }, { timeout: 300000 });
  }

  /**
   * List available models (Ollama specific)
   */
  async listModels(): Promise<string[]> {
    const models = await this.getModels();
    return models.map(m => m.id);
  }
}

