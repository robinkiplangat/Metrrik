import { llmService } from './llm/llmService';
import { LLMProvider, LLMTaskType } from '../shared/llm/types';
import { vectorService } from './vectorService';
import { projectService } from './projectService';
import { userService } from './userService';
import type { ChatMessage, Document, UploadedFile, ReportDocument, AnalyzedBQ } from '../types';
import type { VectorSearchResult } from './vectorService';

// Enhanced system instruction with knowledge base context
const ENHANCED_SYSTEM_INSTRUCTION = `You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya. You have access to a comprehensive knowledge base that includes:

1. **Project Documents**: Estimates, proposals, BQ drafts, and documentation
2. **Historical Data**: Previous projects, cost analyses, and reports
3. **Construction Knowledge**: Local pricing, materials, and methods in Kenya
4. **User Context**: Current project information and user preferences

Your capabilities include:
- **Contextual Responses**: Use relevant project documents and historical data to provide accurate, personalized responses
- **Cost Estimation**: Provide realistic, localized costs for Kenya (Nairobi, Mombasa, Kisumu) based on current market data
- **Document Analysis**: Analyze uploaded files, drawings, and documents with project context
- **Knowledge Retrieval**: Search through project history and documents to find relevant information
- **Professional Guidance**: Offer expert advice based on quantity surveying best practices

Guidelines:
- Always reference relevant documents or data when available
- Provide specific, actionable recommendations
- Use professional terminology appropriate for quantity surveyors
- Format responses with clear markdown structure
- Include confidence levels when referencing historical data
- Suggest next steps based on project context

When you have access to project context, use it to provide more relevant and accurate responses.`;

export interface KnowledgeContext {
  projectId?: string;
  userId: string;
  relevantDocuments: Document[];
  relevantReports: ReportDocument[];
  relevantFiles: UploadedFile[];
  chatHistory: ChatMessage[];
  searchResults?: VectorSearchResult[];
}

