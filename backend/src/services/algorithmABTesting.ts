import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import { AlgorithmResult, AlgorithmContext } from './algorithmOrchestrator';

// A/B Test definition
export interface ABTestDefinition {
  id: string;
  name: string;
  description: string;
  algorithmId: string;
  variants: AlgorithmVariant[];
  trafficAllocation: TrafficAllocation;
  targeting: TargetingRules;
  metrics: TestMetrics;
  status: TestStatus;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  metadata: Record<string, any>;
}

// Algorithm variant
export interface AlgorithmVariant {
  id: string;
  name: string;
  algorithmId: string;
  version: string;
  configuration: Record<string, any>;
  weight: number; // Traffic percentage (0-100)
  isControl: boolean;
  metadata: Record<string, any>;
}

// Traffic allocation
export interface TrafficAllocation {
  totalTraffic: number; // Percentage of total traffic to include in test (0-100)
  variantAllocation: Map<string, number>; // Variant ID -> percentage
  rampUpStrategy: 'immediate' | 'gradual' | 'custom';
  rampUpDuration?: number; // Hours
  customRampUp?: { day: number; percentage: number }[];
}

// Targeting rules
export interface TargetingRules {
  userSegments: string[];
  geographicRegions: string[];
  deviceTypes: string[];
  customRules: TargetingRule[];
  excludeUsers: string[];
  includeUsers: string[];
}

// Targeting rule
export interface TargetingRule {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'regex';
  value: any;
  logic: 'and' | 'or';
}

// Test metrics
export interface TestMetrics {
  primaryMetric: string;
  secondaryMetrics: string[];
  successCriteria: SuccessCriteria;
  statisticalSignificance: number; // 0.95 for 95% confidence
  minimumSampleSize: number;
  maximumDuration: number; // Hours
}

// Success criteria
export interface SuccessCriteria {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  improvement: number; // Minimum improvement percentage
}

// Test status
export enum TestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Test execution result
export interface TestExecutionResult {
  testId: string;
  variantId: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  input: any;
  result: AlgorithmResult;
  executionTime: number;
  metadata: Record<string, any>;
}

// Test statistics
export interface TestStatistics {
  testId: string;
  variantId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageConfidence: number;
  conversionRate: number;
  customMetrics: Record<string, number>;
  statisticalSignificance: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  pValue: number;
  isSignificant: boolean;
  recommendation: 'continue' | 'stop' | 'extend' | 'deploy';
}

// Test recommendation
export interface TestRecommendation {
  testId: string;
  recommendation: 'continue' | 'stop' | 'extend' | 'deploy';
  confidence: number;
  reasoning: string;
  metrics: {
    primaryMetric: number;
    improvement: number;
    statisticalSignificance: number;
  };
  nextSteps: string[];
}

