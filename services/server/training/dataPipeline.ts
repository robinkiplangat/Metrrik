/**
 * Training Data Pipeline
 * Collects and formats training data from various sources
 */

import { getDatabase } from '../../../backend/src/config/database';
import type { ChatMessage, Document, AnalyzedBQ } from '../../types';

export interface TrainingExample {
  instruction: string;
  input?: string;
  output: string;
  metadata?: {
    source: 'chat' | 'analysis' | 'document' | 'feedback';
    projectId?: string;
    userId?: string;
    timestamp: Date;
    quality?: 'high' | 'medium' | 'low';
  };
}

export interface TrainingDataset {
  examples: TrainingExample[];
  metadata: {
    totalExamples: number;
    sources: Record<string, number>;
    dateRange: {
      start: Date;
      end: Date;
    };
  };
}

export class TrainingDataPipeline {
  private static instance: TrainingDataPipeline;

  private constructor() {}

  public static getInstance(): TrainingDataPipeline {
    if (!TrainingDataPipeline.instance) {
      TrainingDataPipeline.instance = new TrainingDataPipeline();
    }
    return TrainingDataPipeline.instance;
  }

  /**
   * Extract training examples from chat history
   */
  public async extractFromChat(
    projectId?: string,
    minQuality: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<TrainingExample[]> {
    const db = getDatabase();
    const examples: TrainingExample[] = [];

    try {
      const query: any = {
        messageType: 'assistant'
      };

      if (projectId) {
        query.projectId = projectId;
      }

      // Get chat messages with user feedback or high-quality interactions
      const messages = await db.collection('chat_messages')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(1000)
        .toArray();

      // Get corresponding user messages
      for (const assistantMsg of messages) {
        const userMsg = await db.collection('chat_messages').findOne({
          projectId: assistantMsg.projectId,
          userId: assistantMsg.userId,
          messageType: 'user',
          timestamp: { $lt: assistantMsg.timestamp }
        }, { sort: { timestamp: -1 } });

        if (userMsg && assistantMsg.message) {
          // Check if there's positive feedback
          const hasFeedback = assistantMsg.metadata?.feedback === 'positive' ||
                             assistantMsg.metadata?.rating === 'helpful';

          if (hasFeedback || minQuality === 'low') {
            examples.push({
              instruction: 'You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya.',
              input: userMsg.message,
              output: assistantMsg.message,
              metadata: {
                source: 'chat',
                projectId: assistantMsg.projectId,
                userId: assistantMsg.userId,
                timestamp: assistantMsg.timestamp,
                quality: hasFeedback ? 'high' : 'medium'
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error extracting chat training data:', error);
    }

    return examples;
  }

  /**
   * Extract training examples from successful analysis results
   */
  public async extractFromAnalysis(
    projectId?: string
  ): Promise<TrainingExample[]> {
    const db = getDatabase();
    const examples: TrainingExample[] = [];

    try {
      const query: any = {
        status: 'completed'
      };

      if (projectId) {
        query.projectId = projectId;
      }

      // Get analysis results that were accepted by users
      const analyses = await db.collection('analysis_results')
        .find(query)
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray();

      for (const analysis of analyses) {
        if (analysis.result && analysis.fileName) {
          const prompt = `Analyze this architectural drawing: ${analysis.fileName}`;
          const output = JSON.stringify(analysis.result);

          examples.push({
            instruction: 'You are an expert Quantity Surveyor in Kenya. Analyze architectural drawings and generate Bills of Quantities.',
            input: prompt,
            output: output,
            metadata: {
              source: 'analysis',
              projectId: analysis.projectId,
              userId: analysis.userId,
              timestamp: analysis.createdAt,
              quality: 'high'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error extracting analysis training data:', error);
    }

    return examples;
  }

  /**
   * Extract training examples from user feedback
   */
  public async extractFromFeedback(): Promise<TrainingExample[]> {
    const db = getDatabase();
    const examples: TrainingExample[] = [];

    try {
      // Get feedback entries
      const feedbacks = await db.collection('training_feedback')
        .find({})
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray();

      for (const feedback of feedbacks) {
        if (feedback.originalPrompt && feedback.correctedResponse) {
          examples.push({
            instruction: 'You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya.',
            input: feedback.originalPrompt,
            output: feedback.correctedResponse,
            metadata: {
              source: 'feedback',
              projectId: feedback.projectId,
              userId: feedback.userId,
              timestamp: feedback.createdAt,
              quality: 'high'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error extracting feedback training data:', error);
    }

    return examples;
  }

  /**
   * Extract Q&A pairs from documents
   */
  public async extractFromDocuments(
    projectId?: string
  ): Promise<TrainingExample[]> {
    const db = getDatabase();
    const examples: TrainingExample[] = [];

    try {
      const query: any = {};
      if (projectId) {
        query.projectId = projectId;
      }

      const documents = await db.collection('documents')
        .find(query)
        .limit(500)
        .toArray();

      for (const doc of documents) {
        if (doc.content && doc.type === 'Estimate') {
          // Generate Q&A pairs from document content
          const question = `Generate a cost estimate for: ${doc.name}`;
          const answer = doc.content;

          examples.push({
            instruction: 'You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya.',
            input: question,
            output: answer,
            metadata: {
              source: 'document',
              projectId: doc.projectId,
              userId: doc.userId,
              timestamp: doc.createdAt,
              quality: 'medium'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error extracting document training data:', error);
    }

    return examples;
  }

  /**
   * Build complete training dataset
   */
  public async buildDataset(
    options: {
      includeChat?: boolean;
      includeAnalysis?: boolean;
      includeFeedback?: boolean;
      includeDocuments?: boolean;
      projectId?: string;
      minQuality?: 'high' | 'medium' | 'low';
      limit?: number;
    } = {}
  ): Promise<TrainingDataset> {
    const {
      includeChat = true,
      includeAnalysis = true,
      includeFeedback = true,
      includeDocuments = false,
      projectId,
      minQuality = 'medium',
      limit = 10000
    } = options;

    const allExamples: TrainingExample[] = [];
    const sources: Record<string, number> = {};

    // Collect from all sources
    if (includeChat) {
      const chatExamples = await this.extractFromChat(projectId, minQuality);
      allExamples.push(...chatExamples);
      sources.chat = chatExamples.length;
    }

    if (includeAnalysis) {
      const analysisExamples = await this.extractFromAnalysis(projectId);
      allExamples.push(...analysisExamples);
      sources.analysis = analysisExamples.length;
    }

    if (includeFeedback) {
      const feedbackExamples = await this.extractFromFeedback();
      allExamples.push(...feedbackExamples);
      sources.feedback = feedbackExamples.length;
    }

    if (includeDocuments) {
      const docExamples = await this.extractFromDocuments(projectId);
      allExamples.push(...docExamples);
      sources.document = docExamples.length;
    }

    // Sort by quality and timestamp
    allExamples.sort((a, b) => {
      const qualityOrder = { high: 3, medium: 2, low: 1 };
      const aQuality = qualityOrder[a.metadata?.quality || 'low'];
      const bQuality = qualityOrder[b.metadata?.quality || 'low'];
      
      if (aQuality !== bQuality) {
        return bQuality - aQuality;
      }
      
      return (b.metadata?.timestamp?.getTime() || 0) - (a.metadata?.timestamp?.getTime() || 0);
    });

    // Limit examples
    const limitedExamples = allExamples.slice(0, limit);

    // Get date range
    const timestamps = limitedExamples
      .map(e => e.metadata?.timestamp)
      .filter((t): t is Date => t !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      examples: limitedExamples,
      metadata: {
        totalExamples: limitedExamples.length,
        sources,
        dateRange: {
          start: timestamps[0] || new Date(),
          end: timestamps[timestamps.length - 1] || new Date()
        }
      }
    };
  }

  /**
   * Export dataset to JSONL format (for Hugging Face)
   */
  public exportToJSONL(dataset: TrainingDataset, filePath: string): string {
    const lines = dataset.examples.map(example => {
      const formatted: any = {
        instruction: example.instruction,
        output: example.output
      };
      
      if (example.input) {
        formatted.input = example.input;
      }
      
      return JSON.stringify(formatted);
    });

    return lines.join('\n');
  }

  /**
   * Export dataset to Parquet format (for efficient storage)
   */
  public async exportToParquet(
    dataset: TrainingDataset,
    filePath: string
  ): Promise<void> {
    // Would use a Parquet library here
    // For now, just export as JSON
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(dataset, null, 2));
  }

  /**
   * Split dataset into train/validation/test
   */
  public splitDataset(
    dataset: TrainingDataset,
    trainRatio: number = 0.8,
    valRatio: number = 0.1,
    testRatio: number = 0.1
  ): {
    train: TrainingDataset;
    validation: TrainingDataset;
    test: TrainingDataset;
  } {
    const total = dataset.examples.length;
    const trainEnd = Math.floor(total * trainRatio);
    const valEnd = trainEnd + Math.floor(total * valRatio);

    return {
      train: {
        examples: dataset.examples.slice(0, trainEnd),
        metadata: {
          ...dataset.metadata,
          totalExamples: trainEnd
        }
      },
      validation: {
        examples: dataset.examples.slice(trainEnd, valEnd),
        metadata: {
          ...dataset.metadata,
          totalExamples: valEnd - trainEnd
        }
      },
      test: {
        examples: dataset.examples.slice(valEnd),
        metadata: {
          ...dataset.metadata,
          totalExamples: total - valEnd
        }
      }
    };
  }
}

// Export singleton instance
export const trainingDataPipeline = TrainingDataPipeline.getInstance();

