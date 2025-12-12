import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { User } from '../types';

const router = Router();

// Validation middleware
const validateUser = [
  body('clerkUserId').notEmpty().withMessage('Clerk User ID is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').optional().isString().withMessage('First name must be a string'),
  body('lastName').optional().isString().withMessage('Last name must be a string'),
];

// Register/Update user
router.post('/register', validateUser, asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { clerkUserId, email, firstName, lastName } = req.body;
  const db = getDatabase();

  try {
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ clerkUserId });

    if (existingUser) {
      // Update existing user
      const updateData: Partial<User> = {
        email,
        firstName,
        lastName,
        lastLoginAt: new Date(),
        isActive: true
      };

      await db.collection('users').updateOne(
        { clerkUserId },
        { $set: updateData }
      );

      logger.info(`User updated: ${email}`);

      res.json({
        success: true,
        data: {
          message: 'User updated successfully',
          user: { ...existingUser, ...updateData }
        }
      });
    } else {
      // Create new user
      const newUser: User = {
        clerkUserId,
        email,
        firstName,
        lastName,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        preferences: {
          theme: 'light',
          notifications: true,
          defaultProjectType: 'residential'
        }
      };

      const result = await db.collection('users').insertOne(newUser);

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          message: 'User registered successfully',
          user: { ...newUser, _id: result.insertedId }
        }
      });
    }
  } catch (error: any) {
    logger.error('User registration error:', error);
    throw new CustomError('Failed to register user', 500);
  }
}));

// Get user profile
router.get('/profile/:clerkUserId', asyncHandler(async (req: Request, res: Response) => {
  const { clerkUserId } = req.params;
  const db = getDatabase();

  const user = await db.collection('users').findOne({ clerkUserId });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// Update user preferences
router.patch('/preferences/:clerkUserId', [
  body('preferences').isObject().withMessage('Preferences must be an object'),
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { clerkUserId } = req.params;
  const { preferences } = req.body;
  const db = getDatabase();

  const result = await db.collection('users').updateOne(
    { clerkUserId },
    { $set: { preferences } }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('User not found', 404);
  }

  logger.info(`User preferences updated: ${clerkUserId}`);

  res.json({
    success: true,
    data: { message: 'Preferences updated successfully' }
  });
}));

// Deactivate user
router.patch('/deactivate/:clerkUserId', asyncHandler(async (req: Request, res: Response) => {
  const { clerkUserId } = req.params;
  const db = getDatabase();

  const result = await db.collection('users').updateOne(
    { clerkUserId },
    { $set: { isActive: false } }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('User not found', 404);
  }

  logger.info(`User deactivated: ${clerkUserId}`);

  res.json({
    success: true,
    data: { message: 'User deactivated successfully' }
  });
}));

// Get user statistics
router.get('/stats/:clerkUserId', asyncHandler(async (req: Request, res: Response) => {
  const { clerkUserId } = req.params;
  const db = getDatabase();

  const user = await db.collection('users').findOne({ clerkUserId });

  if (!user) {
    throw new CustomError('User not found', 404);
  }

  // Get user statistics
  const [projectsCount, documentsCount, filesCount] = await Promise.all([
    db.collection('projects').countDocuments({ userId: user._id.toString() }),
    db.collection('documents').countDocuments({ userId: user._id.toString() }),
    db.collection('uploaded_files').countDocuments({ userId: user._id.toString() })
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        projects: projectsCount,
        documents: documentsCount,
        files: filesCount,
        memberSince: user.createdAt
      }
    }
  });
}));

export default router;
