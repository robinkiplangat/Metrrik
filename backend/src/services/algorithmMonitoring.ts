import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { performance } from 'perf_hooks';
import {
  AlgorithmMetrics,
  AlgorithmContext,
  AlgorithmResult
} from './algorithmOrchestrator';

// Real-time metrics
export interface RealTimeMetrics {
  algorithmId: string;
  timestamp: Date;
  activeExecutions: number;
  queuedExecutions: number;
  throughput: number; // executions per minute
  averageResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  customMetrics: Record<string, number>;
}

// Performance alert
export interface PerformanceAlert {
  id: string;
  algorithmId: string;
  type: 'error_rate' | 'response_time' | 'throughput' | 'resource_usage' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

// Performance threshold
export interface PerformanceThreshold {
  algorithmId: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

// Performance dashboard data
export interface DashboardData {
  algorithmId: string;
  timeRange: '1h' | '24h' | '7d' | '30d';
  metrics: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
  timeSeries: {
    timestamp: Date;
    executions: number;
    responseTime: number;
    errors: number;
  }[];
  alerts: PerformanceAlert[];
  healthScore: number;
}

// World-class Algorithm Performance Monitoring
export class AlgorithmMonitoring extends EventEmitter {
  private metrics: Map<string, RealTimeMetrics[]> = new Map();
  private alerts: Map<string, PerformanceAlert[]> = new Map();
  private thresholds: Map<string, PerformanceThreshold[]> = new Map();
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsRetentionDays = 30;
  private maxMetricsPerAlgorithm = 10000;

  constructor() {
    super();
    this.startMonitoring();
  }

  // Start real-time monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Collect metrics every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    logger.info('Algorithm performance monitoring started');
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info('Algorithm performance monitoring stopped');
  }

  // Record algorithm execution
  recordExecution(
    algorithmId: string,
    context: AlgorithmContext,
    result: AlgorithmResult,
    executionTime: number
  ): void {
    try {
      // Update real-time metrics
      this.updateRealTimeMetrics(algorithmId, result, executionTime);

      // Check performance thresholds
      this.checkPerformanceThresholds(algorithmId, result, executionTime);

      // Emit execution event
      this.emit('executionRecorded', {
        algorithmId,
        context,
        result,
        executionTime,
        timestamp: new Date(),
      });

    } catch (error: any) {
      logger.error('Failed to record algorithm execution', {
        algorithmId,
        error: error.message,
      });
    }
  }

  // Get real-time metrics for an algorithm
  getRealTimeMetrics(algorithmId: string, timeRange: number = 3600000): RealTimeMetrics[] {
    const algorithmMetrics = this.metrics.get(algorithmId) || [];
    const cutoffTime = new Date(Date.now() - timeRange);

    return algorithmMetrics.filter(metric => metric.timestamp >= cutoffTime);
  }

  // Get performance dashboard data
  getDashboardData(algorithmId: string, timeRange: '1h' | '24h' | '7d' | '30d'): DashboardData {
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const realTimeMetrics = this.getRealTimeMetrics(algorithmId, timeRangeMs);
    const alerts = this.getActiveAlerts(algorithmId);

    // Calculate aggregated metrics
    const totalExecutions = realTimeMetrics.reduce((sum, m) => sum + m.throughput, 0);
    const totalErrors = realTimeMetrics.reduce((sum, m) => sum + (m.throughput * m.errorRate), 0);
    const successfulExecutions = totalExecutions - totalErrors;
    const averageResponseTime = realTimeMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / realTimeMetrics.length || 0;
    const errorRate = totalExecutions > 0 ? totalErrors / totalExecutions : 0;
    const availability = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100;

    // Calculate percentiles
    const responseTimes = realTimeMetrics.map(m => m.averageResponseTime).sort((a, b) => a - b);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    // Create time series data
    const timeSeries = this.createTimeSeries(realTimeMetrics, timeRangeMs);

    // Calculate health score
    const healthScore = this.calculateHealthScore({
      errorRate,
      averageResponseTime,
      availability,
      alerts: alerts.length,
    });

    return {
      algorithmId,
      timeRange,
      metrics: {
        totalExecutions,
        successfulExecutions,
        failedExecutions: totalErrors,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        throughput: totalExecutions / (timeRangeMs / 60000), // per minute
        errorRate,
        availability,
      },
      timeSeries,
      alerts,
      healthScore,
    };
  }

