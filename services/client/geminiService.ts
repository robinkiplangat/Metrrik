/**
 * Gemini Service (Client-side)
 * Refactored to use LLM abstraction layer
 * Maintains backward compatibility
 */

import { llmService } from '../server/llm/llmService';
import { LLMProviderManager } from '../server/llm/llmProviderManager';
import { LLMProvider, LLMTaskType } from '../shared/llm/types';
import type { ChatMessage, Document, UploadedFile } from '../types';

const SYSTEM_INSTRUCTION = `You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya. Your role is to be an intelligent co-pilot, helping with tasks like creating cost estimates, drafting Bills of Quantities (BQs), and generating professional construction documents.
- When asked for a cost estimate, provide a clear, structured breakdown. Use realistic, localized costs for Kenya (e.g., Nairobi, Mombasa) where possible. Mention that these are preliminary estimates.
- When analyzing drawings, identify key architectural elements and provide estimated quantities.
- Your tone should be professional, intelligent, clear, and supportive.
- All responses should be formatted using markdown for clarity (e.g., headings, bold text, lists, tables).
- Do not mention you are an AI. Act as the Metrrik tool.`;

// Initialize provider manager if not already done
if (typeof process !== 'undefined' && process.env) {
  const providerManager = LLMProviderManager.getInstance();
  if (!providerManager.isProviderRegistered(LLMProvider.GEMINI)) {
    providerManager.initializeFromEnv();
  }
}

export const generateChatResponse = async (prompt: string): Promise<string> => {
  try {
    const response = await llmService.generate(
      {
        prompt,
        systemInstruction: SYSTEM_INSTRUCTION
      },
      {
        provider: LLMProvider.GEMINI,
        taskType: LLMTaskType.CHAT,
        useCache: true,
        trackCost: true
      }
    );
    return response.text;
  } catch (error: any) {
    console.error("Error generating chat response:", error);
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
};

export const analyzeFloorPlan = async (imageData: string, mimeType: string): Promise<string> => {
  try {
    const prompt = `
      Analyze this architectural drawing (floor plan or PDF) as an expert Quantity Surveyor in Kenya. Perform a comprehensive analysis and generate a detailed Bill of Quantities (BQ) in the specified JSON format.
      
      Follow these steps in your reasoning:
      1.  **Visual Perception:** Identify all rooms, walls (internal/external), doors, windows, and major structural elements. Extract or estimate dimensions.
      2.  **Quantification:** Apply the Standard Method of Measurement (SMM) principles to convert the visual data into quantified items. Group items logically by trade (e.g., Substructure, Walls, Finishes).
      3.  **Item Geometry:** For each quantified item in the BQ that corresponds to a distinct visual element, provide a 'boundingBox' with normalized coordinates (x, y, width, height), where (x,y) is the top-left corner.
      4.  **Costing & Enrichment:** For each item, provide a realistic, localized unit rate in Kenyan Shillings (KES). Include a standard wastage factor. Calculate total costs. Analyze potential regional pricing differences for materials/labor between Nairobi, Mombasa, and Kisumu, and include this in 'regionalPricingDifferences'.
      5.  **Advisory & Optimization:** Review the BQ and provide actionable, intelligent suggestions for cost-saving.
      6.  **Summary:** Calculate overall costs and provide a confidence score based on the drawing's clarity.

      The final output MUST be a single, valid JSON object matching the provided schema.
    `;

    const response = await llmService.generate(
      {
        prompt,
        images: [{
          data: imageData,
          mimeType: mimeType
        }],
        systemInstruction: SYSTEM_INSTRUCTION,
        maxTokens: 8000
      },
      {
        provider: LLMProvider.GEMINI,
        taskType: LLMTaskType.VISION,
        useCache: false, // Don't cache analysis results
        trackCost: true
      }
    );

    // Parse and validate JSON response
    try {
      JSON.parse(response.text);
      return response.text;
    } catch (parseError) {
      // If not valid JSON, wrap in error object
      return JSON.stringify({
        error: {
          message: "Failed to parse AI response. The analysis may be incomplete.",
          code: "PARSE_ERROR",
          rawResponse: response.text.substring(0, 500)
        }
      });
    }
  } catch (error: any) {
    console.error("Error analyzing floor plan:", error);

    // Handle specific API errors
    if (error.message && error.message.includes('API key')) {
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

    // Generic error response
    return JSON.stringify({
      error: {
        message: "Failed to analyze the drawing. Please ensure the uploaded image is a clear architectural drawing and try again.",
        code: "ANALYSIS_FAILED"
      }
    });
  }
};

export const generateProjectSummary = async (
  chatHistory: ChatMessage[],
  documents: Document[],
  files: UploadedFile[]
): Promise<string> => {
  const chatSummary = chatHistory.length > 1
    ? `Key conversation points:\n${chatHistory.slice(1).map(m => `${m.sender}: ${m.text.substring(0, 150)}...`).join('\n')}`
    : 'No significant chat history.';

  const docSummary = documents.length > 0
    ? `Generated documents:\n${documents.map(d => `- ${d.name} (${d.type}) created on ${new Date(d.createdAt).toLocaleDateString()}`).join('\n')}`
    : 'No documents generated.';

  const fileSummary = files.length > 0
    ? `Uploaded files:\n${files.map(f => `- ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n')}`
    : 'No files uploaded.';

  const prompt = `
Please generate a concise project summary report based on the following information.

**Project Data:**
${docSummary}
${fileSummary}

**Conversation History Summary:**
${chatSummary}

**Task:**
Synthesize all the provided information to create a high-level summary. The report should cover:
1.  **Project Status:** A brief overview of what has been accomplished.
2.  **Key Decisions:** Highlight any significant decisions made based on the chat or documents.
3.  **Generated Artifacts:** List the key documents and analyses produced.
4.  **Next Steps:** Suggest potential next steps for the project.

Format the output in clear, professional markdown.
`;

  try {
    const response = await llmService.generate(
      {
        prompt,
        systemInstruction: "You are an expert project manager for a quantity surveying firm. Your task is to provide clear, concise, and insightful project summaries for internal review."
      },
      {
        provider: LLMProvider.GEMINI,
        taskType: LLMTaskType.CHAT,
        useCache: true,
        trackCost: true
      }
    );
    return response.text;
  } catch (error) {
    console.error("Error generating project summary:", error);
    return "Sorry, I encountered an error while generating the summary. Please try again.";
  }
};

export const generateDocumentContent = async (prompt: string, type: Document['type']): Promise<string> => {
  const specializedPrompt = `
    Based on the user's request, generate a professional '${type}' document.
    User's request: "${prompt}"
    
    Structure the document logically with clear headings, lists, and tables where appropriate.
    The content should be well-written, accurate, and ready for client presentation.
    Format the entire output using markdown.
  `;
  
  try {
    const response = await llmService.generate(
      {
        prompt: specializedPrompt,
        systemInstruction: `You are Metrrik, an expert AI assistant for Quantity Surveyors in Kenya. Your task is to generate high-quality construction documents. Your tone is professional and authoritative.`
      },
      {
        provider: LLMProvider.GEMINI,
        taskType: LLMTaskType.CHAT,
        useCache: true,
        trackCost: true
      }
    );
    return response.text;
  } catch (error) {
    console.error("Error generating document:", error);
    return "Sorry, an error occurred while generating the document. Please check your prompt and try again.";
  }
};
