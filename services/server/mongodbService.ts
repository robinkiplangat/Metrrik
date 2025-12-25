import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import type { Document, Project, ChatMessage, UploadedFile, AnalyzedBQ } from '../types';

// MongoDB connection
let client: MongoClient;
let db: Db;

// Collection references
let usersCollection: Collection;
let sessionsCollection: Collection;
let projectsCollection: Collection;
let documentsCollection: Collection;
let chatMessagesCollection: Collection;
let uploadedFilesCollection: Collection;
let reportsCollection: Collection;

// Database schemas
export interface User {
  _id?: ObjectId;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    defaultProjectType?: string;
  };
}

export interface Session {
  _id?: ObjectId;
  userId: ObjectId;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export interface ProjectDocument {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  client: string;
  description?: string;
  status: 'Draft' | 'In Review' | 'Completed';
  createdAt: Date;
  lastModified: Date;
  tags?: string[];
  metadata?: {
    location?: string;
    projectType?: string;
    estimatedValue?: number;
    currency?: string;
  };
}

export interface DocumentDocument {
  _id?: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId;
  name: string;
  type: 'Estimate' | 'Proposal' | 'BQ Draft' | 'Template' | 'Documentation' | 'Request';
  content: string;
  createdAt: Date;
  lastModified: Date;
  versions: Array<{
    version: number;
    createdAt: Date;
    content: string;
    modifiedBy?: string;
  }>;
  tags?: string[];
  isTemplate?: boolean;
  templateId?: ObjectId;
}

export interface ChatMessageDocument {
  _id?: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  metadata?: {
    messageType?: string;
    attachments?: string[];
    context?: any;
  };
}

export interface UploadedFileDocument {
  _id?: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  base64: string;
  status: 'uploading' | 'completed' | 'failed';
  metadata?: {
    analysisResults?: any;
    extractedText?: string;
    fileHash?: string;
  };
}

export interface ReportDocument {
  _id?: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId;
  name: string;
  type: 'Summary' | 'Analysis' | 'Estimate' | 'BQ' | 'Custom';
  content: string;
  generatedAt: Date;
  data: any; // Store the actual report data (e.g., AnalyzedBQ)
  metadata?: {
    sourceDocuments?: ObjectId[];
    sourceFiles?: ObjectId[];
    generationMethod?: string;
    confidenceScore?: number;
  };
}

// Initialize MongoDB connection
export const initializeMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(mongoUri);
    await client.connect();

    // Use the database name from the URI or default to 'metrrik'
    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'metrrik';
    db = client.db(dbName);

    // Initialize collections
    usersCollection = db.collection<User>('users');
    sessionsCollection = db.collection<Session>('sessions');
    projectsCollection = db.collection<ProjectDocument>('projects');
    documentsCollection = db.collection<DocumentDocument>('documents');
    chatMessagesCollection = db.collection<ChatMessageDocument>('chatMessages');
    uploadedFilesCollection = db.collection<UploadedFileDocument>('uploadedFiles');
    reportsCollection = db.collection<ReportDocument>('reports');

