import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Backend Gemini AI service for floor plan analysis
 * This service handles AI-powered analysis of architectural drawings
 */

export interface AnalysisResult {
  summary: {
    totalEstimatedCostKES: number;
    totalWastageCostKES: number;
    confidenceScore: number;
    totalArea: string;
  };
  billOfQuantities: Array<{
    category: string;
    description: string;
    quantity: number;
    unit: string;
    unitRateKES: number;
    totalCostKES: number;
    wastageFactor: number;
  }>;
  intelligentSuggestions?: Array<{
    suggestionType: string;
    originalItem: string;
    suggestion: string;
    impact: string;
  }>;
}

/**
 * Analyze a floor plan using Gemini AI
 * @param imageData Base64 encoded image data
 * @param mimeType MIME type of the image
 * @param projectName Name of the project
 * @param projectType Type of project (residential/commercial)
 * @returns Promise<string> JSON string response from AI
 */
export const analyzeFloorPlan = async (
  imageData: string, 
  mimeType: string, 
  projectName?: string, 
  projectType?: string
): Promise<string> => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: `
      Analyze this architectural drawing (floor plan or PDF) as an expert Quantity Surveyor in Kenya. Perform a comprehensive analysis and generate a detailed Bill of Quantities (BQ) in the specified JSON format.
      
      Follow these steps in your reasoning:
      1. **Visual Perception:** Identify all rooms, walls (internal/external), doors, windows, and major structural elements. Extract or estimate dimensions.
      2. **Quantification:** Apply the Standard Method of Measurement (SMM) principles to convert the visual data into quantified items. Group items logically by trade (e.g., Substructure, Walls, Finishes).
      3. **Costing & Enrichment:** For each item, provide a realistic, localized unit rate in Kenyan Shillings (KES). Include a standard wastage factor. Calculate total costs.
      4. **Summary:** Calculate overall costs and provide a confidence score based on the drawing's clarity.

      Project Details:
      - Project Name: ${projectName || 'Unnamed Project'}
      - Project Type: ${projectType || 'residential'}
      
      The final output MUST be a single, valid JSON object with this structure:
      {
        "summary": {
          "totalEstimatedCostKES": number,
          "totalWastageCostKES": number,
          "confidenceScore": number,
          "totalArea": string
        },
        "billOfQuantities": [
          {
            "category": string,
            "description": string,
            "quantity": number,
            "unit": string,
            "unitRateKES": number,
            "totalCostKES": number,
            "wastageFactor": number
          }
        ],
        "intelligentSuggestions": [
          {
            "suggestionType": string,
            "originalItem": string,
            "suggestion": string,
            "impact": string
          }
        ]
      }
      `
    };
    
    logger.info(`Calling Gemini AI for analysis of ${projectName || 'unnamed project'}`);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [imagePart, textPart]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout for AI analysis
      }
    );

    const responseText = response.data.candidates[0].content.parts[0].text;
    logger.info(`Gemini AI analysis completed for ${projectName || 'unnamed project'}`);
    
    return responseText;
    
  } catch (error: any) {
    logger.error('Error analyzing floor plan with Gemini AI:', error);
    
    // Handle specific API errors
    if (error.message && error.message.includes('API key not valid')) {
      return JSON.stringify({ 
        error: { 
          message: "Invalid API key. Please check your Gemini API configuration in your environment variables.",
          code: "INVALID_API_KEY"
        } 
      });
    }
    
    if (error.message && error.message.includes('quota')) {
      return JSON.stringify({ 
        error: { 
          message: "API quota exceeded. Please check your Gemini API usage limits.",
          code: "QUOTA_EXCEEDED"
        } 
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return JSON.stringify({ 
        error: { 
          message: "AI analysis timed out. The image might be too complex or the service is busy. Please try again.",
          code: "TIMEOUT"
        } 
      });
    }
    
    // Generic error response
    return JSON.stringify({ 
      error: { 
        message: "Failed to analyze the drawing. Please ensure the uploaded image is a clear architectural drawing and try again.",
        code: "ANALYSIS_FAILED"
      } 
    });
  }
};

/**
 * Generate a chat response using Gemini AI
 * @param prompt The user's prompt
 * @returns Promise<string> AI response
 */
export const generateChatResponse = async (prompt: string): Promise<string> => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: `You are Q-Sci, an expert AI assistant for Quantity Surveyors in Kenya. Your role is to be an intelligent co-pilot, helping with tasks like creating cost estimates, drafting Bills of Quantities (BQs), and generating professional construction documents.

User Question: ${prompt}

Please provide a helpful, accurate response related to construction management. Use realistic, localized costs for Kenya where possible.`
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout for chat
      }
    );

    return response.data.candidates[0].content.parts[0].text;
    
  } catch (error: any) {
    logger.error('Error generating chat response:', error);
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
};
