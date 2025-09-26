import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all users (admin only)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().withMessage('Search must be a string'),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const skip = (page - 1) * limit;

  const db = getDatabase();
  let filter: any = {};

  // Add search filter if provided
  if (search) {
    filter = {
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    };
  }

  const [users, total] = await Promise.all([
    db.collection('users')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection('users').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { users },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Get user by ID
router.get('/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const db = getDatabase();

  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  
  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Update user profile
router.patch('/:userId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { firstName, lastName, preferences } = req.body;

  // Check if user is updating their own profile
  if (req.user?._id !== userId) {
    throw new CustomError('Access denied', 403);
  }

  const db = getDatabase();
  const updateData: any = {};

  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (preferences !== undefined) updateData.preferences = preferences;

  if (Object.keys(updateData).length === 0) {
    throw new CustomError('No valid fields to update', 400);
  }

  const result = await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('User not found', 404);
  }

  logger.info(`User profile updated: ${userId}`);

  res.json({
    success: true,
    data: { message: 'Profile updated successfully' }
  });
}));

// Get user activity
router.get('/:userId/activity', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  // Check if user is accessing their own activity
  if (req.user?._id !== userId) {
    throw new CustomError('Access denied', 403);
  }

  const db = getDatabase();

  // Get recent activity from various collections
  const [recentProjects, recentDocuments, recentFiles, recentChats] = await Promise.all([
    db.collection('projects')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray(),
    db.collection('documents')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray(),
    db.collection('uploaded_files')
      .find({ userId })
      .sort({ uploadedAt: -1 })
      .limit(5)
      .toArray(),
    db.collection('chat_messages')
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray()
  ]);

  res.json({
    success: true,
    data: {
      activity: {
        recentProjects,
        recentDocuments,
        recentFiles,
        recentChats
      }
    }
  });
}));

// Get user dashboard data
router.get('/:userId/dashboard', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  // Check if user is accessing their own dashboard
  if (req.user?._id !== userId) {
    throw new CustomError('Access denied', 403);
  }

  const db = getDatabase();

  // Get dashboard statistics
  const [
    totalProjects,
    activeProjects,
    totalDocuments,
    totalFiles,
    recentActivity
  ] = await Promise.all([
    db.collection('projects').countDocuments({ userId }),
    db.collection('projects').countDocuments({ userId, status: 'active' }),
    db.collection('documents').countDocuments({ userId }),
    db.collection('uploaded_files').countDocuments({ userId }),
    db.collection('projects')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .toArray()
  ]);

  res.json({
    success: true,
    data: {
      dashboard: {
        stats: {
          totalProjects,
          activeProjects,
          totalDocuments,
          totalFiles
        },
        recentActivity
      }
    }
  });
}));

export default router;
