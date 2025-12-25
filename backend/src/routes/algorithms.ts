import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import {
  algorithmOrchestrator,
  AlgorithmDefinition,
  AlgorithmCategory,
  AlgorithmPriority,
  ExecutionStrategy
} from '../services/algorithmOrchestrator';
import { algorithmRegistry } from '../services/algorithmRegistry';
import { algorithmMonitoring } from '../services/algorithmMonitoring';
import { algorithmPipeline } from '../services/algorithmPipeline';
import { algorithmABTesting } from '../services/algorithmABTesting';
import { algorithmAnalytics } from '../services/algorithmAnalytics';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest } from '../middleware/security';
import Joi from 'joi';

const router = Router();

// Validation schemas
const algorithmExecutionSchema = Joi.object({
  algorithmId: Joi.string().required(),
  input: Joi.object().required(),
  context: Joi.object({
    userId: Joi.string(),
    projectId: Joi.string(),
    priority: Joi.string().valid('CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND'),
    timeout: Joi.number().min(1000).max(300000),
    maxRetries: Joi.number().min(0).max(5),
    metadata: Joi.object(),
  }),
});

const pipelineExecutionSchema = Joi.object({
  pipelineId: Joi.string().required(),
  input: Joi.object().required(),
  context: Joi.object({
    userId: Joi.string(),
    projectId: Joi.string(),
    timeout: Joi.number().min(1000).max(600000),
    metadata: Joi.object(),
  }),
});

const abTestSchema = Joi.object({
  testId: Joi.string().required(),
  input: Joi.object().required(),
  context: Joi.object({
    userId: Joi.string().required(),
    projectId: Joi.string(),
    correlationId: Joi.string(),
    metadata: Joi.object(),
  }),
});

/**
 * @swagger
 * /api/algorithms/execute:
 *   post:
 *     summary: Execute an algorithm
 *     tags: [Algorithms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - algorithmId
 *               - input
 *             properties:
 *               algorithmId:
 *                 type: string
 *                 description: ID of the algorithm to execute
 *               input:
 *                 type: object
 *                 description: Input data for the algorithm
 *               context:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   projectId:
 *                     type: string
 *                   priority:
 *                     type: string
 *                     enum: [CRITICAL, HIGH, NORMAL, LOW, BACKGROUND]
 *                   timeout:
 *                     type: number
 *                   maxRetries:
 *                     type: number
 *                   metadata:
 *                     type: object
 *     responses:
 *       200:
 *         description: Algorithm execution result
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Algorithm not found
 *       500:
 *         description: Internal server error
 */
