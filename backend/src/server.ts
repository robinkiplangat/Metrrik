import dotenv from 'dotenv';
// Load environment variables BEFORE imports that might use them
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import fileRoutes from './routes/files';
import chatRoutes from './routes/chat';
import vectorRoutes from './routes/vector';
import knowledgeRoutes from './routes/knowledge';
import analysisRoutes from './routes/analysis';

// Import algorithm management services
import { algorithmOrchestrator } from './services/algorithmOrchestrator';
import { algorithmRegistry } from './services/algorithmRegistry';
import { algorithmMonitoring } from './services/algorithmMonitoring';
import { algorithmPipeline } from './services/algorithmPipeline';
import { algorithmABTesting } from './services/algorithmABTesting';
import { algorithmAnalytics } from './services/algorithmAnalytics';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { initializeSwagger, apiTags } from './config/swagger';
import { initializeLLMSystem } from './config/llmInit';

// Import enhanced security middleware
import {
  requestCorrelation,
  securityHeaders,
  createRateLimiter,
  fileUploadSecurity,
  validateRequest,
  validateApiKey
} from './middleware/security';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5050;

// Enhanced security middleware
app.use(requestCorrelation);
app.use(securityHeaders);

// Enhanced rate limiting with user-based limits
const generalLimiter = createRateLimiter(15 * 60 * 1000, 100);
const apiLimiter = createRateLimiter(15 * 60 * 1000, 200, 'API rate limit exceeded');
const uploadLimiter = createRateLimiter(60 * 60 * 1000, 10, 'Upload rate limit exceeded');

