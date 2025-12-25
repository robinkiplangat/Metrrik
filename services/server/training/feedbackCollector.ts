/**
 * Feedback Collector
 * Collects user feedback on LLM responses for continuous improvement
 */

import { getDatabase } from '../../../backend/src/config/database';

export interface Feedback {
  userId: string;
  projectId?: string;
  messageId?: string;
  originalPrompt: string;
  originalResponse: string;
  correctedResponse?: string;
  rating: 'helpful' | 'not_helpful' | 'neutral';
  feedback?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class FeedbackCollector {
  private static instance: FeedbackCollector;

  private constructor() {}

  public static getInstance(): FeedbackCollector {
    if (!FeedbackCollector.instance) {
      FeedbackCollector.instance = new FeedbackCollector();
    }
    return FeedbackCollector.instance;
  }

  /**
   * Submit feedback on an LLM response
   */
  public async submitFeedback(feedback: Omit<Feedback, 'timestamp'>): Promise<void> {
    const db = getDatabase();
    
    const feedbackDoc: Feedback = {
      ...feedback,
      timestamp: new Date()
    };

    await db.collection('training_feedback').insertOne(feedbackDoc);
  }

  /**
   * Get feedback for a user or project
   */
  public async getFeedback(
    userId?: string,
    projectId?: string,
    limit: number = 100
  ): Promise<Feedback[]> {
    const db = getDatabase();
    
    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (projectId) {
      query.projectId = projectId;
    }

    const feedbacks = await db.collection('training_feedback')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return feedbacks as Feedback[];
  }

  /**
   * Get feedback statistics
   */
  public async getFeedbackStats(
    userId?: string,
    projectId?: string
  ): Promise<{
    total: number;
    helpful: number;
    notHelpful: number;
    neutral: number;
    averageRating: number;
  }> {
    const db = getDatabase();
    
    const query: any = {};
    
    if (userId) {
      query.userId = userId;
    }
    
    if (projectId) {
      query.projectId = projectId;
    }

    const pipeline = [
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          helpful: {
            $sum: { $cond: [{ $eq: ['$rating', 'helpful'] }, 1, 0] }
          },
          notHelpful: {
            $sum: { $cond: [{ $eq: ['$rating', 'not_helpful'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$rating', 'neutral'] }, 1, 0] }
          }
        }
      }
    ];

    const results = await db.collection('training_feedback')
      .aggregate(pipeline)
      .toArray();

    const stats = results[0] || {
      total: 0,
      helpful: 0,
      notHelpful: 0,
      neutral: 0
    };

    const averageRating = stats.total > 0
      ? (stats.helpful - stats.notHelpful) / stats.total
      : 0;

    return {
      ...stats,
      averageRating
    };
  }

  /**
   * Convert feedback to training example
   */
  public feedbackToTrainingExample(feedback: Feedback): {
    instruction: string;
    input: string;
    output: string;
    quality: 'high' | 'medium' | 'low';
  } | null {
    if (feedback.rating === 'not_helpful' && !feedback.correctedResponse) {
      return null; // Can't use negative feedback without correction
    }

    return {
      instruction: 'You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya.',
      input: feedback.originalPrompt,
      output: feedback.correctedResponse || feedback.originalResponse,
      quality: feedback.rating === 'helpful' ? 'high' : 
               feedback.correctedResponse ? 'high' : 'medium'
    };
  }
}

// Export singleton instance
export const feedbackCollector = FeedbackCollector.getInstance();

