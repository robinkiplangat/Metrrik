import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { KnowledgeGraph, KnowledgeGraphQuery, KnowledgeGraphResult } from '../types';

const router = Router();

// Create knowledge graph entity
router.post('/entity', authenticateUser, [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('entityType').isIn(['project', 'document', 'user', 'location', 'material', 'equipment']).withMessage('Invalid entity type'),
  body('entityId').notEmpty().withMessage('Entity ID is required'),
  body('entityName').notEmpty().withMessage('Entity name is required'),
  body('properties').isObject().withMessage('Properties must be an object'),
  body('relationships').optional().isArray().withMessage('Relationships must be an array'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId, entityType, entityId, entityName, properties, relationships = [] } = req.body;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  const newEntity: KnowledgeGraph = {
    projectId,
    entityType,
    entityId,
    entityName,
    properties,
    relationships,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('knowledge_graph').insertOne(newEntity);

  logger.info(`Knowledge graph entity created: ${entityName} in project ${projectId}`);

  res.status(201).json({
    success: true,
    data: {
      message: 'Knowledge graph entity created successfully',
      entity: { ...newEntity, _id: result.insertedId }
    }
  });
}));

// Get knowledge graph entities
router.get('/entities/:projectId', authenticateUser, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('entityType').optional().isIn(['project', 'document', 'user', 'location', 'material', 'equipment']).withMessage('Invalid entity type'),
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
  const entityType = req.query.entityType as string;
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

  if (entityType) {
    filter.entityType = entityType;
  }

  if (search) {
    filter.$or = [
      { entityName: { $regex: search, $options: 'i' } },
      { entityId: { $regex: search, $options: 'i' } }
    ];
  }

  const [entities, total] = await Promise.all([
    db.collection('knowledge_graph')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 })
      .toArray(),
    db.collection('knowledge_graph').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { entities },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Get knowledge graph entity by ID
router.get('/entity/:entityId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityId } = req.params;
  const db = getDatabase();

  const entity = await db.collection('knowledge_graph').findOne({ _id: new ObjectId(entityId) });

  if (!entity) {
    throw new CustomError('Knowledge graph entity not found', 404);
  }

  // Check if user has access to this entity
  const project = await db.collection('projects').findOne({
    _id: entity.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { entity }
  });
}));

// Update knowledge graph entity
router.patch('/entity/:entityId', authenticateUser, [
  body('entityName').optional().isString().withMessage('Entity name must be a string'),
  body('properties').optional().isObject().withMessage('Properties must be an object'),
  body('relationships').optional().isArray().withMessage('Relationships must be an array'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { entityId } = req.params;
  const { entityName, properties, relationships } = req.body;
  const db = getDatabase();

  // Check if entity exists and user has access
  const entity = await db.collection('knowledge_graph').findOne({ _id: new ObjectId(entityId) });

  if (!entity) {
    throw new CustomError('Knowledge graph entity not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: entity.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  const updateData: any = {
    updatedAt: new Date()
  };

  if (entityName !== undefined) updateData.entityName = entityName;
  if (properties !== undefined) updateData.properties = properties;
  if (relationships !== undefined) updateData.relationships = relationships;

  const result = await db.collection('knowledge_graph').updateOne(
    { _id: new ObjectId(entityId) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('Knowledge graph entity not found', 404);
  }

  logger.info(`Knowledge graph entity updated: ${entityId}`);

  res.json({
    success: true,
    data: { message: 'Knowledge graph entity updated successfully' }
  });
}));

// Delete knowledge graph entity
router.delete('/entity/:entityId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityId } = req.params;
  const db = getDatabase();

  // Check if entity exists and user has access
  const entity = await db.collection('knowledge_graph').findOne({ _id: new ObjectId(entityId) });

  if (!entity) {
    throw new CustomError('Knowledge graph entity not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: entity.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  await db.collection('knowledge_graph').deleteOne({ _id: new ObjectId(entityId) });

  logger.info(`Knowledge graph entity deleted: ${entityId}`);

  res.json({
    success: true,
    data: { message: 'Knowledge graph entity deleted successfully' }
  });
}));

// Add relationship between entities
router.post('/relationship', authenticateUser, [
  body('sourceEntityId').notEmpty().withMessage('Source entity ID is required'),
  body('targetEntityId').notEmpty().withMessage('Target entity ID is required'),
  body('relationshipType').notEmpty().withMessage('Relationship type is required'),
  body('strength').optional().isFloat({ min: 0, max: 1 }).withMessage('Strength must be between 0 and 1'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { sourceEntityId, targetEntityId, relationshipType, strength = 1.0, metadata = {} } = req.body;
  const db = getDatabase();

  // Check if both entities exist and user has access
  const [sourceEntity, targetEntity] = await Promise.all([
    db.collection('knowledge_graph').findOne({ _id: sourceEntityId }),
    db.collection('knowledge_graph').findOne({ _id: targetEntityId })
  ]);

  if (!sourceEntity || !targetEntity) {
    throw new CustomError('One or both entities not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: sourceEntity.projectId,
    userId: req.user!._id
  });

  if (!project || sourceEntity.projectId !== targetEntity.projectId) {
    throw new CustomError('Access denied', 403);
  }

  // Add relationship to source entity
  const newRelationship = {
    targetEntityId,
    relationshipType,
    strength,
    metadata
  };

  await db.collection('knowledge_graph').updateOne(
    { _id: new ObjectId(sourceEntityId) },
    { $push: { relationships: newRelationship } } as any
  );

  logger.info(`Relationship added between entities ${sourceEntityId} and ${targetEntityId}`);

  res.json({
    success: true,
    data: { message: 'Relationship added successfully' }
  });
}));

// Get knowledge graph visualization data
router.get('/visualization/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  // Get all entities and their relationships
  const entities = await db.collection('knowledge_graph')
    .find({ projectId })
    .toArray();

  const result: KnowledgeGraphResult = {
    entities: entities.map(entity => ({
      id: entity._id.toString(),
      type: entity.entityType,
      name: entity.entityName,
      properties: entity.properties
    })),
    relationships: entities.flatMap(entity => 
      entity.relationships.map((rel: any) => ({
        source: entity._id.toString(),
        target: rel.targetEntityId,
        type: rel.relationshipType,
        strength: rel.strength
      }))
    )
  };

  res.json({
    success: true,
    data: result
  });
}));

// Get knowledge graph statistics
router.get('/stats/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  // Get knowledge graph statistics
  const [
    totalEntities,
    entitiesByType,
    totalRelationships,
    relationshipTypes
  ] = await Promise.all([
    db.collection('knowledge_graph').countDocuments({ projectId }),
    db.collection('knowledge_graph').aggregate([
      { $match: { projectId } },
      { $group: { _id: '$entityType', count: { $sum: 1 } } }
    ]).toArray(),
    db.collection('knowledge_graph').aggregate([
      { $match: { projectId } },
      { $unwind: '$relationships' },
      { $count: 'total' }
    ]).toArray(),
    db.collection('knowledge_graph').aggregate([
      { $match: { projectId } },
      { $unwind: '$relationships' },
      { $group: { _id: '$relationships.relationshipType', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalEntities,
        entitiesByType,
        totalRelationships: totalRelationships[0]?.total || 0,
        relationshipTypes
      }
    }
  });
}));

export default router;
