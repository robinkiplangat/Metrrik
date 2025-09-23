import { 
  createDocument,
  getDocumentsByUser,
  updateDocument,
  saveReport,
  getReportsByUser
} from './databaseInit';
import { userService } from './userService';
import type { 
  Document, 
  AnalyzedBQ,
  ReportDocument
} from '../types';

// Vector embedding interface
export interface VectorEmbedding {
  _id?: string;
  userId: string;
  documentId?: string;
  projectId?: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'document' | 'chat' | 'file' | 'report';
    language: string;
    createdAt: string;
    model: string;
    source?: string;
    tags?: string[];
  };
}

export interface DocumentVector {
  _id?: string;
  userId: string;
  projectId?: string;
  documentId: string;
  chunks: Array<{
    chunkId: string;
    content: string;
    embedding: number[];
    metadata: {
      position: number;
      length: number;
      type: string;
    };
  }>;
  metadata: {
    totalChunks: number;
    createdAt: string;
    updatedAt: string;
    model: string;
  };
}

export interface VectorSearchResult {
  document: Document | ReportDocument;
  similarity: number;
  chunk?: {
    chunkId: string;
    content: string;
    metadata: any;
  };
}

export class VectorService {
  private static instance: VectorService;
  private embeddingModel: string = 'text-embedding-ada-002'; // Default model

  private constructor() {}

  public static getInstance(): VectorService {
    if (!VectorService.instance) {
      VectorService.instance = new VectorService();
    }
    return VectorService.instance;
  }

  // Generate embeddings for text content
  public async generateEmbedding(text: string): Promise<number[]> {
    // In a real implementation, this would call an embedding service like OpenAI, Cohere, or local model
    // For now, we'll generate a mock embedding
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0); // 384-dimensional embedding
    
    // Simple hash-based embedding generation for demo
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      const position = hash % 384;
      embedding[position] += 1 / (index + 1);
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  // Simple hash function for demo purposes
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Calculate cosine similarity between two embeddings
  public calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Chunk text into smaller pieces for better vector search
  public chunkText(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  // Create vector embedding for a document
  public async createDocumentEmbedding(document: Document): Promise<VectorEmbedding> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Generate embedding for the document content
    const embedding = await this.generateEmbedding(document.content);
    
    const vectorEmbedding: VectorEmbedding = {
      userId,
      documentId: document.id,
      content: document.content,
      embedding,
      metadata: {
        type: 'document',
        language: 'en',
        createdAt: new Date().toISOString(),
        model: this.embeddingModel,
        source: 'document',
        tags: [document.type]
      }
    };

    // In a real implementation, this would save to the vectorEmbeddings collection
    // For now, we'll return the embedding object
    return vectorEmbedding;
  }

  // Create vector embeddings for document chunks
  public async createDocumentChunks(document: Document): Promise<DocumentVector> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Chunk the document content
    const chunks = this.chunkText(document.content);
    const documentChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      
      documentChunks.push({
        chunkId: `${document.id}_chunk_${i}`,
        content: chunk,
        embedding,
        metadata: {
          position: i,
          length: chunk.length,
          type: 'text'
        }
      });
    }

    const documentVector: DocumentVector = {
      userId,
      projectId: undefined, // Will be set when saving
      documentId: document.id,
      chunks: documentChunks,
      metadata: {
        totalChunks: chunks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: this.embeddingModel
      }
    };

    return documentVector;
  }

  // Search for similar documents using vector similarity
  public async searchSimilarDocuments(
    query: string, 
    projectId?: string, 
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Generate embedding for the search query
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Get all documents for the user/project
    const documents = await getDocumentsByUser(userId as any, projectId as any);
    
    // Calculate similarities (in a real implementation, this would use vector search)
    const results: VectorSearchResult[] = [];
    
    for (const document of documents) {
      try {
        // Create embedding for document content
        const docEmbedding = await this.generateEmbedding(document.content);
        
        // Calculate similarity
        const similarity = this.calculateSimilarity(queryEmbedding, docEmbedding);
        
        if (similarity > 0.1) { // Threshold for relevance
          results.push({
            document: {
              id: document._id!,
              name: document.name,
              type: document.type,
              createdAt: document.createdAt,
              content: document.content,
              versions: document.versions.map(v => ({
                version: v.version,
                createdAt: v.createdAt,
                content: v.content,
              })),
            },
            similarity
          });
        }
      } catch (error) {
        console.error(`Error processing document ${document._id}:`, error);
      }
    }
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Search for similar content within a specific document
  public async searchWithinDocument(
    documentId: string, 
    query: string, 
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get the document
    const documents = await getDocumentsByUser(userId as any);
    const document = documents.find(doc => doc._id === documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }

    // Create document chunks
    const documentVector = await this.createDocumentChunks({
      id: document._id!,
      name: document.name,
      type: document.type,
      createdAt: document.createdAt,
      content: document.content,
      versions: document.versions.map(v => ({
        version: v.version,
        createdAt: v.createdAt,
        content: v.content,
      })),
    });

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search within chunks
    const results: VectorSearchResult[] = [];
    
    for (const chunk of documentVector.chunks) {
      const similarity = this.calculateSimilarity(queryEmbedding, chunk.embedding);
      
      if (similarity > 0.1) {
        results.push({
          document: {
            id: document._id!,
            name: document.name,
            type: document.type,
            createdAt: document.createdAt,
            content: document.content,
            versions: document.versions.map(v => ({
              version: v.version,
              createdAt: v.createdAt,
              content: v.content,
            })),
          },
          similarity,
          chunk: {
            chunkId: chunk.chunkId,
            content: chunk.content,
            metadata: chunk.metadata
          }
        });
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  // Create embeddings for chat messages
  public async createChatEmbedding(
    message: string, 
    sessionId: string, 
    projectId?: string
  ): Promise<VectorEmbedding> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const embedding = await this.generateEmbedding(message);
    
    return {
      userId,
      projectId,
      content: message,
      embedding,
      metadata: {
        type: 'chat',
        language: 'en',
        createdAt: new Date().toISOString(),
        model: this.embeddingModel,
        source: sessionId,
        tags: ['chat', 'message']
      }
    };
  }

  // Create embeddings for uploaded files
  public async createFileEmbedding(
    fileName: string, 
    content: string, 
    projectId?: string
  ): Promise<VectorEmbedding> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const embedding = await this.generateEmbedding(content);
    
    return {
      userId,
      projectId,
      content,
      embedding,
      metadata: {
        type: 'file',
        language: 'en',
        createdAt: new Date().toISOString(),
        model: this.embeddingModel,
        source: fileName,
        tags: ['file', 'upload']
      }
    };
  }

  // Create embeddings for reports
  public async createReportEmbedding(
    report: ReportDocument
  ): Promise<VectorEmbedding> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const embedding = await this.generateEmbedding(report.content);
    
    return {
      userId,
      projectId: report.projectId,
      content: report.content,
      embedding,
      metadata: {
        type: 'report',
        language: 'en',
        createdAt: new Date().toISOString(),
        model: this.embeddingModel,
        source: 'report',
        tags: [report.type, 'analysis']
      }
    };
  }

  // Get embedding model info
  public getEmbeddingModel(): string {
    return this.embeddingModel;
  }

  // Set embedding model
  public setEmbeddingModel(model: string): void {
    this.embeddingModel = model;
  }
}

// Export singleton instance
export const vectorService = VectorService.getInstance();