// World-class A/B Testing Framework
export class AlgorithmABTesting extends EventEmitter {
  private tests: Map<string, ABTestDefinition> = new Map();
  private executions: Map<string, TestExecutionResult[]> = new Map();
  private userAssignments: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variantId
  private isRunning = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startAnalysisEngine();
  }

  // Create a new A/B test
  async createTest(definition: ABTestDefinition): Promise<string> {
    try {
      // Validate test definition
      await this.validateTestDefinition(definition);

      // Initialize test
      definition.id = definition.id || uuidv4();
      definition.status = TestStatus.DRAFT;
      definition.createdAt = new Date();

      // Initialize execution tracking
      this.executions.set(definition.id, []);

      // Store test
      this.tests.set(definition.id, definition);

      logger.info('A/B test created', {
        testId: definition.id,
        name: definition.name,
        algorithmId: definition.algorithmId,
        variantCount: definition.variants.length,
        createdBy: definition.createdBy,
      });

      this.emit('testCreated', definition);
      return definition.id;

    } catch (error) {
      logger.error('Failed to create A/B test', {
        testName: definition.name,
        error: error.message,
      });
      throw error;
    }
  }

  // Start an A/B test
  async startTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== TestStatus.DRAFT) {
      throw new Error(`Test ${testId} is not in draft status`);
    }

    test.status = TestStatus.RUNNING;
    test.startDate = new Date();

    logger.info('A/B test started', {
      testId,
      name: test.name,
      startDate: test.startDate,
    });

    this.emit('testStarted', test);
  }

  // Stop an A/B test
  async stopTest(testId: string, reason: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = TestStatus.COMPLETED;
    test.endDate = new Date();

    logger.info('A/B test stopped', {
      testId,
      name: test.name,
      endDate: test.endDate,
      reason,
    });

    this.emit('testStopped', test);
  }

  // Execute algorithm with A/B testing
  async executeWithABTest(
    testId: string,
    input: any,
    context: AlgorithmContext
  ): Promise<TestExecutionResult> {
    const startTime = performance.now();

    try {
      const test = this.tests.get(testId);
      if (!test) {
        throw new Error(`Test ${testId} not found`);
      }

      if (test.status !== TestStatus.RUNNING) {
        throw new Error(`Test ${testId} is not running`);
      }

      // Check if user should be included in test
      if (!this.shouldIncludeUser(test, context)) {
        throw new Error('User not eligible for test');
      }

      // Get or assign variant
      const variantId = this.getUserVariant(test, context.userId);
      const variant = test.variants.find(v => v.id === variantId);
      if (!variant) {
        throw new Error(`Variant ${variantId} not found`);
      }

      // Execute algorithm with variant configuration
      const result = await this.executeVariant(variant, input, context);
      const executionTime = performance.now() - startTime;

      // Record execution
      const executionResult: TestExecutionResult = {
        testId,
        variantId,
        userId: context.userId,
        sessionId: context.correlationId,
        timestamp: new Date(),
        input,
        result,
        executionTime,
        metadata: {
          testName: test.name,
          variantName: variant.name,
          isControl: variant.isControl,
        },
      };

      this.recordExecution(executionResult);

      logger.info('A/B test execution recorded', {
        testId,
        variantId,
        userId: context.userId,
        success: result.success,
        executionTime,
      });

      return executionResult;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      logger.error('A/B test execution failed', {
        testId,
        userId: context.userId,
        error: error.message,
        executionTime,
      });

      throw error;
    }
  }

  // Get test statistics
  getTestStatistics(testId: string): TestStatistics[] {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const executions = this.executions.get(testId) || [];
    const statistics: TestStatistics[] = [];

    for (const variant of test.variants) {
      const variantExecutions = executions.filter(e => e.variantId === variant.id);
      const stats = this.calculateVariantStatistics(test, variant, variantExecutions);
      statistics.push(stats);
    }

    return statistics;
  }

  // Get test recommendation
  getTestRecommendation(testId: string): TestRecommendation {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const statistics = this.getTestStatistics(testId);
    const controlStats = statistics.find(s => 
      test.variants.find(v => v.id === s.variantId)?.isControl
    );
    const treatmentStats = statistics.filter(s => 
      !test.variants.find(v => v.id === s.variantId)?.isControl
    );

    if (!controlStats || treatmentStats.length === 0) {
      throw new Error('Test must have both control and treatment variants');
    }

    // Calculate improvement
    const bestTreatment = treatmentStats.reduce((best, current) => 
      current.customMetrics[test.metrics.primaryMetric] > 
      best.customMetrics[test.metrics.primaryMetric] ? current : best
    );

    const improvement = 
      (bestTreatment.customMetrics[test.metrics.primaryMetric] - 
       controlStats.customMetrics[test.metrics.primaryMetric]) /
      controlStats.customMetrics[test.metrics.primaryMetric] * 100;

    // Determine recommendation
    let recommendation: 'continue' | 'stop' | 'extend' | 'deploy';
    let reasoning: string;
    let confidence: number;

    if (bestTreatment.isSignificant && improvement >= test.metrics.successCriteria.improvement) {
      recommendation = 'deploy';
      reasoning = `Treatment variant shows ${improvement.toFixed(2)}% improvement with statistical significance`;
      confidence = bestTreatment.statisticalSignificance;
    } else if (bestTreatment.isSignificant && improvement < 0) {
      recommendation = 'stop';
      reasoning = 'Treatment variant shows negative impact with statistical significance';
      confidence = bestTreatment.statisticalSignificance;
    } else if (!bestTreatment.isSignificant && improvement > 0) {
      recommendation = 'extend';
      reasoning = 'Treatment variant shows improvement but needs more data for significance';
      confidence = bestTreatment.statisticalSignificance;
    } else {
      recommendation = 'continue';
      reasoning = 'Test needs more time to reach statistical significance';
      confidence = bestTreatment.statisticalSignificance;
    }

    return {
      testId,
      recommendation,
      confidence,
      reasoning,
      metrics: {
        primaryMetric: bestTreatment.customMetrics[test.metrics.primaryMetric],
        improvement,
        statisticalSignificance: bestTreatment.statisticalSignificance,
      },
      nextSteps: this.generateNextSteps(recommendation, test),
    };
  }

  // Get all active tests
  getActiveTests(): ABTestDefinition[] {
    return Array.from(this.tests.values()).filter(
      test => test.status === TestStatus.RUNNING
    );
  }

  // Get user's variant assignment
  getUserVariant(testId: string, userId: string): string | null {
    const userTests = this.userAssignments.get(userId);
    if (!userTests) return null;

    return userTests.get(testId) || null;
  }

  // Private methods
  private shouldIncludeUser(test: ABTestDefinition, context: AlgorithmContext): boolean {
    // Check traffic allocation
    if (Math.random() * 100 > test.trafficAllocation.totalTraffic) {
      return false;
    }

    // Check targeting rules
    if (!this.evaluateTargetingRules(test.targeting, context)) {
      return false;
    }

    // Check exclude/include lists
    if (test.targeting.excludeUsers.includes(context.userId)) {
      return false;
    }

    if (test.targeting.includeUsers.length > 0 && 
        !test.targeting.includeUsers.includes(context.userId)) {
      return false;
    }

    return true;
  }

  private evaluateTargetingRules(targeting: TargetingRules, context: AlgorithmContext): boolean {
    // Evaluate custom rules
    for (const rule of targeting.customRules) {
      const value = this.getNestedValue(context.metadata, rule.field);
      const matches = this.evaluateRule(rule, value);
      
      if (rule.logic === 'and' && !matches) return false;
      if (rule.logic === 'or' && matches) return true;
    }

    return targeting.customRules.length === 0 || 
           targeting.customRules.every(rule => rule.logic === 'and');
  }

  private evaluateRule(rule: TargetingRule, value: any): boolean {
    switch (rule.operator) {
      case 'eq': return value === rule.value;
      case 'ne': return value !== rule.value;
      case 'gt': return value > rule.value;
      case 'lt': return value < rule.value;
      case 'gte': return value >= rule.value;
      case 'lte': return value <= rule.value;
      case 'in': return Array.isArray(rule.value) && rule.value.includes(value);
      case 'contains': return String(value).includes(String(rule.value));
      case 'regex': return new RegExp(rule.value).test(String(value));
      default: return true;
    }
  }

  private getUserVariant(test: ABTestDefinition, userId: string): string {
    // Check if user already has an assignment
    const existingAssignment = this.getUserVariant(test.id, userId);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Assign variant based on weights
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (random <= cumulativeWeight) {
        // Store assignment
        let userTests = this.userAssignments.get(userId);
        if (!userTests) {
          userTests = new Map();
          this.userAssignments.set(userId, userTests);
        }
        userTests.set(test.id, variant.id);

        return variant.id;
      }
    }

    // Fallback to first variant
    return test.variants[0].id;
  }

  private async executeVariant(
    variant: AlgorithmVariant,
    input: any,
    context: AlgorithmContext
  ): Promise<AlgorithmResult> {
    // This would integrate with the actual algorithm orchestrator
    // For now, simulate execution with variant configuration
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate different performance based on variant
    const basePerformance = 0.9;
    const variantBoost = variant.isControl ? 0 : Math.random() * 0.1;
    const success = Math.random() < (basePerformance + variantBoost);
    
    return {
      success,
      data: { 
        result: `Processed by ${variant.algorithmId} v${variant.version}`,
        variant: variant.name,
        configuration: variant.configuration,
        input 
      },
      executionTime: Math.random() * 1000 + 500,
      algorithmVersion: variant.version,
      confidence: success ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.3,
      metadata: { 
        variantId: variant.id,
        isControl: variant.isControl,
        configuration: variant.configuration 
      },
    };
  }

  private recordExecution(execution: TestExecutionResult): void {
    const executions = this.executions.get(execution.testId) || [];
    executions.push(execution);
    this.executions.set(execution.testId, executions);

    this.emit('executionRecorded', execution);
  }

  private calculateVariantStatistics(
    test: ABTestDefinition,
    variant: AlgorithmVariant,
    executions: TestExecutionResult[]
  ): TestStatistics {
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.result.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    
    const averageExecutionTime = executions.reduce((sum, e) => sum + e.executionTime, 0) / totalExecutions || 0;
    const averageConfidence = executions.reduce((sum, e) => sum + (e.result.confidence || 0), 0) / totalExecutions || 0;
    
    // Calculate custom metrics
    const customMetrics: Record<string, number> = {};
    for (const metric of [test.metrics.primaryMetric, ...test.metrics.secondaryMetrics]) {
      customMetrics[metric] = this.calculateMetric(executions, metric);
    }

    // Calculate statistical significance (simplified)
    const statisticalSignificance = this.calculateStatisticalSignificance(executions, test);
    const pValue = 1 - statisticalSignificance;
    const isSignificant = statisticalSignificance >= test.metrics.statisticalSignificance;

    // Calculate confidence interval (simplified)
    const confidenceInterval = this.calculateConfidenceInterval(executions, test.metrics.primaryMetric);

    return {
      testId: test.id,
      variantId: variant.id,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      averageConfidence,
      conversionRate: successfulExecutions / totalExecutions || 0,
      customMetrics,
      statisticalSignificance,
      confidenceInterval,
      pValue,
      isSignificant,
      recommendation: isSignificant ? 'deploy' : 'continue',
    };
  }

  private calculateMetric(executions: TestExecutionResult[], metric: string): number {
    // Simplified metric calculation
    switch (metric) {
      case 'success_rate':
        return executions.filter(e => e.result.success).length / executions.length || 0;
      case 'average_confidence':
        return executions.reduce((sum, e) => sum + (e.result.confidence || 0), 0) / executions.length || 0;
      case 'average_execution_time':
        return executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length || 0;
      default:
        return 0;
    }
  }

  private calculateStatisticalSignificance(executions: TestExecutionResult[], test: ABTestDefinition): number {
    // Simplified statistical significance calculation
    // In production, this would use proper statistical tests (t-test, chi-square, etc.)
    const sampleSize = executions.length;
    const minimumSampleSize = test.metrics.minimumSampleSize;
    
    if (sampleSize < minimumSampleSize) {
      return 0.5; // Not enough data
    }

    // Simulate significance based on sample size and variance
    const baseSignificance = Math.min(0.99, 0.5 + (sampleSize / minimumSampleSize) * 0.3);
    return baseSignificance + (Math.random() - 0.5) * 0.1;
  }

  private calculateConfidenceInterval(executions: TestExecutionResult[], metric: string): { lower: number; upper: number } {
    // Simplified confidence interval calculation
    const values = executions.map(e => this.calculateMetric([e], metric));
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length || 0;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length || 0);
    
    const margin = 1.96 * stdDev / Math.sqrt(values.length || 1); // 95% confidence
    
    return {
      lower: Math.max(0, mean - margin),
      upper: mean + margin,
    };
  }

  private generateNextSteps(recommendation: string, test: ABTestDefinition): string[] {
    switch (recommendation) {
      case 'deploy':
        return [
          'Deploy winning variant to production',
          'Monitor performance in production',
          'Archive test results',
        ];
      case 'stop':
        return [
          'Stop test immediately',
          'Analyze why treatment performed worse',
          'Consider alternative approaches',
        ];
      case 'extend':
        return [
          'Continue test for more data',
          'Monitor for statistical significance',
          'Consider increasing traffic allocation',
        ];
      case 'continue':
        return [
          'Continue test as planned',
          'Monitor sample size requirements',
          'Review test configuration',
        ];
      default:
        return [];
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async validateTestDefinition(definition: ABTestDefinition): Promise<void> {
    if (!definition.name || !definition.algorithmId || !definition.variants) {
      throw new Error('Test definition must include name, algorithmId, and variants');
    }

    if (definition.variants.length < 2) {
      throw new Error('Test must have at least 2 variants');
    }

    const controlVariants = definition.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Test must have exactly one control variant');
    }

    const totalWeight = definition.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100%');
    }
  }

  private startAnalysisEngine(): void {
    this.isRunning = true;
    
    // Analyze tests every 5 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeActiveTests();
    }, 5 * 60 * 1000);
    
    logger.info('A/B testing analysis engine started');
  }

  private analyzeActiveTests(): void {
    const activeTests = this.getActiveTests();
    
    for (const test of activeTests) {
      try {
        const recommendation = this.getTestRecommendation(test.id);
        
        // Check if test should be stopped
        if (recommendation.recommendation === 'stop' || 
            recommendation.recommendation === 'deploy') {
          this.stopTest(test.id, `Automatic stop: ${recommendation.reasoning}`);
        }
        
        // Emit analysis event
        this.emit('testAnalyzed', {
          testId: test.id,
          recommendation,
          statistics: this.getTestStatistics(test.id),
        });
        
      } catch (error) {
        logger.error('Failed to analyze test', {
          testId: test.id,
          error: error.message,
        });
      }
    }
  }
}

// Export singleton instance
export const algorithmABTesting = new AlgorithmABTesting();
