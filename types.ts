
export interface Project {
  id: string;
  name: string;
  client: string;
  lastModified: string;
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