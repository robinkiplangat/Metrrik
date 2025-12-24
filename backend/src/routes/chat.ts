import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { ChatMessage } from '../types';
import axios from 'axios';

const router = Router();

// Get chat messages for a project
router.get('/project/:projectId', authenticateUser, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('messageType').optional().isIn(['user', 'assistant', 'system']).withMessage('Invalid message type'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const messageType = req.query.messageType as string;

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

  // Add message type filter
  if (messageType) filter.messageType = messageType;

  const [messages, total] = await Promise.all([
    db.collection('chat_messages')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ timestamp: -1 })
      .toArray(),
    db.collection('chat_messages').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { messages },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Send message to AI
router.post('/send/:projectId', authenticateUser, [
  body('message').notEmpty().withMessage('Message is required'),
  body('context').optional().isArray().withMessage('Context must be an array'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { projectId } = req.params;
  const { message, context } = req.body;
  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  // Save user message
  const userMessage: ChatMessage = {
    projectId,
    userId: req.user!._id,
    message,
    messageType: 'user',
    timestamp: new Date(),
    metadata: { context }
  };

  const userMessageResult = await db.collection('chat_messages').insertOne(userMessage);

  try {
    // Get project context for AI
    const [documents, files, recentMessages] = await Promise.all([
      db.collection('documents').find({ projectId }).limit(5).toArray(),
      db.collection('uploaded_files').find({ projectId }).limit(5).toArray(),
      db.collection('chat_messages')
        .find({ projectId, messageType: 'assistant' })
        .sort({ timestamp: -1 })
        .limit(3)
        .toArray()
    ]);

    // Prepare context for AI
    const projectContext = {
      project: {
        name: project.name,
        type: project.type,
        status: project.status,
        description: project.description
      },
      documents: documents.map(doc => ({
        title: doc.title,
        type: doc.type,
        content: doc.content.substring(0, 500) // Limit content length
      })),
      files: files.map(file => ({
        name: file.originalName,
        type: file.fileType,
        description: file.metadata?.description
      })),
      recentMessages: recentMessages.map(msg => ({
        message: msg.message,
        timestamp: msg.timestamp
      }))
    };

    // Call AI service (Gemini)
    const aiResponse = await callGeminiAPI(message, projectContext);

    // Save AI response
    const aiMessage: ChatMessage = {
      projectId,
      userId: req.user!._id,
      message: aiResponse.text,
      messageType: 'assistant',
      timestamp: new Date(),
      metadata: {
        model: aiResponse.model,
        tokens: aiResponse.tokens,
        responseTime: aiResponse.responseTime,
        context: context
      }
    };

    const aiMessageResult = await db.collection('chat_messages').insertOne(aiMessage);

    logger.info(`Chat message sent in project ${projectId} by user ${req.user!._id}`);

    res.json({
      success: true,
      data: {
        userMessage: { ...userMessage, _id: userMessageResult.insertedId },
        aiMessage: { ...aiMessage, _id: aiMessageResult.insertedId }
      }
    });

  } catch (error) {
    logger.error('AI service error:', error);

    // Save error message
    const errorMessage: ChatMessage = {
      projectId,
      userId: req.user!._id,
      message: 'Sorry, I encountered an error processing your request. Please try again.',
      messageType: 'system',
      timestamp: new Date(),
      metadata: { context: [String(error)] }
    };

    await db.collection('chat_messages').insertOne(errorMessage);

    res.status(500).json({
      success: false,
      error: { message: 'AI service temporarily unavailable' }
    });
  }
}));

// Get chat history
router.get('/history/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;

  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  const messages = await db.collection('chat_messages')
    .find({ projectId })
    .sort({ timestamp: 1 })
    .limit(limit)
    .toArray();

  res.json({
    success: true,
    data: { messages }
  });
}));

// Clear chat history
router.delete('/history/:projectId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  await db.collection('chat_messages').deleteMany({ projectId });

  logger.info(`Chat history cleared for project ${projectId} by user ${req.user!._id}`);

  res.json({
    success: true,
    data: { message: 'Chat history cleared successfully' }
  });
}));

// Get chat statistics
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

  // Get chat statistics
  const [
    totalMessages,
    userMessages,
    aiMessages,
    systemMessages,
    lastMessage
  ] = await Promise.all([
    db.collection('chat_messages').countDocuments({ projectId }),
    db.collection('chat_messages').countDocuments({ projectId, messageType: 'user' }),
    db.collection('chat_messages').countDocuments({ projectId, messageType: 'assistant' }),
    db.collection('chat_messages').countDocuments({ projectId, messageType: 'system' }),
    db.collection('chat_messages')
      .findOne({ projectId }, { sort: { timestamp: -1 } })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalMessages,
        userMessages,
        aiMessages,
        systemMessages,
        lastMessage: lastMessage?.timestamp
      }
    }
  });
}));

// Helper function to call Gemini API
async function callGeminiAPI(message: string, context: any): Promise<any> {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const startTime = Date.now();

    // Prepare the prompt with context
    const prompt = `
You are an AI assistant for Metrrik, a construction management platform. You help users with construction-related questions and project management.

Project Context:
- Project: ${context.project.name} (${context.project.type})
- Status: ${context.project.status}
- Description: ${context.project.description}

Recent Documents:
${context.documents.map((doc: any) => `- ${doc.title} (${doc.type}): ${doc.content}`).join('\n')}

Recent Files:
${context.files.map((file: any) => `- ${file.name} (${file.type})`).join('\n')}

User Question: ${message}

Please provide a helpful, accurate response related to construction management and this specific project.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const responseTime = Date.now() - startTime;
    const responseText = response.data.candidates[0].content.parts[0].text;

    return {
      text: responseText,
      model: 'gemini-pro',
      tokens: responseText.length, // Approximate token count
      responseTime
    };

  } catch (error) {
    logger.error('Gemini API error:', error);
    throw new Error('Failed to get AI response');
  }
}

export default router;
