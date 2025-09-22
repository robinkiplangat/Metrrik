
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
}


export interface UploadedFile {
    id: string;
    name: string;
    size: number; // in bytes
    type: string; // MIME type
    uploadedAt: string;
    base64: string;
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
  };
  billOfQuantities: BQItem[];
  intelligentSuggestions: AISuggestion[];
  error?: string; // To handle analysis errors gracefully
}