    // Create indexes for better performance
    await createIndexes();

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Create database indexes
const createIndexes = async (): Promise<void> => {
  try {
    // Users collection indexes
    await usersCollection.createIndex({ clerkUserId: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 }, { unique: true });

    // Sessions collection indexes
    await sessionsCollection.createIndex({ sessionToken: 1 }, { unique: true });
    await sessionsCollection.createIndex({ userId: 1 });
    await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Projects collection indexes
    await projectsCollection.createIndex({ userId: 1 });
    await projectsCollection.createIndex({ status: 1 });
    await projectsCollection.createIndex({ createdAt: -1 });

    // Documents collection indexes
    await documentsCollection.createIndex({ userId: 1 });
    await documentsCollection.createIndex({ projectId: 1 });
    await documentsCollection.createIndex({ type: 1 });
    await documentsCollection.createIndex({ createdAt: -1 });

    // Chat messages collection indexes
    await chatMessagesCollection.createIndex({ userId: 1 });
    await chatMessagesCollection.createIndex({ projectId: 1 });
    await chatMessagesCollection.createIndex({ sessionId: 1 });
    await chatMessagesCollection.createIndex({ timestamp: -1 });

    // Uploaded files collection indexes
    await uploadedFilesCollection.createIndex({ userId: 1 });
    await uploadedFilesCollection.createIndex({ projectId: 1 });
    await uploadedFilesCollection.createIndex({ uploadedAt: -1 });

    // Reports collection indexes
    await reportsCollection.createIndex({ userId: 1 });
    await reportsCollection.createIndex({ projectId: 1 });
    await reportsCollection.createIndex({ type: 1 });
    await reportsCollection.createIndex({ generatedAt: -1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Failed to create indexes:', error);
    throw error;
  }
};

// User management functions
export const createOrUpdateUser = async (clerkUser: any): Promise<User> => {
  const userData: Partial<User> = {
    clerkUserId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    lastLoginAt: new Date(),
  };

  const result = await usersCollection.findOneAndUpdate(
    { clerkUserId: clerkUser.id },
    {
      $set: userData,
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true, returnDocument: 'after' }
  );

  return result.value!;
};

export const getUserByClerkId = async (clerkUserId: string): Promise<User | null> => {
  return await usersCollection.findOne({ clerkUserId });
};

// Session management functions
export const createSession = async (userId: ObjectId, sessionToken: string, userAgent?: string, ipAddress?: string): Promise<Session> => {
  const session: Session = {
    userId,
    sessionToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    lastAccessedAt: new Date(),
    isActive: true,
    userAgent,
    ipAddress,
  };

  const result = await sessionsCollection.insertOne(session);
  return { ...session, _id: result.insertedId };
};

export const getSessionByToken = async (sessionToken: string): Promise<Session | null> => {
  return await sessionsCollection.findOne({ sessionToken, isActive: true });
};

export const updateSessionAccess = async (sessionId: ObjectId): Promise<void> => {
  await sessionsCollection.updateOne(
    { _id: sessionId },
    { $set: { lastAccessedAt: new Date() } }
  );
};

export const invalidateSession = async (sessionToken: string): Promise<void> => {
  await sessionsCollection.updateOne(
    { sessionToken },
    { $set: { isActive: false } }
  );
};

// Project management functions
export const createProject = async (userId: ObjectId, projectData: Partial<ProjectDocument>): Promise<ProjectDocument> => {
  const project: ProjectDocument = {
    userId,
    name: projectData.name || 'Untitled Project',
    client: projectData.client || 'Unknown Client',
    description: projectData.description,
    status: 'Draft',
    createdAt: new Date(),
    lastModified: new Date(),
    tags: projectData.tags || [],
    metadata: projectData.metadata,
  };

  const result = await projectsCollection.insertOne(project);
  return { ...project, _id: result.insertedId };
};

export const getProjectsByUser = async (userId: ObjectId): Promise<ProjectDocument[]> => {
  return await projectsCollection.find({ userId }).sort({ lastModified: -1 }).toArray();
};

export const updateProject = async (projectId: ObjectId, updates: Partial<ProjectDocument>): Promise<void> => {
  await projectsCollection.updateOne(
    { _id: projectId },
    {
      $set: {
        ...updates,
        lastModified: new Date()
      }
    }
  );
};

export const deleteProject = async (projectId: ObjectId): Promise<void> => {
  await projectsCollection.deleteOne({ _id: projectId });
};

// Document management functions
export const createDocument = async (userId: ObjectId, documentData: Partial<DocumentDocument>): Promise<DocumentDocument> => {
  const document: DocumentDocument = {
    userId,
    projectId: documentData.projectId,
    name: documentData.name || 'Untitled Document',
    type: documentData.type || 'Documentation',
    content: documentData.content || '',
    createdAt: new Date(),
    lastModified: new Date(),
    versions: [{
      version: 1,
      createdAt: new Date(),
      content: documentData.content || '',
    }],
    tags: documentData.tags || [],
    isTemplate: documentData.isTemplate || false,
    templateId: documentData.templateId,
  };

  const result = await documentsCollection.insertOne(document);
  return { ...document, _id: result.insertedId };
};

export const getDocumentsByUser = async (userId: ObjectId, projectId?: ObjectId): Promise<DocumentDocument[]> => {
  const filter: any = { userId };
  if (projectId) {
    filter.projectId = projectId;
  }
  return await documentsCollection.find(filter).sort({ lastModified: -1 }).toArray();
};

export const updateDocument = async (documentId: ObjectId, updates: Partial<DocumentDocument>): Promise<void> => {
  const document = await documentsCollection.findOne({ _id: documentId });
  if (!document) {
    throw new Error('Document not found');
  }

  const newVersion = {
    version: document.versions.length + 1,
    createdAt: new Date(),
    content: updates.content || document.content,
  };

  await documentsCollection.updateOne(
    { _id: documentId },
    {
      $set: {
        ...updates,
        lastModified: new Date()
      },
      $push: { versions: newVersion }
    }
  );
};

// Chat message functions
export const saveChatMessage = async (userId: ObjectId, messageData: Partial<ChatMessageDocument>): Promise<ChatMessageDocument> => {
  const message: ChatMessageDocument = {
    userId,
    projectId: messageData.projectId,
    sessionId: messageData.sessionId || 'default',
    sender: messageData.sender || 'user',
    text: messageData.text || '',
    timestamp: new Date(),
    metadata: messageData.metadata,
  };

  const result = await chatMessagesCollection.insertOne(message);
  return { ...message, _id: result.insertedId };
};

export const getChatMessagesBySession = async (userId: ObjectId, sessionId: string): Promise<ChatMessageDocument[]> => {
  return await chatMessagesCollection.find({ userId, sessionId }).sort({ timestamp: 1 }).toArray();
};

// File upload functions
export const saveUploadedFile = async (userId: ObjectId, fileData: Partial<UploadedFileDocument>): Promise<UploadedFileDocument> => {
  const file: UploadedFileDocument = {
    userId,
    projectId: fileData.projectId,
    name: fileData.name || 'untitled',
    originalName: fileData.originalName || fileData.name || 'untitled',
    size: fileData.size || 0,
    mimeType: fileData.mimeType || 'application/octet-stream',
    uploadedAt: new Date(),
    base64: fileData.base64 || '',
    status: 'completed',
    metadata: fileData.metadata,
  };

  const result = await uploadedFilesCollection.insertOne(file);
  return { ...file, _id: result.insertedId };
};

export const getUploadedFilesByUser = async (userId: ObjectId, projectId?: ObjectId): Promise<UploadedFileDocument[]> => {
  const filter: any = { userId };
  if (projectId) {
    filter.projectId = projectId;
  }
  return await uploadedFilesCollection.find(filter).sort({ uploadedAt: -1 }).toArray();
};

// Report functions
export const saveReport = async (userId: ObjectId, reportData: Partial<ReportDocument>): Promise<ReportDocument> => {
  const report: ReportDocument = {
    userId,
    projectId: reportData.projectId,
    name: reportData.name || 'Untitled Report',
    type: reportData.type || 'Summary',
    content: reportData.content || '',
    generatedAt: new Date(),
    data: reportData.data || {},
    metadata: reportData.metadata,
  };

  const result = await reportsCollection.insertOne(report);
  return { ...report, _id: result.insertedId };
};

export const getReportsByUser = async (userId: ObjectId, projectId?: ObjectId): Promise<ReportDocument[]> => {
  const filter: any = { userId };
  if (projectId) {
    filter.projectId = projectId;
  }
  return await reportsCollection.find(filter).sort({ generatedAt: -1 }).toArray();
};

// Cleanup function
export const closeMongoDBConnection = async (): Promise<void> => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Health check
export const checkMongoDBHealth = async (): Promise<boolean> => {
  try {
    await db.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
};
