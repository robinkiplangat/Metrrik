
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