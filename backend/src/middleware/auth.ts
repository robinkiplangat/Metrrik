import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../config/database';
import { CustomError } from './errorHandler';
import { logger } from '../utils/logger';

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
    
    // For now, we'll use a simple token validation
    // In production, you should validate the JWT token from Clerk
    if (!token || token === 'undefined') {
      throw new CustomError('Invalid token', 401);
    }

    // Get user from database using the token
    const db = getDatabase();
    const user = await db.collection('users').findOne({ 
      clerkUserId: token // This should be the actual user ID from Clerk
    });

    if (!user) {
      throw new CustomError('User not found', 401);
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
