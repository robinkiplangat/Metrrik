import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  AlgorithmMetrics, 
  AlgorithmContext, 
  AlgorithmResult,
  AlgorithmCategory 
} from './algorithmOrchestrator';
import { 
  RealTimeMetrics, 
  PerformanceAlert, 
  DashboardData 
} from './algorithmMonitoring';
import { 
  TestStatistics, 
  TestRecommendation 
} from './algorithmABTesting';

// Analytics dashboard data
export interface AnalyticsDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshInterval: number; // seconds
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
}

// Dashboard widget
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: WidgetConfiguration;
  dataSource: DataSource;
  refreshInterval: number;
  isVisible: boolean;
}

// Widget types
export enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  ALERT_LIST = 'alert_list',
  HEALTH_SCORE = 'health_score',
  TOP_LIST = 'top_list',
  GAUGE = 'gauge',
  SCATTER_PLOT = 'scatter_plot',
  FUNNEL = 'funnel',
}

// Widget configuration
export interface WidgetConfiguration {
  metric: string;
  timeRange: '1h' | '24h' | '7d' | '30d' | '90d';
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'p95' | 'p99';
  groupBy?: string;
  filters?: Record<string, any>;
  thresholds?: {
    warning: number;
    critical: number;
  };
  colors?: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };
}

// Data source
export interface DataSource {
  type: 'algorithm' | 'pipeline' | 'ab_test' | 'system' | 'custom';
  sourceId: string;
  query: string;
  parameters: Record<string, any>;
}

// Dashboard filter
export interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'date_range' | 'text' | 'number';
  field: string;
  options?: any[];
  defaultValue?: any;
  isRequired: boolean;
}

// Analytics report
export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  type: 'performance' | 'usage' | 'quality' | 'cost' | 'custom';
  algorithmIds: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    timezone: string;
  };
  recipients: string[];
  isActive: boolean;
  lastGenerated?: Date;
  nextGeneration?: Date;
}

// Analytics insights
export interface AnalyticsInsight {
  id: string;
  type: 'performance' | 'anomaly' | 'trend' | 'recommendation' | 'alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  algorithmId: string;
  metric: string;
  value: number;
  threshold?: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  timestamp: Date;
  actionable: boolean;
  actions: string[];
  metadata: Record<string, any>;
}

// Performance comparison
export interface PerformanceComparison {
  algorithmId: string;
  baseline: {
    period: string;
    metrics: AlgorithmMetrics;
  };
  current: {
    period: string;
    metrics: AlgorithmMetrics;
  };
  changes: {
    metric: string;
    absoluteChange: number;
    percentageChange: number;
    significance: 'low' | 'medium' | 'high';
  }[];
  summary: {
    overallTrend: 'improving' | 'declining' | 'stable';
    keyInsights: string[];
    recommendations: string[];
  };
}

