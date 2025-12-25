
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import {
  AlgorithmContext,
  AlgorithmResult,
  ExecutionStrategy,
  AlgorithmPriority
} from './algorithmOrchestrator';

// Pipeline stage definition
export interface PipelineStage {
  id: string;
  name: string;
  algorithmId: string;
  version?: string;
  inputMapping: InputMapping;
  outputMapping: OutputMapping;
  conditions?: StageCondition[];
  timeout: number;
  retryPolicy: RetryPolicy;
  parallel: boolean;
  dependencies: string[];
}

// Input mapping configuration
export interface InputMapping {
  source: 'pipeline_input' | 'previous_stage' | 'constant' | 'environment';
  path: string;
  defaultValue?: any;
  transformation?: string; // JSONPath or custom transformation
}

// Output mapping configuration
export interface OutputMapping {
  target: 'pipeline_output' | 'next_stage' | 'accumulator';
  path: string;
  transformation?: string;
}

// Stage condition
export interface StageCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
  action: 'execute' | 'skip' | 'fail';
}

// Retry policy
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

// Pipeline definition
export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  stages: PipelineStage[];
  inputSchema: any;
  outputSchema: any;
  timeout: number;
  maxConcurrency: number;
  isActive: boolean;
  tags: string[];
  metadata: Record<string, any>;
}

// Pipeline execution context
export interface PipelineExecutionContext {
  id: string;
  pipelineId: string;
  correlationId: string;
  userId: string;
  projectId?: string;
  input: any;
  startTime: Date;
  timeout: number;
  stageResults: Map<string, AlgorithmResult>;
  accumulator: Record<string, any>;
  metadata: Record<string, any>;
}

// Pipeline execution result
export interface PipelineExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  stageResults: Map<string, AlgorithmResult>;
  pipelineVersion: string;
  metadata: Record<string, any>;
}

// Pipeline metrics
export interface PipelineMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  lastExecutionTime: Date;
  errorRate: number;
  throughput: number;
  stageMetrics: Map<string, {
    totalExecutions: number;
    averageExecutionTime: number;
    errorRate: number;
  }>;
}

// World-class Algorithm Pipeline System
export class AlgorithmPipeline extends EventEmitter {
  private pipelines: Map<string, PipelineDefinition> = new Map();
  private activeExecutions: Map<string, PipelineExecutionContext> = new Map();
  private executionQueue: PipelineExecutionContext[] = [];
  private metrics: Map<string, PipelineMetrics> = new Map();
  private isRunning = false;
  private maxConcurrentPipelines = parseInt(process.env.MAX_CONCURRENT_PIPELINES || '50');
  private currentExecutions = 0;

  constructor() {
    super();
    this.startPipelineEngine();
  }

