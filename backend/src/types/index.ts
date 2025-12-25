import { ObjectId } from 'mongodb';

// User types
export interface User {
  _id?: ObjectId;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    defaultProjectType?: string;
  };
}

// Session types
export interface Session {
  _id?: ObjectId;
  userId: string;
  sessionToken: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
}

// Project types
export interface Project {
  _id?: ObjectId;
  userId: string;
  name: string;
  description?: string;
  type: 'residential' | 'commercial' | 'industrial' | 'infrastructure';
  status: 'planning' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  location?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  budget?: {
    estimated: number;
    actual: number;
    currency: string;
  };
  timeline?: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      name: string;
      dueDate: Date;
      completed: boolean;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Document types
export interface Document {
  _id?: ObjectId;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  type: 'plan' | 'specification' | 'report' | 'contract' | 'permit' | 'other';
  status: 'draft' | 'review' | 'approved' | 'rejected';
  version: number;
  previousVersionId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Chat message types
export interface ChatMessage {
  _id?: ObjectId;
  projectId: string;
  userId: string;
  message: string;
  messageType: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    responseTime?: number;
    context?: string[];
  };
}

// Uploaded file types
export interface UploadedFile {
  _id?: ObjectId;
  projectId: string;
  userId: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
  metadata?: {
    description?: string;
    tags?: string[];
    processed?: boolean;
    extractedText?: string;
  };
}

// Report types
export interface Report {
  _id?: ObjectId;
  projectId: string;
  userId: string;
  reportType: 'progress' | 'financial' | 'quality' | 'safety' | 'compliance';
  title: string;
  content: string;
  generatedAt: Date;
  data: Record<string, any>;
  status: 'generated' | 'reviewed' | 'approved';
}

// Vector embedding types
export interface VectorEmbedding {
  _id?: ObjectId;
  projectId: string;
  documentId?: string;
  content: string;
  embedding: number[];
  embeddingType: 'document' | 'chunk' | 'query';
  model: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Document vector types
export interface DocumentVector {
  _id?: ObjectId;
  documentId: string;
  projectId: string;
  vector: number[];
  metadata: {
    chunkIndex: number;
    chunkSize: number;
    totalChunks: number;
  };
}

// Knowledge graph types
export interface KnowledgeGraph {
  _id?: ObjectId;
  projectId: string;
  entityType: 'project' | 'document' | 'user' | 'location' | 'material' | 'equipment';
  entityId: string;
  entityName: string;
  properties: Record<string, any>;
  relationships: Array<{
    targetEntityId: string;
    relationshipType: string;
    strength: number;
    metadata?: Record<string, any>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  q?: string;
  filters?: Record<string, any>;
}

// File upload types
export interface FileUploadResult {
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
}

// Vector search types
export interface VectorSearchQuery {
  query: string;
  projectId: string;
  limit?: number;
  threshold?: number;
  filters?: Record<string, any>;
}

export interface VectorSearchResult {
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

// Knowledge graph query types
export interface KnowledgeGraphQuery {
  projectId: string;
  entityType?: string;
  entityId?: string;
  relationshipType?: string;
  limit?: number;
}

export interface KnowledgeGraphResult {
  entities: Array<{
    id: string;
    type: string;
    name: string;
    properties: Record<string, any>;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
  }>;
}