export interface EnhancedChatResponse {
  response: string;
  context: {
    documentsUsed: string[];
    confidence: number;
    sources: string[];
    suggestions: string[];
  };
}

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;

  private constructor() {
    // No longer need to initialize Gemini directly
  }

  public static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  // Get knowledge context for a query
  public async getKnowledgeContext(
    query: string,
    projectId?: string
  ): Promise<KnowledgeContext> {
    const userId = userService.getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Perform vector search to find relevant documents
    const searchResults = await vectorService.searchSimilarDocuments(query, projectId, 5);

    // Get relevant documents, reports, and files
    const [documents, reports, files] = await Promise.all([
      projectService.getUserDocuments(projectId),
      projectService.getUserReports(projectId),
      projectService.getUserFiles(projectId)
    ]);

    // Get recent chat history
    const chatHistory = await projectService.getChatHistory(`project-${projectId || 'general'}`);

    return {
      projectId,
      userId,
      relevantDocuments: documents,
      relevantReports: reports,
      relevantFiles: files,
      chatHistory: chatHistory.slice(-10), // Last 10 messages
      searchResults
    };
  }

  // Generate enhanced chat response with knowledge base context
  public async generateEnhancedResponse(
    query: string,
    projectId?: string,
    chatHistory: ChatMessage[] = []
  ): Promise<EnhancedChatResponse> {
    try {
      // Get knowledge context
      const context = await this.getKnowledgeContext(query, projectId);

      // Build context prompt
      const contextPrompt = this.buildContextPrompt(query, context, chatHistory);

      // Generate response using LLM service
      const response = await llmService.generate(
        {
          prompt: contextPrompt,
          systemInstruction: ENHANCED_SYSTEM_INSTRUCTION
        },
        {
          provider: LLMProvider.GEMINI,
          taskType: LLMTaskType.CHAT,
          useCache: true,
          trackCost: true,
          userId: context.userId,
          projectId: context.projectId
        }
      );

      // Extract context information
      const contextInfo = this.extractContextInfo(context, response.text);

      return {
        response: response.text,
        context: contextInfo
      };
    } catch (error) {
      console.error("Error generating enhanced response:", error);
      return {
        response: "I apologize, but I encountered an error while processing your request. Please try again.",
        context: {
          documentsUsed: [],
          confidence: 0,
          sources: [],
          suggestions: ["Try rephrasing your question", "Check your project context"]
        }
      };
    }
  }

  // Build context prompt with relevant information
  private buildContextPrompt(
    query: string,
    context: KnowledgeContext,
    chatHistory: ChatMessage[]
  ): string {
    let prompt = `User Query: "${query}"\n\n`;

    // Add project context
    if (context.projectId) {
      prompt += `## Project Context\n`;
      prompt += `Current Project ID: ${context.projectId}\n\n`;
    }

    // Add relevant documents
    if (context.relevantDocuments.length > 0) {
      prompt += `## Relevant Documents\n`;
      context.relevantDocuments.slice(0, 3).forEach((doc, index) => {
        prompt += `${index + 1}. **${doc.name}** (${doc.type})\n`;
        prompt += `   Content: ${doc.content.substring(0, 500)}...\n\n`;
      });
    }

    // Add relevant reports
    if (context.relevantReports.length > 0) {
      prompt += `## Relevant Reports\n`;
      context.relevantReports.slice(0, 2).forEach((report, index) => {
        prompt += `${index + 1}. **${report.name}** (${report.type})\n`;
        prompt += `   Content: ${report.content.substring(0, 300)}...\n\n`;
      });
    }

    // Add vector search results
    if (context.searchResults && context.searchResults.length > 0) {
      prompt += `## Similar Content Found\n`;
      context.searchResults.slice(0, 3).forEach((result, index) => {
        prompt += `${index + 1}. **${result.document.name}** (Similarity: ${(result.similarity * 100).toFixed(1)}%)\n`;
        if (result.chunk) {
          prompt += `   Relevant section: ${result.chunk.content.substring(0, 200)}...\n\n`;
        }
      });
    }

    // Add recent chat history
    if (chatHistory.length > 0) {
      prompt += `## Recent Conversation\n`;
      chatHistory.slice(-5).forEach((msg, index) => {
        prompt += `${msg.sender}: ${msg.text.substring(0, 100)}...\n`;
      });
      prompt += `\n`;
    }

    prompt += `## Instructions\n`;
    prompt += `Based on the above context, provide a comprehensive and accurate response to the user's query. `;
    prompt += `Reference specific documents, data, or previous conversations when relevant. `;
    prompt += `If you're referencing specific information, mention the source document or report. `;
    prompt += `Provide actionable recommendations and next steps when appropriate.`;

    return prompt;
  }

  // Extract context information from response
  private extractContextInfo(
    context: KnowledgeContext,
    response: string
  ): {
    documentsUsed: string[];
    confidence: number;
    sources: string[];
    suggestions: string[];
  } {
    const documentsUsed: string[] = [];
    const sources: string[] = [];
    const suggestions: string[] = [];

    // Extract document references from response
    context.relevantDocuments.forEach(doc => {
      if (response.includes(doc.name)) {
        documentsUsed.push(doc.name);
        sources.push(`Document: ${doc.name}`);
      }
    });

    // Extract report references
    context.relevantReports.forEach(report => {
      if (response.includes(report.name)) {
        documentsUsed.push(report.name);
        sources.push(`Report: ${report.name}`);
      }
    });

    // Calculate confidence based on available context
    let confidence = 0.5; // Base confidence
    if (context.relevantDocuments.length > 0) confidence += 0.2;
    if (context.relevantReports.length > 0) confidence += 0.1;
    if (context.searchResults && context.searchResults.length > 0) confidence += 0.2;
    if (context.chatHistory.length > 0) confidence += 0.1;

    // Generate suggestions based on context
    if (context.relevantDocuments.length === 0) {
      suggestions.push("Consider uploading relevant documents for better context");
    }
    if (context.relevantReports.length === 0) {
      suggestions.push("Generate reports to build project knowledge base");
    }
    if (context.searchResults && context.searchResults.length === 0) {
      suggestions.push("Try different keywords or phrases for your search");
    }

    return {
      documentsUsed,
      confidence: Math.min(confidence, 1.0),
      sources,
      suggestions
    };
  }

  // Search knowledge base for specific information
  public async searchKnowledgeBase(
    query: string,
    projectId?: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    return await vectorService.searchSimilarDocuments(query, projectId, limit);
  }

  // Get project insights based on historical data
  public async getProjectInsights(projectId: string): Promise<{
    costTrends: any[];
    commonMaterials: string[];
    recommendations: string[];
    similarProjects: any[];
  }> {
    try {
      const [documents, reports, files] = await Promise.all([
        projectService.getUserDocuments(projectId),
        projectService.getUserReports(projectId),
        projectService.getUserFiles(projectId)
      ]);

      // Analyze cost trends from documents
      const costTrends = this.analyzeCostTrends(documents);

      // Extract common materials
      const commonMaterials = this.extractCommonMaterials(documents);

      // Generate recommendations
      const recommendations = this.generateRecommendations(documents, reports);

      // Find similar projects (simplified)
      const similarProjects = await this.findSimilarProjects(projectId);

      return {
        costTrends,
        commonMaterials,
        recommendations,
        similarProjects
      };
    } catch (error) {
      console.error('Error getting project insights:', error);
      return {
        costTrends: [],
        commonMaterials: [],
        recommendations: [],
        similarProjects: []
      };
    }
  }

  // Analyze cost trends from documents
  private analyzeCostTrends(documents: Document[]): any[] {
    const trends: any[] = [];

    documents.forEach(doc => {
      if (doc.type === 'Estimate' && doc.content.includes('KES')) {
        // Extract cost information (simplified)
        const costMatches = doc.content.match(/KES\s*([\d,]+)/g);
        if (costMatches) {
          trends.push({
            document: doc.name,
            costs: costMatches,
            date: doc.createdAt
          });
        }
      }
    });

    return trends;
  }

  // Extract common materials from documents
  private extractCommonMaterials(documents: Document[]): string[] {
    const materials = new Set<string>();

    documents.forEach(doc => {
      const content = doc.content.toLowerCase();
      const materialKeywords = [
        'concrete', 'steel', 'brick', 'block', 'tiles', 'paint', 'roofing',
        'timber', 'glass', 'aluminum', 'cement', 'sand', 'gravel'
      ];

      materialKeywords.forEach(material => {
        if (content.includes(material)) {
          materials.add(material);
        }
      });
    });

    return Array.from(materials);
  }

  // Generate recommendations based on project data
  private generateRecommendations(documents: Document[], reports: ReportDocument[]): string[] {
    const recommendations: string[] = [];

    if (documents.length === 0) {
      recommendations.push("Create initial project documents to build knowledge base");
    }

    if (reports.length === 0) {
      recommendations.push("Generate analysis reports for better project insights");
    }

    if (documents.filter(d => d.type === 'Estimate').length === 0) {
      recommendations.push("Create cost estimates for better budget planning");
    }

    return recommendations;
  }

  // Find similar projects (simplified implementation)
  private async findSimilarProjects(projectId: string): Promise<any[]> {
    // This would typically involve more sophisticated similarity matching
    // For now, return empty array
    return [];
  }

  // Update knowledge base with new information
  public async updateKnowledgeBase(
    content: string,
    type: 'document' | 'chat' | 'file' | 'report',
    projectId?: string
  ): Promise<void> {
    try {
      const userId = userService.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create embedding for the content
      const embedding = await vectorService.generateEmbedding(content);

      // Save to vector database (this would be implemented in the vector service)
      // For now, we'll just log the action
      console.log(`Updated knowledge base with ${type} content for project ${projectId}`);
    } catch (error) {
      console.error('Error updating knowledge base:', error);
    }
  }
}

// Export singleton instance
export const knowledgeBaseService = KnowledgeBaseService.getInstance();