router.post('/execute', validateRequest(algorithmExecutionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { algorithmId, input, context = {} } = req.body;
  const correlationId = (req as any).correlationId;

  logger.info('Algorithm execution requested', {
    algorithmId,
    correlationId,
    userId: context.userId,
    projectId: context.projectId,
  });

  try {
    const result = await algorithmOrchestrator.executeAlgorithm(algorithmId, input, {
      ...context,
      correlationId,
    });

    // Record execution for monitoring
    algorithmMonitoring.recordExecution(algorithmId, {
      id: correlationId,
      correlationId,
      userId: context.userId || 'anonymous',
      projectId: context.projectId,
      timestamp: new Date(),
      priority: context.priority || AlgorithmPriority.NORMAL,
      timeout: context.timeout || 30000,
      retryCount: 0,
      maxRetries: context.maxRetries || 3,
      metadata: context.metadata || {},
    }, result, result.executionTime);

    res.json({
      success: true,
      data: result,
      correlationId,
    });
  } catch (error: any) {
    logger.error('Algorithm execution failed', {
      algorithmId,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/execute-strategy:
 *   post:
 *     summary: Execute multiple algorithms using a strategy
 *     tags: [Algorithms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - strategy
 *               - input
 *             properties:
 *               strategy:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [sequential, parallel, pipeline, conditional]
 *                   algorithms:
 *                     type: array
 *                     items:
 *                       type: string
 *                   conditions:
 *                     type: object
 *                   fallback:
 *                     type: string
 *               input:
 *                 type: object
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Strategy execution results
 */
router.post('/execute-strategy', asyncHandler(async (req: Request, res: Response) => {
  const { strategy, input, context = {} } = req.body;
  const correlationId = (req as any).correlationId;

  logger.info('Strategy execution requested', {
    strategyType: strategy.type,
    algorithmCount: strategy.algorithms.length,
    correlationId,
  });

  try {
    const results = await algorithmOrchestrator.executeStrategy(strategy, input, {
      ...context,
      correlationId,
    });

    res.json({
      success: true,
      data: results,
      correlationId,
    });
  } catch (error: any) {
    logger.error('Strategy execution failed', {
      strategyType: strategy.type,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/pipeline/execute:
 *   post:
 *     summary: Execute an algorithm pipeline
 *     tags: [Algorithms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pipelineId
 *               - input
 *             properties:
 *               pipelineId:
 *                 type: string
 *               input:
 *                 type: object
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Pipeline execution result
 */
router.post('/pipeline/execute', validateRequest(pipelineExecutionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { pipelineId, input, context = {} } = req.body;
  const correlationId = (req as any).correlationId;

  logger.info('Pipeline execution requested', {
    pipelineId,
    correlationId,
    userId: context.userId,
  });

  try {
    const result = await algorithmPipeline.executePipeline(pipelineId, input, {
      ...context,
      correlationId,
    });

    res.json({
      success: true,
      data: result,
      correlationId,
    });
  } catch (error: any) {
    logger.error('Pipeline execution failed', {
      pipelineId,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/ab-test/execute:
 *   post:
 *     summary: Execute algorithm with A/B testing
 *     tags: [Algorithms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testId
 *               - input
 *               - context
 *             properties:
 *               testId:
 *                 type: string
 *               input:
 *                 type: object
 *               context:
 *                 type: object
 *                 required:
 *                   - userId
 *     responses:
 *       200:
 *         description: A/B test execution result
 */
router.post('/ab-test/execute', validateRequest(abTestSchema), asyncHandler(async (req: Request, res: Response) => {
  const { testId, input, context } = req.body;
  const correlationId = (req as any).correlationId;

  logger.info('A/B test execution requested', {
    testId,
    correlationId,
    userId: context.userId,
  });

  try {
    const result = await algorithmABTesting.executeWithABTest(testId, input, {
      ...context,
      correlationId,
    });

    res.json({
      success: true,
      data: result,
      correlationId,
    });
  } catch (error: any) {
    logger.error('A/B test execution failed', {
      testId,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/metrics/{algorithmId}:
 *   get:
 *     summary: Get algorithm performance metrics
 *     tags: [Algorithms]
 *     parameters:
 *       - in: path
 *         name: algorithmId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 24h, 7d, 30d]
 *           default: 24h
 *     responses:
 *       200:
 *         description: Algorithm metrics
 */
router.get('/metrics/:algorithmId', asyncHandler(async (req: Request, res: Response) => {
  const { algorithmId } = req.params;
  const { timeRange = '24h' } = req.query;
  const correlationId = (req as any).correlationId;

  try {
    const metrics = algorithmMonitoring.getDashboardData(algorithmId, timeRange as any);
    const healthScore = algorithmMonitoring.getAlgorithmHealthScore(algorithmId);

    res.json({
      success: true,
      data: {
        algorithmId,
        timeRange,
        metrics,
        healthScore,
      },
      correlationId,
    });
  } catch (error: any) {
    logger.error('Failed to get algorithm metrics', {
      algorithmId,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/analytics/dashboard/{dashboardId}:
 *   get:
 *     summary: Get analytics dashboard data
 *     tags: [Algorithms]
 *     parameters:
 *       - in: path
 *         name: dashboardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/analytics/dashboard/:dashboardId', asyncHandler(async (req: Request, res: Response) => {
  const { dashboardId } = req.params;
  const filters = req.query;
  const correlationId = (req as any).correlationId;

  try {
    const dashboardData = await algorithmAnalytics.getDashboardData(dashboardId, filters);

    res.json({
      success: true,
      data: dashboardData,
      correlationId,
    });
  } catch (error: any) {
    logger.error('Failed to get dashboard data', {
      dashboardId,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/analytics/system:
 *   get:
 *     summary: Get system-wide analytics
 *     tags: [Algorithms]
 *     responses:
 *       200:
 *         description: System analytics
 */
router.get('/analytics/system', asyncHandler(async (req: Request, res: Response) => {
  const correlationId = (req as any).correlationId;

  try {
    const systemAnalytics = algorithmAnalytics.getSystemAnalytics();

    res.json({
      success: true,
      data: systemAnalytics,
      correlationId,
    });
  } catch (error: any) {
    logger.error('Failed to get system analytics', {
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/ab-test/{testId}/statistics:
 *   get:
 *     summary: Get A/B test statistics
 *     tags: [Algorithms]
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A/B test statistics
 */
router.get('/ab-test/:testId/statistics', asyncHandler(async (req: Request, res: Response) => {
  const { testId } = req.params;
  const correlationId = (req as any).correlationId;

  try {
    const statistics = algorithmABTesting.getTestStatistics(testId);
    const recommendation = algorithmABTesting.getTestRecommendation(testId);

    res.json({
      success: true,
      data: {
        testId,
        statistics,
        recommendation,
      },
      correlationId,
    });
  } catch (error: any) {
    logger.error('Failed to get A/B test statistics', {
      testId,
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/registry:
 *   get:
 *     summary: Get all registered algorithms
 *     tags: [Algorithms]
 *     responses:
 *       200:
 *         description: List of registered algorithms
 */
router.get('/registry', asyncHandler(async (req: Request, res: Response) => {
  const correlationId = (req as any).correlationId;

  try {
    const statistics = algorithmRegistry.getAlgorithmStatistics();
    const algorithms = Array.from(algorithmOrchestrator.getAllMetrics().keys()).map(algorithmId => {
      const metrics = algorithmOrchestrator.getAlgorithmMetrics(algorithmId);
      return {
        algorithmId,
        metrics,
      };
    });

    res.json({
      success: true,
      data: {
        statistics,
        algorithms,
      },
      correlationId,
    });
  } catch (error: any) {
    logger.error('Failed to get algorithm registry', {
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

/**
 * @swagger
 * /api/algorithms/health:
 *   get:
 *     summary: Get algorithm system health
 *     tags: [Algorithms]
 *     responses:
 *       200:
 *         description: Algorithm system health status
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const correlationId = (req as any).correlationId;

  try {
    const systemMetrics = algorithmMonitoring.getSystemMetrics();
    const activeTests = algorithmABTesting.getActiveTests();
    const activeExecutions = algorithmPipeline.getActiveExecutions();

    res.json({
      success: true,
      data: {
        systemMetrics,
        activeTests: activeTests.length,
        activeExecutions: activeExecutions.length,
        health: {
          orchestrator: 'healthy',
          registry: 'healthy',
          monitoring: 'healthy',
          pipeline: 'healthy',
          abTesting: 'healthy',
          analytics: 'healthy',
        },
      },
      correlationId,
    });
  } catch (error: any) {
    logger.error('Failed to get algorithm system health', {
      correlationId,
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: error.message,
      correlationId,
    });
  }
}));

export default router;