  // Set performance threshold
  setPerformanceThreshold(threshold: PerformanceThreshold): void {
    const algorithmThresholds = this.thresholds.get(threshold.algorithmId) || [];

    // Remove existing threshold for same metric
    const filteredThresholds = algorithmThresholds.filter(
      t => t.metric !== threshold.metric
    );

    filteredThresholds.push(threshold);
    this.thresholds.set(threshold.algorithmId, filteredThresholds);

    logger.info('Performance threshold set', {
      algorithmId: threshold.algorithmId,
      metric: threshold.metric,
      threshold: threshold.threshold,
      severity: threshold.severity,
    });
  }

  // Get active alerts
  getActiveAlerts(algorithmId: string): PerformanceAlert[] {
    const algorithmAlerts = this.alerts.get(algorithmId) || [];
    return algorithmAlerts.filter(alert => !alert.resolved);
  }

  // Resolve alert
  resolveAlert(algorithmId: string, alertId: string): void {
    const algorithmAlerts = this.alerts.get(algorithmId) || [];
    const alert = algorithmAlerts.find(a => a.id === alertId);

    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      logger.info('Performance alert resolved', {
        algorithmId,
        alertId,
        alertType: alert.type,
        severity: alert.severity,
      });
    }
  }

  // Get algorithm health score
  getAlgorithmHealthScore(algorithmId: string): number {
    const dashboardData = this.getDashboardData(algorithmId, '24h');
    return dashboardData.healthScore;
  }

  // Get system-wide metrics
  getSystemMetrics(): {
    totalAlgorithms: number;
    totalExecutions: number;
    systemHealthScore: number;
    criticalAlerts: number;
    averageResponseTime: number;
    totalThroughput: number;
  } {
    const algorithmIds = Array.from(this.metrics.keys());
    let totalExecutions = 0;
    let totalResponseTime = 0;
    let totalThroughput = 0;
    let criticalAlerts = 0;
    let healthScores: number[] = [];

    algorithmIds.forEach(algorithmId => {
      const dashboardData = this.getDashboardData(algorithmId, '24h');
      totalExecutions += dashboardData.metrics.totalExecutions;
      totalResponseTime += dashboardData.metrics.averageResponseTime;
      totalThroughput += dashboardData.metrics.throughput;
      criticalAlerts += dashboardData.alerts.filter(a => a.severity === 'critical').length;
      healthScores.push(dashboardData.healthScore);
    });

    const systemHealthScore = healthScores.length > 0
      ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
      : 100;

    return {
      totalAlgorithms: algorithmIds.length,
      totalExecutions,
      systemHealthScore,
      criticalAlerts,
      averageResponseTime: algorithmIds.length > 0 ? totalResponseTime / algorithmIds.length : 0,
      totalThroughput,
    };
  }

  // Private methods
  private updateRealTimeMetrics(
    algorithmId: string,
    result: AlgorithmResult,
    executionTime: number
  ): void {
    const now = new Date();
    const algorithmMetrics = this.metrics.get(algorithmId) || [];

    // Get or create current metrics entry
    let currentMetrics = algorithmMetrics.find(m =>
      Math.abs(m.timestamp.getTime() - now.getTime()) < 10000 // Within 10 seconds
    );

    if (!currentMetrics) {
      currentMetrics = {
        algorithmId,
        timestamp: now,
        activeExecutions: 0,
        queuedExecutions: 0,
        throughput: 0,
        averageResponseTime: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        customMetrics: {},
      };
      algorithmMetrics.push(currentMetrics);
    }

    // Update metrics
    currentMetrics.throughput += 1;
    currentMetrics.averageResponseTime =
      (currentMetrics.averageResponseTime + executionTime) / 2;

    if (!result.success) {
      currentMetrics.errorRate =
        (currentMetrics.errorRate + 1) / currentMetrics.throughput;
    }

    // Clean up old metrics
    this.cleanupOldMetrics(algorithmId, algorithmMetrics);

    this.metrics.set(algorithmId, algorithmMetrics);
  }

