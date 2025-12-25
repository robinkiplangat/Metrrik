// Service organization index
// This file provides clean imports for all services

// Client-side services (frontend only)
export { analysisApi, ApiService } from './client/apiService';
export { generateChatResponse, analyzeFloorPlan, generateProjectSummary, generateDocumentContent } from './client/geminiService';
export { userService } from './client/userService';

// Server-side services (backend only)
export { projectService } from './server/projectService';
export { documentService } from './server/documentService';
export { mongodbService } from './server/mongodbService';
export { knowledgeBaseService } from './server/knowledgeBaseService';
export { knowledgeGraphService } from './server/knowledgeGraphService';
export { vectorService } from './server/vectorService';
export { databaseInit } from './server/databaseInit';

// Shared types and utilities
export * from './shared/types';

// Re-export commonly used types for convenience
export type {
  Project,
  Document,
  UploadedFile,
  ChatMessage,
  AnalyzedBQ,
  BQItem,
  User,
  ReportDocument,
  VectorSearchResult,
  VectorEmbedding,
  DocumentVector
} from './shared/types';
