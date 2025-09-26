import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { VectorEmbedding, VectorSearchQuery, VectorSearchResult } from '../types';
import axios from 'axios';

const router = Router();

// Create vector embedding
router.post('/embed', authenticateUser, [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('embeddingType').isIn(['document', 'chunk', 'query']).withMessage('Invalid embedding type'),
  body('documentId').optional().isString().withMessage('Document ID must be a string'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId, content, embeddingType, documentId } = req.body;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  try {
    // Generate embedding using OpenAI API
    const embedding = await generateEmbedding(content);

    const newEmbedding: VectorEmbedding = {
      projectId,
      documentId,
      content,
      embedding,
      embeddingType,
      model: 'text-embedding-ada-002',
      createdAt: new Date(),
      metadata: {
        userId: req.user!._id,
        contentLength: content.length
      }
    };

    const result = await db.collection('vector_embeddings').insertOne(newEmbedding);

    logger.info(`Vector embedding created for project ${projectId}`);

    res.status(201).json({
      success: true,
      data: {
        message: 'Vector embedding created successfully',
        embedding: { ...newEmbedding, _id: result.insertedId }
      }
    });

  } catch (error) {
    logger.error('Vector embedding error:', error);
    throw new CustomError('Failed to create vector embedding', 500);
  }
}));

// Search vectors
router.post('/search', authenticateUser, [
  body('query').notEmpty().withMessage('Search query is required'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('threshold').optional().isFloat({ min: 0, max: 1 }).withMessage('Threshold must be between 0 and 1'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { query, projectId, limit = 10, threshold = 0.7, filters = {} } = req.body;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Build search filter
    let searchFilter: any = { projectId };
    
    // Add additional filters
    if (filters.embeddingType) {
      searchFilter.embeddingType = filters.embeddingType;
    }
    if (filters.documentId) {
      searchFilter.documentId = filters.documentId;
    }

    // Get all embeddings for the project
    const embeddings = await db.collection('vector_embeddings')
      .find(searchFilter)
      .toArray();

    // Calculate cosine similarity for each embedding
    const results: VectorSearchResult[] = [];
    
    for (const embedding of embeddings) {
      const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
      
      if (similarity >= threshold) {
        results.push({
          documentId: embedding.documentId || '',
          content: embedding.content,
          score: similarity,
          metadata: {
            embeddingType: embedding.embeddingType,
            createdAt: embedding.createdAt,
            ...embedding.metadata
          }
        });
      }
    }

    // Sort by similarity score and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, limit);

    logger.info(`Vector search completed for project ${projectId}: ${limitedResults.length} results`);

    res.json({
      success: true,
      data: {
        results: limitedResults,
        query,
        totalResults: results.length,
        threshold
      }
    });

  } catch (error) {
    logger.error('Vector search error:', error);
    throw new CustomError('Failed to perform vector search', 500);
  }
}));

// Get vector embeddings for a project
router.get('/project/:projectId', authenticateUser, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('embeddingType').optional().isIn(['document', 'chunk', 'query']).withMessage('Invalid embedding type'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  const embeddingType = req.query.embeddingType as string;

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

  if (embeddingType) {
    filter.embeddingType = embeddingType;
  }

  const [embeddings, total] = await Promise.all([
    db.collection('vector_embeddings')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection('vector_embeddings').countDocuments(filter)
  ]);

  // Remove embedding vectors from response to reduce payload size
  const embeddingsWithoutVectors = embeddings.map(embedding => ({
    ...embedding,
    embedding: undefined // Remove the actual vector data
  }));

  res.json({
    success: true,
    data: { embeddings: embeddingsWithoutVectors },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Delete vector embedding
router.delete('/:embeddingId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { embeddingId } = req.params;
  const db = getDatabase();

  // Check if embedding exists and user has access
  const embedding = await db.collection('vector_embeddings').findOne({ _id: new ObjectId(embeddingId) });

  if (!embedding) {
    throw new CustomError('Vector embedding not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: embedding.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  await db.collection('vector_embeddings').deleteOne({ _id: new ObjectId(embeddingId) });

  logger.info(`Vector embedding deleted: ${embeddingId}`);

  res.json({
    success: true,
    data: { message: 'Vector embedding deleted successfully' }
  });
}));

// Get vector statistics
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

  // Get vector statistics
  const [
    totalEmbeddings,
    embeddingsByType,
    recentEmbeddings
  ] = await Promise.all([
    db.collection('vector_embeddings').countDocuments({ projectId }),
    db.collection('vector_embeddings').aggregate([
      { $match: { projectId } },
      { $group: { _id: '$embeddingType', count: { $sum: 1 } } }
    ]).toArray(),
    db.collection('vector_embeddings')
      .find({ projectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalEmbeddings,
        embeddingsByType,
        recentEmbeddings: recentEmbeddings.map(embedding => ({
          _id: embedding._id,
          content: embedding.content.substring(0, 100) + '...',
          embeddingType: embedding.embeddingType,
          createdAt: embedding.createdAt
        }))
      }
    }
  });
}));

// Helper function to generate embedding using OpenAI API
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: 'text-embedding-ada-002'
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.data[0].embedding;

  } catch (error) {
    logger.error('OpenAI embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

export default router;