// World-class Algorithm Analytics System
export class AlgorithmAnalytics extends EventEmitter {
  private dashboards: Map<string, AnalyticsDashboard> = new Map();
  private reports: Map<string, AnalyticsReport> = new Map();
  private insights: Map<string, AnalyticsInsight[]> = new Map();
  private isRunning = false;
  private analysisInterval: NodeJS.Timeout | null = null;
  private reportGenerationInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startAnalyticsEngine();
  }

  // Create analytics dashboard
  async createDashboard(dashboard: AnalyticsDashboard): Promise<string> {
    try {
      dashboard.id = dashboard.id || uuidv4();
      dashboard.createdAt = new Date();
      dashboard.lastUpdated = new Date();

      this.dashboards.set(dashboard.id, dashboard);

      logger.info('Analytics dashboard created', {
        dashboardId: dashboard.id,
        name: dashboard.name,
        widgetCount: dashboard.widgets.length,
        createdBy: dashboard.createdBy,
      });

      this.emit('dashboardCreated', dashboard);
      return dashboard.id;

    } catch (error) {
      logger.error('Failed to create analytics dashboard', {
        dashboardName: dashboard.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Get dashboard data
  async getDashboardData(dashboardId: string, filters: Record<string, any> = {}): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgetData: any[] = [];

    for (const widget of dashboard.widgets) {
      if (!widget.isVisible) continue;

      try {
        const data = await this.getWidgetData(widget, filters);
        widgetData.push({
          widgetId: widget.id,
          type: widget.type,
          title: widget.title,
          data,
          configuration: widget.configuration,
        });
    } catch (error) {
      logger.error('Failed to get widget data', {
        dashboardId,
        widgetId: widget.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
        
        widgetData.push({
          widgetId: widget.id,
          type: widget.type,
          title: widget.title,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      dashboardId,
      name: dashboard.name,
      description: dashboard.description,
      widgets: widgetData,
      lastUpdated: new Date(),
    };
  }

  // Generate analytics report
  async generateReport(reportId: string): Promise<AnalyticsReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    try {
      const reportData = await this.collectReportData(report);
      
      // Update report metadata
      report.lastGenerated = new Date();
      if (report.schedule) {
        report.nextGeneration = this.calculateNextGeneration(report.schedule);
      }

      logger.info('Analytics report generated', {
        reportId,
        name: report.name,
        type: report.type,
        algorithmCount: report.algorithmIds.length,
        format: report.format,
      });

      this.emit('reportGenerated', { report, data: reportData });
      return report;

    } catch (error) {
      logger.error('Failed to generate analytics report', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Get algorithm insights
  getAlgorithmInsights(algorithmId: string, timeRange: number = 24 * 60 * 60 * 1000): AnalyticsInsight[] {
    const algorithmInsights = this.insights.get(algorithmId) || [];
    const cutoffTime = new Date(Date.now() - timeRange);
    
    return algorithmInsights.filter(insight => insight.timestamp >= cutoffTime);
  }

  // Generate performance comparison
  async generatePerformanceComparison(
    algorithmId: string,
    baselinePeriod: { start: Date; end: Date },
    currentPeriod: { start: Date; end: Date }
  ): Promise<PerformanceComparison> {
    try {
      // This would integrate with actual metrics collection
      const baselineMetrics = await this.getMetricsForPeriod(algorithmId, baselinePeriod);
      const currentMetrics = await this.getMetricsForPeriod(algorithmId, currentPeriod);

      const changes = this.calculateMetricChanges(baselineMetrics, currentMetrics);
      const summary = this.generateComparisonSummary(changes);

      return {
        algorithmId,
        baseline: {
          period: `${baselinePeriod.start.toISOString()} to ${baselinePeriod.end.toISOString()}`,
          metrics: baselineMetrics,
        },
        current: {
          period: `${currentPeriod.start.toISOString()} to ${currentPeriod.end.toISOString()}`,
          metrics: currentMetrics,
        },
        changes,
        summary,
      };

    } catch (error) {
      logger.error('Failed to generate performance comparison', {
        algorithmId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Create analytics insight
  createInsight(insight: AnalyticsInsight): void {
    insight.id = insight.id || uuidv4();
    insight.timestamp = new Date();

    const algorithmInsights = this.insights.get(insight.algorithmId) || [];
    algorithmInsights.push(insight);
    this.insights.set(insight.algorithmId, algorithmInsights);

    logger.info('Analytics insight created', {
      insightId: insight.id,
      type: insight.type,
      severity: insight.severity,
      algorithmId: insight.algorithmId,
      metric: insight.metric,
    });

    this.emit('insightCreated', insight);
  }

  // Get system-wide analytics
  getSystemAnalytics(): {
    totalAlgorithms: number;
    totalExecutions: number;
    averagePerformance: number;
    systemHealth: number;
    topPerformers: { algorithmId: string; score: number }[];
    criticalIssues: AnalyticsInsight[];
    trends: {
      metric: string;
      trend: 'up' | 'down' | 'stable';
      change: number;
    }[];
  } {
    const allInsights = Array.from(this.insights.values()).flat();
    const criticalIssues = allInsights.filter(i => i.severity === 'critical');
    
    // Calculate system health score
    const systemHealth = this.calculateSystemHealth();
    
    // Get top performers (simplified)
    const topPerformers = this.getTopPerformers();
    
    // Calculate trends (simplified)
    const trends = this.calculateSystemTrends();

    return {
      totalAlgorithms: this.insights.size,
      totalExecutions: 0, // Would be calculated from actual metrics
      averagePerformance: 85, // Would be calculated from actual metrics
      systemHealth,
      topPerformers,
      criticalIssues,
      trends,
    };
  }

  // Private methods
  private async getWidgetData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    switch (widget.type) {
      case WidgetType.METRIC_CARD:
        return this.getMetricCardData(widget, filters);
      case WidgetType.LINE_CHART:
        return this.getLineChartData(widget, filters);
      case WidgetType.BAR_CHART:
        return this.getBarChartData(widget, filters);
      case WidgetType.PIE_CHART:
        return this.getPieChartData(widget, filters);
      case WidgetType.HEATMAP:
        return this.getHeatmapData(widget, filters);
      case WidgetType.TABLE:
        return this.getTableData(widget, filters);
      case WidgetType.ALERT_LIST:
        return this.getAlertListData(widget, filters);
      case WidgetType.HEALTH_SCORE:
        return this.getHealthScoreData(widget, filters);
      case WidgetType.TOP_LIST:
        return this.getTopListData(widget, filters);
      case WidgetType.GAUGE:
        return this.getGaugeData(widget, filters);
      default:
        throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  }

  private async getMetricCardData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate metric card data
    return {
      value: Math.random() * 1000,
      change: (Math.random() - 0.5) * 20,
      changeType: Math.random() > 0.5 ? 'increase' : 'decrease',
      trend: Array.from({ length: 7 }, () => Math.random() * 100),
    };
  }

  private async getLineChartData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate line chart data
    const timeRange = this.getTimeRangeMs(widget.configuration.timeRange);
    const points = Math.min(100, timeRange / (60 * 60 * 1000)); // Max 100 points
    
    return {
      series: [
        {
          name: widget.configuration.metric,
          data: Array.from({ length: points }, (_, i) => ({
            x: new Date(Date.now() - (points - i) * timeRange / points),
            y: Math.random() * 100,
          })),
        },
      ],
    };
  }

  private async getBarChartData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate bar chart data
    const categories = ['Algorithm A', 'Algorithm B', 'Algorithm C', 'Algorithm D'];
    
    return {
      categories,
      series: [
        {
          name: widget.configuration.metric,
          data: categories.map(() => Math.random() * 100),
        },
      ],
    };
  }

  private async getPieChartData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate pie chart data
    return {
      data: [
        { name: 'Success', value: 75, color: '#4CAF50' },
        { name: 'Warning', value: 15, color: '#FF9800' },
        { name: 'Error', value: 10, color: '#F44336' },
      ],
    };
  }

  private async getHeatmapData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate heatmap data
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return {
      data: days.flatMap(day => 
        hours.map(hour => ({
          day,
          hour,
          value: Math.random() * 100,
        }))
      ),
    };
  }

  private async getTableData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate table data
    return {
      columns: ['Algorithm', 'Executions', 'Success Rate', 'Avg Time', 'Status'],
      rows: [
        ['Cost Estimation v1', 1250, '94.2%', '1.2s', 'Healthy'],
        ['Floor Plan Analysis v2', 890, '87.5%', '2.8s', 'Warning'],
        ['Document Generator v1', 2100, '98.1%', '0.8s', 'Healthy'],
        ['Material Optimizer v1', 450, '91.3%', '3.5s', 'Healthy'],
      ],
    };
  }

  private async getAlertListData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate alert list data
    return {
      alerts: [
        {
          id: '1',
          type: 'error_rate',
          severity: 'high',
          message: 'Error rate exceeded threshold for Floor Plan Analysis',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          algorithmId: 'floor-plan-analysis-v2',
        },
        {
          id: '2',
          type: 'response_time',
          severity: 'medium',
          message: 'Response time degradation detected',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          algorithmId: 'cost-estimation-v1',
        },
      ],
    };
  }

  private async getHealthScoreData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate health score data
    return {
      score: 87,
      status: 'good',
      breakdown: {
        performance: 90,
        reliability: 85,
        efficiency: 88,
        quality: 86,
      },
    };
  }

  private async getTopListData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate top list data
    return {
      items: [
        { name: 'Cost Estimation v1', value: 98.5, change: 2.1 },
        { name: 'Document Generator v1', value: 97.8, change: 1.5 },
        { name: 'Material Optimizer v1', value: 95.2, change: -0.8 },
        { name: 'Floor Plan Analysis v2', value: 89.3, change: -3.2 },
      ],
    };
  }

  private async getGaugeData(widget: DashboardWidget, filters: Record<string, any>): Promise<any> {
    // Simulate gauge data
    return {
      value: 87,
      min: 0,
      max: 100,
      thresholds: {
        warning: 70,
        critical: 50,
      },
    };
  }

  private async collectReportData(report: AnalyticsReport): Promise<any> {
    // Simulate report data collection
    return {
      reportId: report.id,
      generatedAt: new Date(),
      algorithms: report.algorithmIds.map(id => ({
        algorithmId: id,
        metrics: {
          totalExecutions: Math.floor(Math.random() * 10000),
          successRate: 85 + Math.random() * 15,
          averageResponseTime: 1000 + Math.random() * 2000,
          errorRate: Math.random() * 5,
        },
      })),
      summary: {
        totalExecutions: Math.floor(Math.random() * 50000),
        averageSuccessRate: 90 + Math.random() * 10,
        systemHealth: 85 + Math.random() * 15,
      },
    };
  }

  private calculateNextGeneration(schedule: any): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    
    if (next <= now) {
      switch (schedule.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
      }
    }
    
    return next;
  }

  private async getMetricsForPeriod(algorithmId: string, period: { start: Date; end: Date }): Promise<AlgorithmMetrics> {
    // Simulate metrics retrieval
    return {
      totalExecutions: Math.floor(Math.random() * 10000),
      successfulExecutions: Math.floor(Math.random() * 9000),
      failedExecutions: Math.floor(Math.random() * 1000),
      averageExecutionTime: 1000 + Math.random() * 2000,
      p95ExecutionTime: 2000 + Math.random() * 3000,
      p99ExecutionTime: 3000 + Math.random() * 4000,
      lastExecutionTime: new Date(),
      errorRate: Math.random() * 0.1,
      throughput: 100 + Math.random() * 200,
    };
  }

  private calculateMetricChanges(baseline: AlgorithmMetrics, current: AlgorithmMetrics): any[] {
    const metrics = [
      'totalExecutions',
      'successfulExecutions',
      'failedExecutions',
      'averageExecutionTime',
      'errorRate',
      'throughput',
    ];

    return metrics.map(metric => {
      const baselineValue = (baseline as any)[metric];
      const currentValue = (current as any)[metric];
      const absoluteChange = currentValue - baselineValue;
      const percentageChange = baselineValue > 0 ? (absoluteChange / baselineValue) * 100 : 0;
      
      let significance: 'low' | 'medium' | 'high' = 'low';
      if (Math.abs(percentageChange) > 20) significance = 'high';
      else if (Math.abs(percentageChange) > 10) significance = 'medium';

      return {
        metric,
        absoluteChange,
        percentageChange,
        significance,
      };
    });
  }

  private generateComparisonSummary(changes: any[]): any {
    const significantChanges = changes.filter(c => c.significance !== 'low');
    const improvements = changes.filter(c => c.percentageChange > 0);
    const declines = changes.filter(c => c.percentageChange < 0);

    let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (improvements.length > declines.length) overallTrend = 'improving';
    else if (declines.length > improvements.length) overallTrend = 'declining';

    const keyInsights = significantChanges.map(change => 
      `${change.metric} ${change.percentageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(change.percentageChange).toFixed(1)}%`
    );

    const recommendations = [];
    if (overallTrend === 'declining') {
      recommendations.push('Investigate performance degradation');
      recommendations.push('Consider algorithm optimization');
    } else if (overallTrend === 'improving') {
      recommendations.push('Monitor for continued improvement');
      recommendations.push('Consider deploying optimizations');
    }

    return {
      overallTrend,
      keyInsights,
      recommendations,
    };
  }

  private calculateSystemHealth(): number {
    // Simulate system health calculation
    return 85 + Math.random() * 15;
  }

  private getTopPerformers(): { algorithmId: string; score: number }[] {
    // Simulate top performers
    return [
      { algorithmId: 'cost-estimation-v1', score: 98.5 },
      { algorithmId: 'document-generator-v1', score: 97.8 },
      { algorithmId: 'material-optimizer-v1', score: 95.2 },
    ];
  }

  private calculateSystemTrends(): { metric: string; trend: 'up' | 'down' | 'stable'; change: number }[] {
    // Simulate system trends
    return [
      { metric: 'success_rate', trend: 'up', change: 2.1 },
      { metric: 'response_time', trend: 'down', change: -5.3 },
      { metric: 'throughput', trend: 'up', change: 8.7 },
    ];
  }

  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private startAnalyticsEngine(): void {
    this.isRunning = true;
    
    // Analyze insights every 10 minutes
    this.analysisInterval = setInterval(() => {
      this.generateInsights();
    }, 10 * 60 * 1000);
    
    // Generate scheduled reports every hour
    this.reportGenerationInterval = setInterval(() => {
      this.generateScheduledReports();
    }, 60 * 60 * 1000);
    
    logger.info('Algorithm analytics engine started');
  }

  private generateInsights(): void {
    // Simulate insight generation
    const algorithms = Array.from(this.insights.keys());
    
    algorithms.forEach(algorithmId => {
      if (Math.random() < 0.1) { // 10% chance of generating an insight
        const insight: AnalyticsInsight = {
          id: uuidv4(),
          type: Math.random() > 0.5 ? 'performance' : 'anomaly',
          severity: Math.random() > 0.7 ? 'high' : 'medium',
          title: `Performance insight for ${algorithmId}`,
          description: `Algorithm ${algorithmId} shows interesting performance patterns`,
          algorithmId,
          metric: 'success_rate',
          value: 85 + Math.random() * 15,
          trend: Math.random() > 0.5 ? 'up' : 'down',
          confidence: 0.7 + Math.random() * 0.3,
          timestamp: new Date(),
          actionable: Math.random() > 0.5,
          actions: ['Review configuration', 'Monitor closely'],
          metadata: {},
        };
        
        this.createInsight(insight);
      }
    });
  }

  private generateScheduledReports(): void {
    const activeReports = Array.from(this.reports.values()).filter(
      report => report.isActive && report.schedule
    );
    
    const now = new Date();
    
    activeReports.forEach(report => {
      if (report.nextGeneration && report.nextGeneration <= now) {
        this.generateReport(report.id);
      }
    });
  }
}

// Export singleton instance
export const algorithmAnalytics = new AlgorithmAnalytics();
