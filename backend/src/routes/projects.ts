import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Project } from '../types';

const router = Router();

// Get all projects for a user
router.get('/', authenticateUser, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['planning', 'active', 'completed', 'on-hold', 'cancelled']).withMessage('Invalid status'),
  query('type').optional().isIn(['residential', 'commercial', 'industrial', 'infrastructure']).withMessage('Invalid type'),
  query('search').optional().isString().withMessage('Search must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;
  const type = req.query.type as string;
  const search = req.query.search as string;

  const db = getDatabase();
  let filter: any = { userId: req.user!._id };

  // Add filters
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const [projects, total] = await Promise.all([
    db.collection('projects')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .toArray(),
    db.collection('projects').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { projects },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Get project by ID
router.get('/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const db = getDatabase();

  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  res.json({
    success: true,
    data: { project }
  });
}));

// Create new project
router.post('/', authenticateUser, [
  body('name').notEmpty().withMessage('Project name is required'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('type').isIn(['residential', 'commercial', 'industrial', 'infrastructure']).withMessage('Invalid project type'),
  body('status').optional().isIn(['planning', 'active', 'completed', 'on-hold', 'cancelled']).withMessage('Invalid status'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('budget').optional().isObject().withMessage('Budget must be an object'),
  body('timeline').optional().isObject().withMessage('Timeline must be an object'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { name, description, type, status, location, budget, timeline, metadata } = req.body;
  const db = getDatabase();

  const newProject: Project = {
    userId: req.user!._id,
    name,
    description,
    type,
    status: status || 'planning',
    location,
    budget,
    timeline,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata
  };

  const result = await db.collection('projects').insertOne(newProject);
  
  logger.info(`New project created: ${name} by user ${req.user!._id}`);

  res.status(201).json({
    success: true,
    data: {
      message: 'Project created successfully',
      project: { ...newProject, _id: result.insertedId }
    }
  });
}));

// Update project
router.patch('/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const updateData = req.body;
  const db = getDatabase();

  // Remove fields that shouldn't be updated directly
  delete updateData._id;
  delete updateData.userId;
  delete updateData.createdAt;

  // Add updated timestamp
  updateData.updatedAt = new Date();

  const result = await db.collection('projects').updateOne(
    { _id: new ObjectId(projectId), userId: req.user!._id },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('Project not found', 404);
  }

  logger.info(`Project updated: ${projectId} by user ${req.user!._id}`);

  res.json({
    success: true,
    data: { message: 'Project updated successfully' }
  });
}));

// Delete project
router.delete('/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  // Delete project and all related data
  await Promise.all([
    db.collection('projects').deleteOne({ _id: new ObjectId(projectId) }),
    db.collection('documents').deleteMany({ projectId }),
    db.collection('chat_messages').deleteMany({ projectId }),
    db.collection('uploaded_files').deleteMany({ projectId }),
    db.collection('reports').deleteMany({ projectId }),
    db.collection('vector_embeddings').deleteMany({ projectId }),
    db.collection('document_vectors').deleteMany({ projectId }),
    db.collection('knowledge_graph').deleteMany({ projectId })
  ]);

  logger.info(`Project deleted: ${projectId} by user ${req.user!._id}`);

  res.json({
    success: true,
    data: { message: 'Project deleted successfully' }
  });
}));

// Get project statistics
router.get('/:projectId/stats', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  // Get project statistics
  const [
    documentsCount,
    filesCount,
    chatMessagesCount,
    reportsCount
  ] = await Promise.all([
    db.collection('documents').countDocuments({ projectId }),
    db.collection('uploaded_files').countDocuments({ projectId }),
    db.collection('chat_messages').countDocuments({ projectId }),
    db.collection('reports').countDocuments({ projectId })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        documents: documentsCount,
        files: filesCount,
        chatMessages: chatMessagesCount,
        reports: reportsCount
      }
    }
  });
}));

// Get project timeline
router.get('/:projectId/timeline', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  // Get timeline data
  const timeline = project.timeline || {
    startDate: project.createdAt,
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    milestones: []
  };

  res.json({
    success: true,
    data: { timeline }
  });
}));

export default router;
