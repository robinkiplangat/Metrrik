
export interface Project {
  id: string;
  name: string;
  client: string;
  lastModified: string;
  status: 'Draft' | 'In Review' | 'Completed';
}

export interface ChatMessage {
  id:string;
  sender: 'user' | 'ai';
  text: string;
  isTyping?: boolean;
}

export interface DocumentVersion {
  version: number;
  createdAt: string;
  content: string;
}

export interface Document {
    id: string;
    name: string;
    type: 'Estimate' | 'Proposal' | 'BQ Draft' | 'Template' | 'Documentation' | 'Request';
    createdAt: string;
    content: string;
    versions: DocumentVersion[];
}

export interface Template {
    id: string;
    name: string;
    description: string;
    type: 'Estimate' | 'Proposal' | 'BQ Draft' | 'Template' | 'Documentation' | 'Request';
    content?: string; // For custom templates
    isCustom?: boolean; // To differentiate user-created templates
}


export interface UploadedFile {
    id: string;
    name: string;
    size: number; // in bytes
    type: string; // MIME type
    uploadedAt: string;
    base64: string;
    status?: 'uploading' | 'completed';
}

// --- Advanced BQ Analysis Types ---

export interface BQItem {
  itemNumber: string;
  description: string;
  unit: string;
  quantity: number;
  unitRateKES: number;
  wastageFactor: number;
  totalCostKES: number;
  boundingBox?: { // Optional coordinates for visual feedback on plans
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AISuggestion {
  suggestionType: 'Alternative Material' | 'Alternative Method' | 'Cost-Saving Tip';
  originalItem: string;
  suggestion: string;
  impact: string;
}

export interface AnalyzedBQ {
  summary: {
    totalEstimatedCostKES: number;
    totalWastageCostKES: number;
    confidenceScore: number;
    regionalPricingDifferences?: Array<{ // Optional regional pricing analysis
        region: string;
        percentageDifference: number;
    }>;
  };
  billOfQuantities: BQItem[];
  intelligentSuggestions: AISuggestion[];
  error?: string; // To handle analysis errors gracefully
}

// Database-related types
export interface User {
  _id?: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  lastLoginAt?: string;
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    defaultProjectType?: string;
  };
}

export interface Session {
  _id?: string;
  userId: string;
  sessionToken: string;
  createdAt: string;
  expiresAt: string;
  lastAccessedAt: string;
  isActive: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export interface ProjectDocument {
  _id?: string;
  userId: string;
  name: string;
  client: string;
  description?: string;
  status: 'Draft' | 'In Review' | 'Completed';
  createdAt: string;
  lastModified: string;
  tags?: string[];
  metadata?: {
    location?: string;
    projectType?: string;
    estimatedValue?: number;
    currency?: string;
  };
}

export interface DocumentDocument {
  _id?: string;
  userId: string;
  projectId?: string;
  name: string;
  type: 'Estimate' | 'Proposal' | 'BQ Draft' | 'Template' | 'Documentation' | 'Request';
  content: string;
  createdAt: string;
  lastModified: string;
  versions: Array<{
    version: number;
    createdAt: string;
    content: string;
    modifiedBy?: string;
  }>;
  tags?: string[];
  isTemplate?: boolean;
  templateId?: string;
}

export interface ChatMessageDocument {
  _id?: string;
  userId: string;
  projectId?: string;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  metadata?: {
    messageType?: string;
    attachments?: string[];
    context?: any;
  };
}

export interface UploadedFileDocument {
  _id?: string;
  userId: string;
  projectId?: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  base64: string;
  status: 'uploading' | 'completed' | 'failed';
  metadata?: {
    analysisResults?: any;
    extractedText?: string;
    fileHash?: string;
  };
}

export interface ReportDocument {
  _id?: string;
  userId: string;
  projectId?: string;
  name: string;
  type: 'Summary' | 'Analysis' | 'Estimate' | 'BQ' | 'Custom';
  content: string;
  generatedAt: string;
  data: any; // Store the actual report data (e.g., AnalyzedBQ)
  metadata?: {
    sourceDocuments?: string[];
    sourceFiles?: string[];
    generationMethod?: string;
    confidenceScore?: number;
  };
}