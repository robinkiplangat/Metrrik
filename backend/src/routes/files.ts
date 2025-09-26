import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../config/database';
import { CustomError, asyncHandler } from '../middleware/errorHandler';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { UploadedFile } from '../types';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common construction file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new CustomError('File type not allowed', 400));
    }
  }
});

// Get all files for a project
router.get('/project/:projectId', authenticateUser, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('fileType').optional().isString().withMessage('File type must be a string'),
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
  const fileType = req.query.fileType as string;
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
  if (fileType) filter.fileType = fileType;
  if (search) {
    filter.$or = [
      { filename: { $regex: search, $options: 'i' } },
      { originalName: { $regex: search, $options: 'i' } }
    ];
  }

  const [files, total] = await Promise.all([
    db.collection('uploaded_files')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ uploadedAt: -1 })
      .toArray(),
    db.collection('uploaded_files').countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: { files },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}));

// Get file by ID
router.get('/:fileId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const db = getDatabase();

  const file = await db.collection('uploaded_files').findOne({ _id: new ObjectId(fileId) });

  if (!file) {
    throw new CustomError('File not found', 404);
  }

  // Check if user has access to this file
  const project = await db.collection('projects').findOne({
    _id: file.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  res.json({
    success: true,
    data: { file }
  });
}));

// Upload file
router.post('/upload/:projectId', authenticateUser, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.params;
  const { description, tags } = req.body;

  if (!req.file) {
    throw new CustomError('No file uploaded', 400);
  }

  const db = getDatabase();

  // Check if project exists and belongs to user
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId),
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Project not found', 404);
  }

  const newFile: UploadedFile = {
    projectId,
    userId: req.user!._id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    filePath: req.file.path,
    uploadedAt: new Date(),
    metadata: {
      description,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
      processed: false
    }
  };

  const result = await db.collection('uploaded_files').insertOne(newFile);
  
  logger.info(`File uploaded: ${req.file.originalname} to project ${projectId}`);

  res.status(201).json({
    success: true,
    data: {
      message: 'File uploaded successfully',
      file: { ...newFile, _id: result.insertedId }
    }
  });
}));

// Download file
router.get('/download/:fileId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const db = getDatabase();

  const file = await db.collection('uploaded_files').findOne({ _id: new ObjectId(fileId) });

  if (!file) {
    throw new CustomError('File not found', 404);
  }

  // Check if user has access to this file
  const project = await db.collection('projects').findOne({
    _id: file.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  // Check if file exists on disk
  if (!fs.existsSync(file.filePath)) {
    throw new CustomError('File not found on disk', 404);
  }

  // Set appropriate headers
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
  res.setHeader('Content-Type', file.fileType);

  // Stream the file
  const fileStream = fs.createReadStream(file.filePath);
  fileStream.pipe(res);

  logger.info(`File downloaded: ${file.originalName} by user ${req.user!._id}`);
}));

// Update file metadata
router.patch('/:fileId', authenticateUser, [
  body('description').optional().isString().withMessage('Description must be a string'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
], asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new CustomError('Validation failed', 400);
  }

  const { fileId } = req.params;
  const { description, tags } = req.body;
  const db = getDatabase();

  // Check if file exists and user has access
  const file = await db.collection('uploaded_files').findOne({ _id: new ObjectId(fileId) });

  if (!file) {
    throw new CustomError('File not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: file.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  const updateData: any = {};

  if (description !== undefined) {
    updateData['metadata.description'] = description;
  }
  if (tags !== undefined) {
    updateData['metadata.tags'] = tags;
  }

  const result = await db.collection('uploaded_files').updateOne(
    { _id: new ObjectId(fileId) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new CustomError('File not found', 404);
  }

  logger.info(`File metadata updated: ${fileId}`);

  res.json({
    success: true,
    data: { message: 'File metadata updated successfully' }
  });
}));

// Delete file
router.delete('/:fileId', authenticateUser, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const db = getDatabase();

  // Check if file exists and user has access
  const file = await db.collection('uploaded_files').findOne({ _id: new ObjectId(fileId) });

  if (!file) {
    throw new CustomError('File not found', 404);
  }

  const project = await db.collection('projects').findOne({
    _id: file.projectId,
    userId: req.user!._id
  });

  if (!project) {
    throw new CustomError('Access denied', 403);
  }

  // Delete file from disk
  if (fs.existsSync(file.filePath)) {
    fs.unlinkSync(file.filePath);
  }

  // Delete file record from database
  await db.collection('uploaded_files').deleteOne({ _id: new ObjectId(fileId) });

  logger.info(`File deleted: ${file.originalName}`);

  res.json({
    success: true,
    data: { message: 'File deleted successfully' }
  });
}));

// Get file statistics
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

  // Get file statistics
  const [
    totalFiles,
    totalSize,
    filesByType
  ] = await Promise.all([
    db.collection('uploaded_files').countDocuments({ projectId }),
    db.collection('uploaded_files').aggregate([
      { $match: { projectId } },
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
    ]).toArray(),
    db.collection('uploaded_files').aggregate([
      { $match: { projectId } },
      { $group: { _id: '$fileType', count: { $sum: 1 } } }
    ]).toArray()
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        totalFiles,
        totalSize: totalSize[0]?.totalSize || 0,
        filesByType
      }
    }
  });
}));

export default router;
