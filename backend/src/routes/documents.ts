import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Document } from '../types';

const router = Router();

// Get all documents for a project
router.get('/project/:projectId', authenticateUser, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['plan', 'specification', 'report', 'contract', 'permit', 'other']).withMessage('Invalid document type'),
  query('status').optional().isIn(['draft', 'review', 'approved', 'rejected']).withMessage('Invalid status'),
  query('search').optional().isString().withMessage('Search must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const type = req.query.type as string;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  let filter: any = { projectId };

  // Add filters
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const [documents, total] = await Promise.all([
    db.collection('documents')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .toArray(),
    db.collection('documents').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { documents },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Get document by ID
router.get('/:documentId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const db = getDatabase();

  const document = await db.collection('documents').findOne({ _id: new ObjectId(documentId) });

  if (!document) {
    throw new CustomError('Document not found', 404);
  }

  // Check if user has access to this document
  const project = await db.collection('projects').findOne({
    _id: document.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { document }
  });
}));

// Create new document
router.post('/', authenticateUser, [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('title').notEmpty().withMessage('Document title is required'),
  body('content').notEmpty().withMessage('Document content is required'),
  body('type').isIn(['plan', 'specification', 'report', 'contract', 'permit', 'other']).withMessage('Invalid document type'),
  body('status').optional().isIn(['draft', 'review', 'approved', 'rejected']).withMessage('Invalid status'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId, title, content, type, status, tags, metadata } = req.body;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  const newDocument: Document = {
    projectId,
    userId: req.user!._id,
    title,
    content,
    type,
    status: status || 'draft',
    version: 1,
    tags: tags || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata
  };

  const result = await db.collection('documents').insertOne(newDocument);
  
  logger.info(`New document created: ${title} in project ${projectId}`);

  res.status(201).json({
    success: true,
    data: {
      message: 'Document created successfully',
      document: { ...newDocument, _id: result.insertedId }
    }
  });
}));

// Update document
router.patch('/:documentId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const { title, content, status, tags, metadata } = req.body;
  const db = getDatabase();

  // Check if document exists and user has access
  const document = await db.collection('documents').findOne({ _id: new ObjectId(documentId) });

  if (!document) {
    throw new CustomError('Document not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: document.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  const updateData: any = {
    updatedAt: new Date()
  };

  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (status !== undefined) updateData.status = status;
  if (tags !== undefined) updateData.tags = tags;
  if (metadata !== undefined) updateData.metadata = metadata;

  // If content is being updated, create a new version
  if (content !== undefined && content !== document.content) {
    updateData.version = document.version + 1;
    updateData.previousVersionId = documentId;
  }

  const result = await db.collection('documents').updateOne(
    { _id: new ObjectId(documentId) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('Document not found', 404);
  }

  logger.info(`Document updated: ${documentId}`);

  res.json({
    success: true,
    data: { message: 'Document updated successfully' }
  });
}));

// Delete document
router.delete('/:documentId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const db = getDatabase();

  // Check if document exists and user has access
  const document = await db.collection('documents').findOne({ _id: new ObjectId(documentId) });

  if (!document) {
    throw new CustomError('Document not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: document.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  // Delete document and related data
  await Promise.all([
    db.collection('documents').deleteOne({ _id: new ObjectId(documentId) }),
    db.collection('vector_embeddings').deleteMany({ documentId }),
    db.collection('document_vectors').deleteMany({ documentId })
  ]);

  logger.info(`Document deleted: ${documentId}`);

  res.json({
    success: true,
    data: { message: 'Document deleted successfully' }
  });
}));

// Get document versions
router.get('/:documentId/versions', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { documentId } = req.params;
  const db = getDatabase();

  // Check if document exists and user has access
  const document = await db.collection('documents').findOne({ _id: new ObjectId(documentId) });

  if (!document) {
    throw new CustomError('Document not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: document.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  // Get all versions of the document
  const versions = await db.collection('documents')
    .find({
      $or: [
        { _id: new ObjectId(documentId) },
        { previousVersionId: documentId }
      ]
    })
    .sort({ version: -1 })
    .toArray();

  res.json({
    success: true,
    data: { versions }
  });
}));

// Search documents
router.get('/search/:projectId', authenticateUser, [
  query('q').notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId } = req.params;
  const query = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  // Search documents
  const searchFilter = {
    projectId,
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };

  const [documents, total] = await Promise.all([
    db.collection('documents')
      .find(searchFilter)
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .toArray(),
    db.collection('documents').countDocuments(searchFilter)
  ]);

  res.json({
    success: true,
    data: { documents },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

export default router;
