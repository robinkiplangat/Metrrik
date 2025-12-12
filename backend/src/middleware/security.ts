import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Request correlation ID middleware
export const requestCorrelation = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

// Enhanced security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.gemini.google.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// Enhanced rate limiting with user-based limits
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if available, otherwise fall back to IP
      return (req as any).user?.id || req.ip;
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        correlationId: (req as any).correlationId,
        ip: req.ip,
        userId: (req as any).user?.id,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
      });

      res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(windowMs / 1000),
        },
        correlationId: (req as any).correlationId,
      });
    },
  });
};

// File upload security middleware
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB default

  if (req.file) {
    // Validate file type
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      logger.warn('Invalid file type uploaded', {
        correlationId: (req as any).correlationId,
        mimetype: req.file.mimetype,
        filename: req.file.originalname,
        userId: (req as any).user?.id,
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX',
        },
        correlationId: (req as any).correlationId,
      });
    }

    // Validate file size
    if (req.file.size > maxFileSize) {
      logger.warn('File size exceeded', {
        correlationId: (req as any).correlationId,
        fileSize: req.file.size,
        maxSize: maxFileSize,
        filename: req.file.originalname,
        userId: (req as any).user?.id,
      });

      return res.status(400).json({
        success: false,
        error: {
          message: `File size exceeds maximum allowed size of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        },
        correlationId: (req as any).correlationId,
      });
    }
  }

  return next();
};

// Request validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      logger.warn('Request validation failed', {
        correlationId: (req as any).correlationId,
        error: error.details[0].message,
        endpoint: req.path,
        userId: (req as any).user?.id,
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          details: error.details[0].message,
        },
        correlationId: (req as any).correlationId,
      });
    }

    return next();
  };
};

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.INTERNAL_API_KEY;

  if (!validApiKey) {
    logger.error('INTERNAL_API_KEY not configured');
    return res.status(500).json({
      success: false,
      error: { message: 'Server configuration error' },
      correlationId: (req as any).correlationId,
    });
  }

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key provided', {
      correlationId: (req as any).correlationId,
      ip: req.ip,
      endpoint: req.path,
    });

    return res.status(401).json({
      success: false,
      error: { message: 'Invalid API key' },
      correlationId: (req as any).correlationId,
    });
  }

  return next();
};