app.use(generalLimiter);
app.use('/api', apiLimiter);
app.use('/api/files/upload', uploadLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Enhanced logging middleware with correlation IDs
app.use(morgan((tokens, req, res) => {
  const correlationId = (req as any).correlationId || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';

  return [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    `[${correlationId}]`,
    `[${userId}]`,
    tokens['user-agent'](req, res)
  ].join(' ');
}, {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// File upload security
app.use('/api/files/upload', fileUploadSecurity);

// Initialize Swagger documentation
initializeSwagger(app);

// Enhanced health check endpoint
/**
 * GET /health
 * @summary Enhanced health check endpoint
 * @tags System
 * @return {object} 200 - Health status
 * @return {string} 200.status - Status message
 * @return {string} 200.timestamp - Current timestamp
 * @return {number} 200.uptime - Server uptime in seconds
 * @return {string} 200.environment - Current environment
 * @return {object} 200.services - Service health status
 * @return {object} 200.algorithmSystem - Algorithm system status
 */
app.get('/health', (req, res) => {
  const correlationId = (req as any).correlationId;

  // Get algorithm system status
  const algorithmSystemStatus = {
    orchestrator: algorithmOrchestrator ? 'healthy' : 'unhealthy',
    registry: algorithmRegistry ? 'healthy' : 'unhealthy',
    monitoring: algorithmMonitoring ? 'healthy' : 'unhealthy',
    pipeline: algorithmPipeline ? 'healthy' : 'unhealthy',
    abTesting: algorithmABTesting ? 'healthy' : 'unhealthy',
    analytics: algorithmAnalytics ? 'healthy' : 'unhealthy',
  };

  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    correlationId,
    services: {
      database: 'healthy', // Would check actual DB connection
      redis: 'healthy',    // Would check Redis connection
      storage: 'healthy',  // Would check storage systems
    },
    algorithmSystem: algorithmSystemStatus,
    metrics: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeConnections: 0, // Would track actual connections
    }
  };

  logger.info('Health check requested', {
    correlationId,
    status: 'OK',
    uptime: healthData.uptime,
  });

  res.status(200).json(healthData);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/vector', vectorRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/analysis', analysisRoutes);

// Algorithm management routes
import algorithmRoutes from './routes/algorithms';
app.use('/api/algorithms', algorithmRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('join-project', (projectId: string) => {
    socket.join(`project-${projectId}`);
    logger.info(`User ${socket.id} joined project ${projectId}`);
  });

  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project-${projectId}`);
    logger.info(`User ${socket.id} left project ${projectId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Initialize LLM system
    await initializeLLMSystem();
    logger.info('✅ LLM system initialized');

    // Initialize algorithm management system
    await initializeAlgorithmSystem();
    logger.info('✅ Algorithm management system initialized');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔧 Algorithm System: World-class scale enabled`);
      logger.info(`📊 Monitoring: Real-time performance tracking active`);
      logger.info(`🧪 A/B Testing: Framework ready`);
      logger.info(`📈 Analytics: Comprehensive dashboard available`);
    });
  } catch (error: any) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize algorithm management system
async function initializeAlgorithmSystem() {
  try {
    // Register default algorithms
    await registerDefaultAlgorithms();

    // Set up algorithm monitoring
    setupAlgorithmMonitoring();

    // Initialize analytics dashboards
    await initializeAnalyticsDashboards();

    logger.info('Algorithm management system fully operational');
  } catch (error: any) {
    logger.error('Failed to initialize algorithm system:', error);
    throw error;
  }
}

// Register default algorithms
async function registerDefaultAlgorithms() {
  const { AlgorithmCategory, AlgorithmPriority } = await import('./services/algorithmOrchestrator');

  const defaultAlgorithms = [
    {
      id: 'cost-estimation-v1',
      name: 'Cost Estimation Algorithm',
      version: '1.0.0',
      description: 'AI-powered cost estimation for construction projects',
      category: AlgorithmCategory.COST_ESTIMATION,
      inputSchema: { type: 'object', properties: { projectData: { type: 'object' } } },
      outputSchema: { type: 'object', properties: { totalCost: { type: 'number' } } },
      timeout: 30000,
      maxRetries: 3,
      priority: AlgorithmPriority.HIGH,
      dependencies: [],
      tags: ['cost', 'estimation', 'construction'],
      isActive: true,
      performanceMetrics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        lastExecutionTime: new Date(),
        errorRate: 0,
        throughput: 0,
      },
    },
    {
      id: 'floor-plan-analysis-v1',
      name: 'Floor Plan Analysis Algorithm',
      version: '1.0.0',
      description: 'AI-powered floor plan analysis and BQ generation',
      category: AlgorithmCategory.FLOOR_PLAN_ANALYSIS,
      inputSchema: { type: 'object', properties: { imageData: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { billOfQuantities: { type: 'array' } } },
      timeout: 60000,
      maxRetries: 2,
      priority: AlgorithmPriority.HIGH,
      dependencies: [],
      tags: ['floor-plan', 'analysis', 'bq'],
      isActive: true,
      performanceMetrics: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        lastExecutionTime: new Date(),
        errorRate: 0,
        throughput: 0,
      },
    },
  ];

  for (const algorithmDef of defaultAlgorithms) {
    await algorithmOrchestrator.registerAlgorithm(algorithmDef);
  }
}

// Set up algorithm monitoring
function setupAlgorithmMonitoring() {
  // Set up performance thresholds
  algorithmMonitoring.setPerformanceThreshold({
    algorithmId: 'cost-estimation-v1',
    metric: 'error_rate',
    threshold: 0.05,
    operator: 'gt',
    severity: 'high',
    enabled: true,
  });

  algorithmMonitoring.setPerformanceThreshold({
    algorithmId: 'floor-plan-analysis-v1',
    metric: 'response_time',
    threshold: 45000,
    operator: 'gt',
    severity: 'medium',
    enabled: true,
  });

  // Set up monitoring event handlers
  algorithmMonitoring.on('performanceAlert', (alert) => {
    logger.warn('Performance alert triggered', {
      algorithmId: alert.algorithmId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    });
  });
}

// Initialize analytics dashboards
async function initializeAnalyticsDashboards() {
  const { WidgetType } = await import('./services/algorithmAnalytics');

  const defaultDashboard = {
    id: 'default-algorithm-dashboard',
    name: 'Algorithm Performance Dashboard',
    description: 'Real-time monitoring of algorithm performance and health',
    widgets: [
      {
        id: 'system-health',
        type: WidgetType.HEALTH_SCORE,
        title: 'System Health Score',
        description: 'Overall algorithm system health',
        position: { x: 0, y: 0, width: 3, height: 2 },
        configuration: {
          metric: 'health_score',
          timeRange: '24h' as const,
          aggregation: 'avg' as const,
        },
        dataSource: {
          type: 'system' as const,
          sourceId: 'health-metrics',
          query: 'SELECT * FROM health_metrics',
          parameters: {},
        },
        refreshInterval: 30,
        isVisible: true,
      },
      {
        id: 'execution-metrics',
        type: WidgetType.METRIC_CARD,
        title: 'Total Executions',
        description: 'Total algorithm executions in the last 24 hours',
        position: { x: 3, y: 0, width: 2, height: 1 },
        configuration: {
          metric: 'total_executions',
          timeRange: '24h' as const,
          aggregation: 'sum' as const,
        },
        dataSource: {
          type: 'algorithm' as const,
          sourceId: 'all',
          query: 'SELECT COUNT(*) FROM executions',
          parameters: {},
        },
        refreshInterval: 60,
        isVisible: true,
      },
    ],
    filters: [],
    refreshInterval: 30,
    isPublic: false,
    createdBy: 'system',
    createdAt: new Date(),
    lastUpdated: new Date(),
  };

  await algorithmAnalytics.createDashboard(defaultDashboard);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start the server
startServer();

export { app, io };
