import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/database';
import { CustomError } from './errorHandler';
import { logger } from '../utils/logger';
import { createClerkClient, verifyToken } from '@clerk/backend';

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  project?: any;
}

export const authenticateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new CustomError('Access token required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token || token === 'undefined') {
      throw new CustomError('Invalid token', 401);
    }

    // Verify the JWT token with Clerk using verifyToken
    let clerkUserId: string;
    try {
      // verifyToken returns the decoded payload, 'sub' is the user ID
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });

      if (!verified.sub) {
        throw new CustomError('Invalid token: missing subject', 401);
      }
      clerkUserId = verified.sub;
    } catch (error: any) {
      logger.error('Token verification failed:', error);
      throw new CustomError('Invalid or expired token', 401);
    }

    // Get or create user in database
    const db = getDatabase();
    let user = await db.collection('users').findOne({ clerkUserId });

    if (!user) {
      // Auto-create user on first authentication
      try {
        const clerkUser = await clerkClient.users.getUser(clerkUserId);

        const newUser = {
          clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName || undefined,
          lastName: clerkUser.lastName || undefined,
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
        user = { ...newUser, _id: result.insertedId };

        logger.info(`Auto-created user: ${newUser.email}`);
      } catch (error: any) {
        logger.error('Failed to auto-create user:', error);
        throw new CustomError('Failed to create user account', 500);
      }
    } else {
      // Update last login time
      await db.collection('users').updateOne(
        { clerkUserId },
        { $set: { lastLoginAt: new Date() } }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      throw new CustomError('User account is inactive', 401);
    }

    req.user = {
      _id: user._id.toString(),
      clerkUserId: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    if (!token || token === 'undefined') {
      return next();
    }

    // Try to authenticate, but don't fail if it doesn't work
    const db = getDatabase();
    const user = await db.collection('users').findOne({
      clerkUserId: token
    });

    if (user && user.isActive) {
      req.user = {
        _id: user._id.toString(),
        clerkUserId: user.clerkUserId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      };
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.warn('Optional authentication failed:', error);
    next();
  }
};

export const requireProjectAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new CustomError('Authentication required', 401);
    }

    const projectId = req.params.projectId || req.body.projectId;

    if (!projectId) {
      throw new CustomError('Project ID required', 400);
    }

    const db = getDatabase();
    const project = await db.collection('projects').findOne({
      _id: projectId,
      userId: req.user._id
    });

    if (!project) {
      throw new CustomError('Project not found or access denied', 404);
    }

    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};