  private checkPerformanceThresholds(
    algorithmId: string,
    result: AlgorithmResult,
    executionTime: number
  ): void {
    const thresholds = this.thresholds.get(algorithmId) || [];

    thresholds.forEach(threshold => {
      if (!threshold.enabled) return;

      let currentValue: number;
      let shouldAlert = false;

      switch (threshold.metric) {
        case 'error_rate':
          currentValue = result.success ? 0 : 1;
          break;
        case 'response_time':
          currentValue = executionTime;
          break;
        case 'throughput':
          // This would need to be calculated over a time window
          currentValue = 1; // Simplified
          break;
        default:
          return;
      }

      // Check threshold condition
      switch (threshold.operator) {
        case 'gt':
          shouldAlert = currentValue > threshold.threshold;
          break;
        case 'lt':
          shouldAlert = currentValue < threshold.threshold;
          break;
        case 'gte':
          shouldAlert = currentValue >= threshold.threshold;
          break;
        case 'lte':
          shouldAlert = currentValue <= threshold.threshold;
          break;
        case 'eq':
          shouldAlert = currentValue === threshold.threshold;
          break;
      }

      if (shouldAlert) {
        this.createAlert(algorithmId, threshold, currentValue);
      }
    });
  }

  private createAlert(
    algorithmId: string,
    threshold: PerformanceThreshold,
    currentValue: number
  ): void {
    const alert: PerformanceAlert = {
      id: `${algorithmId}-${threshold.metric}-${Date.now()}`,
      algorithmId,
      type: threshold.metric as any,
      severity: threshold.severity,
      message: `${threshold.metric} threshold exceeded: ${currentValue} ${threshold.operator} ${threshold.threshold}`,
      threshold: threshold.threshold,
      currentValue,
      timestamp: new Date(),
      resolved: false,
    };

    const algorithmAlerts = this.alerts.get(algorithmId) || [];
    algorithmAlerts.push(alert);
    this.alerts.set(algorithmId, algorithmAlerts);

    // Emit alert event
    this.emit('performanceAlert', alert);

    logger.warn('Performance alert triggered', {
      algorithmId,
      alertType: alert.type,
      severity: alert.severity,
      currentValue,
      threshold: threshold.threshold,
    });
  }

  private collectSystemMetrics(): void {
    // Collect system-wide metrics (CPU, memory, etc.)
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    // Update all algorithm metrics with system information
    this.metrics.forEach((algorithmMetrics, algorithmId) => {
      const latestMetrics = algorithmMetrics[algorithmMetrics.length - 1];
      if (latestMetrics) {
        latestMetrics.cpuUsage = cpuUsage.user / 1000000; // Convert to seconds
        latestMetrics.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // Convert to MB
      }
    });
  }

  private cleanupOldMetrics(algorithmId: string, metrics: RealTimeMetrics[]): void {
    const cutoffTime = new Date(Date.now() - (this.metricsRetentionDays * 24 * 60 * 60 * 1000));
    const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffTime);

    // Keep only the most recent metrics if we exceed the limit
    if (filteredMetrics.length > this.maxMetricsPerAlgorithm) {
      const sortedMetrics = filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      this.metrics.set(algorithmId, sortedMetrics.slice(0, this.maxMetricsPerAlgorithm));
    } else {
      this.metrics.set(algorithmId, filteredMetrics);
    }
  }

  private getTimeRangeMs(timeRange: '1h' | '24h' | '7d' | '30d'): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private createTimeSeries(metrics: RealTimeMetrics[], timeRangeMs: number) {
    const interval = Math.max(60000, timeRangeMs / 100); // At least 1 minute intervals
    const buckets: { [key: number]: { executions: number; responseTime: number; errors: number } } = {};

    metrics.forEach(metric => {
      const bucketTime = Math.floor(metric.timestamp.getTime() / interval) * interval;
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = { executions: 0, responseTime: 0, errors: 0 };
      }

      buckets[bucketTime].executions += metric.throughput;
      buckets[bucketTime].responseTime += metric.averageResponseTime * metric.throughput;
      buckets[bucketTime].errors += metric.throughput * metric.errorRate;
    });

    return Object.entries(buckets).map(([timestamp, data]) => ({
      timestamp: new Date(parseInt(timestamp)),
      executions: data.executions,
      responseTime: data.executions > 0 ? data.responseTime / data.executions : 0,
      errors: data.errors,
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private calculateHealthScore(metrics: {
    errorRate: number;
    averageResponseTime: number;
    availability: number;
    alerts: number;
  }): number {
    let score = 100;

    // Deduct points for error rate
    score -= Math.min(50, metrics.errorRate * 100);

    // Deduct points for slow response time (assuming 5s is max acceptable)
    if (metrics.averageResponseTime > 5000) {
      score -= Math.min(30, (metrics.averageResponseTime - 5000) / 100);
    }

    // Deduct points for low availability
    score -= (100 - metrics.availability) * 0.5;

    // Deduct points for alerts
    score -= Math.min(20, metrics.alerts * 5);

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton instance
export const algorithmMonitoring = new AlgorithmMonitoring();
