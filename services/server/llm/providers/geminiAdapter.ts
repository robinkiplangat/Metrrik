/**
 * Gemini Provider Adapter
 * Adapts Google Gemini API to unified LLM interface
 */

import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { BaseProvider } from './baseProvider';
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMConfig,
  Model
} from '../../../shared/llm/types';

export class GeminiAdapter extends BaseProvider {
  private client: GoogleGenAI;
  private defaultModel = 'gemini-2.5-flash';

  constructor(config: LLMConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.defaultModel = config.defaultModel || this.defaultModel;
  }

  async generate(request: LLMRequest, config?: Partial<LLMConfig>): Promise<LLMResponse> {
    this.validateRequest(request);
    
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const mergedConfig = this.mergeConfig(config);

    try {
      // Prepare content parts
      const parts: any[] = [];
      
      // Add images if present
      if (request.images && request.images.length > 0) {
        request.images.forEach(image => {
          parts.push({
            inlineData: {
              data: image.data,
              mimeType: image.mimeType
            }
          });
        });
      }

      // Add text prompt
      parts.push({
        text: request.prompt
      });

      // Build request
      const generateRequest: any = {
        model,
        contents: { parts },
        config: {}
      };

      // Add system instruction if provided
      if (request.systemInstruction) {
        generateRequest.config.systemInstruction = request.systemInstruction;
      }

      // Add generation config
      if (request.temperature !== undefined) {
        generateRequest.config.temperature = request.temperature;
      }
      if (request.maxTokens !== undefined) {
        generateRequest.config.maxOutputTokens = request.maxTokens;
      }
      if (request.topP !== undefined) {
        generateRequest.config.topP = request.topP;
      }

      // Make API call
      const response: GenerateContentResponse = await this.client.models.generateContent(generateRequest);
      
      const latency = Date.now() - startTime;
      const responseText = response.text || '';
      
      // Estimate tokens (Gemini doesn't always return token counts in response)
      const inputTokens = this.estimateTokenCount(request.prompt);
      const outputTokens = this.estimateTokenCount(responseText);
      
      // Get model for cost calculation
      const modelInfo = await this.getModelInfo(model);
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
        finishReason: response.finishReason || 'stop',
        metadata: {
          responseId: response.responseId,
          candidates: response.candidates?.length || 0
        }
      };
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async getModels(): Promise<Model[]> {
    // Gemini models with pricing (as of 2024)
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: LLMProvider.GEMINI,
        contextLength: 1000000,
        inputCostPerToken: 0.075, // $0.075 per 1M tokens
        outputCostPerToken: 0.30, // $0.30 per 1M tokens
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 8192
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: LLMProvider.GEMINI,
        contextLength: 1000000,
        inputCostPerToken: 0.075,
        outputCostPerToken: 0.30,
        capabilities: {
          chat: true,
          vision: true,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 8192
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        provider: LLMProvider.GEMINI,
        contextLength: 32768,
        inputCostPerToken: 0.50, // $0.50 per 1M tokens
        outputCostPerToken: 1.50, // $1.50 per 1M tokens
        capabilities: {
          chat: true,
          vision: false,
          streaming: true,
          functionCalling: true
        },
        maxTokens: 8192
      }
    ];
  }

  estimateCost(request: LLMRequest, model?: string): number {
    const modelId = model || request.model || this.defaultModel;
    const models = this.getModels();
    
    // Find model pricing
    const modelInfo = models.find(m => m.id === modelId);
    if (!modelInfo) {
      return 0; // Unknown model, return 0 cost
    }

    const inputTokens = this.estimateTokenCount(request.prompt);
    const estimatedOutputTokens = request.maxTokens || 1000; // Default estimate
    
    const inputCost = (inputTokens / 1000000) * modelInfo.inputCostPerToken;
    const outputCost = (estimatedOutputTokens / 1000000) * modelInfo.outputCostPerToken;
    
    return inputCost + outputCost;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - try to list models
      await this.getModels();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getModelInfo(modelId: string): Promise<Model | null> {
    const models = await this.getModels();
    return models.find(m => m.id === modelId) || null;
  }
}