  // Register a new pipeline
  async registerPipeline(definition: PipelineDefinition): Promise<void> {
    try {
      // Validate pipeline definition
      await this.validatePipelineDefinition(definition);

      // Initialize metrics
      this.metrics.set(definition.id, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        lastExecutionTime: new Date(),
        errorRate: 0,
        throughput: 0,
        stageMetrics: new Map(),
      });

      this.pipelines.set(definition.id, definition);

      logger.info('Pipeline registered successfully', {
        pipelineId: definition.id,
        version: definition.version,
        stageCount: definition.stages.length,
      });

      this.emit('pipelineRegistered', definition);
    } catch (error: any) {
      logger.error('Failed to register pipeline', {
        pipelineId: definition.id,
        error: error.message,
      });
      throw error;
    }
  }

  // Execute pipeline
  async executePipeline(
    pipelineId: string,
    input: any,
    context: Partial<AlgorithmContext> = {}
  ): Promise<PipelineExecutionResult> {
    const startTime = performance.now();
    const executionId = uuidv4();
    const correlationId = context.correlationId || uuidv4();

    try {
      // Get pipeline definition
      const pipeline = this.pipelines.get(pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      if (!pipeline.isActive) {
        throw new Error(`Pipeline ${pipelineId} is not active`);
      }

      // Create execution context
      const executionContext: PipelineExecutionContext = {
        id: executionId,
        pipelineId,
        correlationId,
        userId: context.userId || 'system',
        projectId: context.projectId,
        input,
        startTime: new Date(),
        timeout: context.timeout || pipeline.timeout,
        stageResults: new Map(),
        accumulator: {},
        metadata: { ...context.metadata },
      };

      // Check if we can execute immediately
      if (this.currentExecutions >= this.maxConcurrentPipelines) {
        return this.queuePipelineExecution(executionContext);
      }

      // Execute immediately
      return this.executeImmediate(executionContext, pipeline);

    } catch (error: any) {
      const executionTime = performance.now() - startTime;

      logger.error('Pipeline execution failed', {
        pipelineId,
        executionId,
        correlationId,
        error: error.message,
        executionTime,
      });

      return {
        success: false,
        error: error.message,
        executionTime,
        stageResults: new Map(),
        pipelineVersion: this.pipelines.get(pipelineId)?.version || 'unknown',
        metadata: { executionId, correlationId },
      };
    }
  }

  // Get pipeline definition
  getPipeline(pipelineId: string): PipelineDefinition | null {
    return this.pipelines.get(pipelineId) || null;
  }

  // Get pipeline metrics
  getPipelineMetrics(pipelineId: string): PipelineMetrics | null {
    return this.metrics.get(pipelineId) || null;
  }

  // Get all pipeline metrics
  getAllPipelineMetrics(): Map<string, PipelineMetrics> {
    return new Map(this.metrics);
  }

  // Get active executions
  getActiveExecutions(): PipelineExecutionContext[] {
    return Array.from(this.activeExecutions.values());
  }

  // Cancel pipeline execution
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    // Mark execution as cancelled
    execution.metadata.cancelled = true;
    execution.metadata.cancelledAt = new Date();

    // Remove from active executions
    this.activeExecutions.delete(executionId);
    this.currentExecutions--;

    logger.info('Pipeline execution cancelled', {
      executionId,
      pipelineId: execution.pipelineId,
      correlationId: execution.correlationId,
    });

    this.emit('executionCancelled', execution);
    return true;
  }

  // Private methods
  private async executeImmediate(
    context: PipelineExecutionContext,
    pipeline: PipelineDefinition
  ): Promise<PipelineExecutionResult> {
    const startTime = performance.now();
    this.currentExecutions++;
    this.activeExecutions.set(context.id, context);

    try {
      // Execute pipeline stages
      const result = await this.executeStages(context, pipeline);
      const executionTime = performance.now() - startTime;

      // Update metrics
      this.updatePipelineMetrics(pipeline.id, executionTime, true);

      // Clean up
      this.activeExecutions.delete(context.id);
      this.currentExecutions--;

      return {
        success: true,
        data: result,
        executionTime,
        stageResults: context.stageResults,
        pipelineVersion: pipeline.version,
        metadata: { executionId: context.id, correlationId: context.correlationId },
      };

    } catch (error: any) {
      const executionTime = performance.now() - startTime;

      // Update metrics
      this.updatePipelineMetrics(pipeline.id, executionTime, false);

      // Clean up
      this.activeExecutions.delete(context.id);
      this.currentExecutions--;

      throw error;
    }
  }

  private async executeStages(
    context: PipelineExecutionContext,
    pipeline: PipelineDefinition
  ): Promise<any> {
    const executedStages = new Set<string>();
    const stageQueue = [...pipeline.stages];
    let currentData = context.input;

    while (stageQueue.length > 0) {
      // Find stages that can be executed (dependencies satisfied)
      const executableStages = stageQueue.filter(stage =>
        stage.dependencies.every(dep => executedStages.has(dep))
      );

      if (executableStages.length === 0) {
        throw new Error('Circular dependency detected in pipeline stages');
      }

      // Execute stages (parallel if configured)
      const stagePromises = executableStages.map(stage =>
        this.executeStage(stage, currentData, context)
      );

      const stageResults = await Promise.all(stagePromises);

      // Update executed stages
      executableStages.forEach(stage => {
        executedStages.add(stage.id);
        stageQueue.splice(stageQueue.indexOf(stage), 1);
      });

      // Update current data with stage outputs
      stageResults.forEach((result, index) => {
        const stage = executableStages[index];
        if (result.success && result.data) {
          currentData = this.mapStageOutput(result.data, stage.outputMapping, context);
        }
      });
    }

    return currentData;
  }

  private async executeStage(
    stage: PipelineStage,
    input: any,
    context: PipelineExecutionContext
  ): Promise<AlgorithmResult> {
    const startTime = performance.now();

    try {
      // Check stage conditions
      if (stage.conditions && !this.evaluateStageConditions(stage.conditions, input, context)) {
        return {
          success: true,
          data: input,
          executionTime: 0,
          algorithmVersion: 'skipped',
          metadata: { stageId: stage.id, skipped: true },
        };
      }

      // Map input for this stage
      const stageInput = this.mapStageInput(input, stage.inputMapping, context);

      // Execute algorithm (this would call the actual algorithm orchestrator)
      const result = await this.callAlgorithm(stage.algorithmId, stageInput, {
        ...context,
        timestamp: new Date(),
        priority: AlgorithmPriority.NORMAL,
        retryCount: 0,
        timeout: stage.timeout,
        maxRetries: stage.retryPolicy.maxRetries,
      });

      const executionTime = performance.now() - startTime;

      // Store stage result
      context.stageResults.set(stage.id, result);

      // Update stage metrics
      this.updateStageMetrics(context.pipelineId, stage.id, executionTime, result.success);

      return {
        ...result,
        executionTime,
        metadata: { ...result.metadata, stageId: stage.id },
      };

    } catch (error: any) {
      const executionTime = performance.now() - startTime;

      const result: AlgorithmResult = {
        success: false,
        error: error.message,
        executionTime,
        algorithmVersion: 'unknown',
        metadata: { stageId: stage.id, error: error.message },
      };

      context.stageResults.set(stage.id, result);
      this.updateStageMetrics(context.pipelineId, stage.id, executionTime, false);

      return result;
    }
  }

  private mapStageInput(
    input: any,
    mapping: InputMapping,
    context: PipelineExecutionContext
  ): any {
    switch (mapping.source) {
      case 'pipeline_input':
        return this.getNestedValue(input, mapping.path) || mapping.defaultValue;
      case 'previous_stage':
        return this.getNestedValue(context.accumulator, mapping.path) || mapping.defaultValue;
      case 'constant':
        return mapping.defaultValue;
      case 'environment':
        return process.env[mapping.path] || mapping.defaultValue;
      default:
        return input;
    }
  }

  private mapStageOutput(
    output: any,
    mapping: OutputMapping,
    context: PipelineExecutionContext
  ): any {
    switch (mapping.target) {
      case 'pipeline_output':
        return this.setNestedValue({}, mapping.path, output);
      case 'next_stage':
        this.setNestedValue(context.accumulator, mapping.path, output);
        return context.accumulator;
      case 'accumulator':
        context.accumulator[mapping.path] = output;
        return context.accumulator;
      default:
        return output;
    }
  }

  private evaluateStageConditions(
    conditions: StageCondition[],
    input: any,
    context: PipelineExecutionContext
  ): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(input, condition.field);

      switch (condition.operator) {
        case 'eq': return value === condition.value;
        case 'ne': return value !== condition.value;
        case 'gt': return value > condition.value;
        case 'lt': return value < condition.value;
        case 'gte': return value >= condition.value;
        case 'lte': return value <= condition.value;
        case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
        case 'contains': return String(value).includes(String(condition.value));
        default: return true;
      }
    });
  }

  private async callAlgorithm(
    algorithmId: string,
    input: any,
    context: AlgorithmContext
  ): Promise<AlgorithmResult> {
    // This would integrate with the actual algorithm orchestrator
    // For now, simulate algorithm execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    return {
      success: Math.random() > 0.1, // 90% success rate
      data: { result: `Processed by ${algorithmId} `, input },
      executionTime: Math.random() * 1000 + 500,
      algorithmVersion: '1.0.0',
      metadata: { algorithmId },
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
    return obj;
  }

  private updatePipelineMetrics(
    pipelineId: string,
    executionTime: number,
    success: boolean
  ): void {
    const metrics = this.metrics.get(pipelineId);
    if (!metrics) return;

    metrics.totalExecutions++;
    if (success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    metrics.averageExecutionTime =
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) /
      metrics.totalExecutions;

    metrics.lastExecutionTime = new Date();
    metrics.errorRate = metrics.failedExecutions / metrics.totalExecutions;
  }

  private updateStageMetrics(
    pipelineId: string,
    stageId: string,
    executionTime: number,
    success: boolean
  ): void {
    const pipelineMetrics = this.metrics.get(pipelineId);
    if (!pipelineMetrics) return;

    let stageMetrics = pipelineMetrics.stageMetrics.get(stageId);
    if (!stageMetrics) {
      stageMetrics = {
        totalExecutions: 0,
        averageExecutionTime: 0,
        errorRate: 0,
      };
      pipelineMetrics.stageMetrics.set(stageId, stageMetrics);
    }

    stageMetrics.totalExecutions++;
    stageMetrics.averageExecutionTime =
      (stageMetrics.averageExecutionTime * (stageMetrics.totalExecutions - 1) + executionTime) /
      stageMetrics.totalExecutions;

    if (!success) {
      stageMetrics.errorRate =
        (stageMetrics.errorRate * (stageMetrics.totalExecutions - 1) + 1) /
        stageMetrics.totalExecutions;
    }
  }

  private async queuePipelineExecution(
    context: PipelineExecutionContext
  ): Promise<PipelineExecutionResult> {
    this.executionQueue.push(context);

    return {
      success: false,
      error: 'Pipeline execution queued due to capacity limits',
      executionTime: 0,
      stageResults: new Map(),
      pipelineVersion: this.pipelines.get(context.pipelineId)?.version || 'unknown',
      metadata: { queued: true, queuePosition: this.executionQueue.length },
    };
  }

  private startPipelineEngine(): void {
    this.isRunning = true;

    // Process queue every 100ms
    setInterval(() => this.processQueue(), 100);

    logger.info('Algorithm pipeline engine started');
  }

  private async processQueue(): Promise<void> {
    if (!this.isRunning || this.currentExecutions >= this.maxConcurrentPipelines) {
      return;
    }

    const queuedExecution = this.executionQueue.shift();
    if (queuedExecution) {
      const pipeline = this.pipelines.get(queuedExecution.pipelineId);
      if (pipeline) {
        this.executeImmediate(queuedExecution, pipeline);
      }
    }
  }

  private async validatePipelineDefinition(definition: PipelineDefinition): Promise<void> {
    if (!definition.id || !definition.name || !definition.version) {
      throw new Error('Pipeline definition must include id, name, and version');
    }

    if (!definition.stages || definition.stages.length === 0) {
      throw new Error('Pipeline must have at least one stage');
    }

    // Validate stage dependencies
    const stageIds = new Set(definition.stages.map(s => s.id));
    for (const stage of definition.stages) {
      for (const dependency of stage.dependencies) {
        if (!stageIds.has(dependency)) {
          throw new Error(`Stage ${stage.id} has invalid dependency: ${dependency} `);
        }
      }
    }

    // Check for circular dependencies
    this.checkCircularDependencies(definition.stages);
  }

  private checkCircularDependencies(stages: PipelineStage[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stageId: string): boolean => {
      if (recursionStack.has(stageId)) return true;
      if (visited.has(stageId)) return false;

      visited.add(stageId);
      recursionStack.add(stageId);

      const stage = stages.find(s => s.id === stageId);
      if (stage) {
        for (const dependency of stage.dependencies) {
          if (hasCycle(dependency)) return true;
        }
      }

      recursionStack.delete(stageId);
      return false;
    };

    for (const stage of stages) {
      if (hasCycle(stage.id)) {
        throw new Error(`Circular dependency detected involving stage: ${stage.id} `);
      }
    }
  }
}

// Export singleton instance
export const algorithmPipeline = new AlgorithmPipeline();
