import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Part } from "@google/genai";
import type { ChatMessage, Document, UploadedFile, AnalyzedBQ } from '../types';

// Ensure API_KEY is available. In a real app, this would be more robustly handled.
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are Q-Scribe, an expert AI assistant for Quantity Surveyors in Kenya. Your role is to be an intelligent co-pilot, helping with tasks like creating cost estimates, drafting Bills of Quantities (BQs), and generating professional construction documents.
- When asked for a cost estimate, provide a clear, structured breakdown. Use realistic, localized costs for Kenya (e.g., Nairobi, Mombasa) where possible. Mention that these are preliminary estimates.
- When analyzing drawings, identify key architectural elements and provide estimated quantities.
- Your tone should be professional, intelligent, clear, and supportive.
- All responses should be formatted using markdown for clarity (e.g., headings, bold text, lists, tables).
- Do not mention you are an AI. Act as the Q-Scribe tool.`;

export const generateChatResponse = async (prompt: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // FIX: Simplified `contents` to a plain string for a single-turn text prompt, following API guidelines.
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating chat response:", error);
    return "Sorry, I encountered an error while processing your request. Please try again.";
  }
};

export const analyzeFloorPlan = async (imageData: string, mimeType: string): Promise<string> => {
    try {
        const imagePart: Part = {
            inlineData: {
                data: imageData,
                mimeType: mimeType,
            },
        };

        const textPart: Part = {
            text: `
            Analyze this architectural floor plan as an expert Quantity Surveyor in Kenya. Perform a comprehensive analysis and generate a detailed Bill of Quantities (BQ) in the specified JSON format.
            
            Follow these steps in your reasoning:
            1.  **Visual Perception:** Identify all rooms, walls (internal/external), doors, windows, and major structural elements. Extract or estimate dimensions.
            2.  **Quantification:** Apply the Standard Method of Measurement (SMM) principles to convert the visual data into quantified items. Group items logically by trade (e.g., Substructure, Walls, Finishes).
            3.  **Costing & Enrichment:** For each item, provide a realistic, localized unit rate in Kenyan Shillings (KES). Include a standard wastage factor (e.g., 5% as 0.05). Calculate the total cost: (quantity * unitRateKES) * (1 + wastageFactor). Also calculate the total wastage cost.
            4.  **Advisory & Optimization:** Review the entire BQ. Provide a list of actionable, intelligent suggestions for alternative materials, alternative construction methods, or general cost-saving tips relevant to the Kenyan context.
            5.  **Summary:** Calculate the overall total estimated cost and total wastage cost. Provide a confidence score (0.0 to 1.0) based on the clarity of the drawing.

            The final output MUST be a single, valid JSON object matching the provided schema.
            `
        };
        
        // FIX: The `responseSchema` was incorrectly typed as `Type.OBJECT`, which is a string enum.
        // The type annotation has been removed to allow TypeScript to correctly infer the object's shape.
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                summary: {
                    type: Type.OBJECT,
                    properties: {
                        totalEstimatedCostKES: { type: Type.NUMBER },
                        totalWastageCostKES: { type: Type.NUMBER },
                        confidenceScore: { type: Type.NUMBER, description: "AI confidence in the estimate, from 0.0 to 1.0" },
                    },
                    required: ["totalEstimatedCostKES", "totalWastageCostKES", "confidenceScore"]
                },
                billOfQuantities: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemNumber: { type: Type.STRING },
                            description: { type: Type.STRING },
                            unit: { type: Type.STRING },
                            quantity: { type: Type.NUMBER },
                            unitRateKES: { type: Type.NUMBER },
                            wastageFactor: { type: Type.NUMBER, description: "Wastage factor, e.g., 0.05 for 5%" },
                            totalCostKES: { type: Type.NUMBER }
                        },
                        required: ["itemNumber", "description", "unit", "quantity", "unitRateKES", "wastageFactor", "totalCostKES"]
                    }
                },
                intelligentSuggestions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            suggestionType: { type: Type.STRING, enum: ['Alternative Material', 'Alternative Method', 'Cost-Saving Tip'] },
                            originalItem: { type: Type.STRING },
                            suggestion: { type: Type.STRING },
                            impact: { type: Type.STRING }
                        },
                        required: ["suggestionType", "originalItem", "suggestion", "impact"]
                    }
                }
            },
            required: ["summary", "billOfQuantities", "intelligentSuggestions"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        // The response text will be a stringified JSON.
        return response.text;
    } catch (error) {
        console.error("Error analyzing floor plan:", error);
        return JSON.stringify({ error: "Failed to analyze the drawing. The AI model could not process the request. Please ensure the uploaded image is a clear architectural drawing and try again." });
    }
};


export const generateProjectSummary = async (
    chatHistory: ChatMessage[],
    documents: Document[],
    files: UploadedFile[]
): Promise<string> => {
    const chatSummary = chatHistory.length > 1 // ignore initial message
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are an expert project manager for a quantity surveying firm. Your task is to provide clear, concise, and insightful project summaries for internal review."
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating project summary:", error);
        return "Sorry, I encountered an error while generating the summary. Please try again.";
    }
};