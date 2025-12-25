/**
 * Cost Tracker
 * Tracks LLM usage costs and stores in MongoDB
 */

import { getDatabase } from '../../../backend/src/config/database';
import type { LLMResponse, LLMTaskType } from '../../shared/llm/types';

export interface UsageLog {
  userId?: string;
  projectId?: string;
  provider: string;
  model: string;
  prompt: string;
  response: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  timestamp: Date;
  cached: boolean;
  taskType?: LLMTaskType;
  metadata?: Record<string, any>;
}

export interface CostStats {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  averageCostPerRequest: number;
  averageLatency: number;
  cacheHitRate: number;
  byProvider: Record<string, {
    cost: number;
    requests: number;
  }>;
  byModel: Record<string, {
    cost: number;
    requests: number;
  }>;
  period: {
    start: Date;
    end: Date;
  };
}

export class CostTracker {
  private static instance: CostTracker;
  private enabled: boolean = true;

  private constructor() {
    this.enabled = process.env.LLM_COST_TRACKING_ENABLED !== 'false';
  }

  public static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  /**
   * Track a usage event
   */
  public async trackUsage(
    response: LLMResponse & {
      userId?: string;
      projectId?: string;
      taskType?: LLMTaskType;
    }
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const db = getDatabase();
      
      const usageLog: UsageLog = {
        userId: response.userId,
        projectId: response.projectId,
        provider: response.provider,
        model: response.model,
        prompt: response.metadata?.prompt || '', // Store prompt if available
        response: response.text.substring(0, 1000), // Store first 1000 chars
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        totalTokens: response.totalTokens,
        cost: response.cost,
        latency: response.latency,
        timestamp: new Date(),
        cached: response.cached,
        taskType: response.taskType,
        metadata: response.metadata
      };

      await db.collection('llm_usage_logs').insertOne(usageLog);
    } catch (error) {
      // Don't throw - cost tracking shouldn't break the app
      console.error('Error tracking LLM usage:', error);
    }
  }

  /**
   * Get cost statistics for a period
   */
  public async getCostStats(
    userId?: string,
    projectId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostStats> {
    const db = getDatabase();
    
    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (projectId) {
      query.projectId = projectId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    } else {
      // Default to last 30 days
      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      query.timestamp = { $gte: defaultStart };
    }

    const logs = await db.collection('llm_usage_logs').find(query).toArray();

    const stats: CostStats = {
      totalCost: 0,
      totalRequests: logs.length,
      totalTokens: 0,
      averageCostPerRequest: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      byProvider: {},
      byModel: {},
      period: {
        start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: endDate || new Date()
      }
    };

    let totalLatency = 0;
    let cacheHits = 0;

    for (const log of logs) {
      stats.totalCost += log.cost || 0;
      stats.totalTokens += log.totalTokens || 0;
      totalLatency += log.latency || 0;
      
      if (log.cached) {
        cacheHits++;
      }

      // Aggregate by provider
      const provider = log.provider || 'unknown';
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = { cost: 0, requests: 0 };
      }
      stats.byProvider[provider].cost += log.cost || 0;
      stats.byProvider[provider].requests += 1;

      // Aggregate by model
      const model = log.model || 'unknown';
      if (!stats.byModel[model]) {
        stats.byModel[model] = { cost: 0, requests: 0 };
      }
      stats.byModel[model].cost += log.cost || 0;
      stats.byModel[model].requests += 1;
    }

    if (stats.totalRequests > 0) {
      stats.averageCostPerRequest = stats.totalCost / stats.totalRequests;
      stats.averageLatency = totalLatency / stats.totalRequests;
      stats.cacheHitRate = cacheHits / stats.totalRequests;
    }

    return stats;
  }

  /**
   * Get cost breakdown by user
   */
  public async getCostByUser(
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const db = getDatabase();
    
    const query: any = {};
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: '$userId',
          totalCost: { $sum: '$cost' },
          totalRequests: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } }
    ];

    const results = await db.collection('llm_usage_logs').aggregate(pipeline).toArray();
    
    const breakdown: Record<string, number> = {};
    for (const result of results) {
      if (result._id) {
        breakdown[result._id.toString()] = result.totalCost;
      }
    }

    return breakdown;
  }

  /**
   * Get cost breakdown by project
   */
  public async getCostByProject(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const db = getDatabase();
    
    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = startDate;
      }
      if (endDate) {
        query.timestamp.$lte = endDate;
      }
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: '$projectId',
          totalCost: { $sum: '$cost' },
          totalRequests: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } }
    ];

    const results = await db.collection('llm_usage_logs').aggregate(pipeline).toArray();
    
    const breakdown: Record<string, number> = {};
    for (const result of results) {
      if (result._id) {
        breakdown[result._id.toString()] = result.totalCost;
      }
    }

    return breakdown;
  }

  /**
   * Check if cost threshold is exceeded
   */
  public async checkCostThreshold(
    userId?: string,
    threshold?: number
  ): Promise<{ exceeded: boolean; currentCost: number; threshold: number }> {
    const alertThreshold = threshold || parseFloat(process.env.LLM_COST_ALERT_THRESHOLD || '1000');
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month
    
    const stats = await this.getCostStats(userId, undefined, startDate);
    
    return {
      exceeded: stats.totalCost >= alertThreshold,
      currentCost: stats.totalCost,
      threshold: alertThreshold
    };
  }

  /**
   * Enable or disable cost tracking
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if tracking is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const costTracker = CostTracker.getInstance();

