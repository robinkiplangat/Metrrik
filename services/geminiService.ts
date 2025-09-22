import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { Part } from "@google/genai";
import type { ChatMessage, Document, UploadedFile } from '../types';

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
            text: "Analyze this floor plan and generate a detailed Bill of Quantities (BQ) in JSON format. Identify key elements and structure it by construction stages (e.g., Substructure, Superstructure, Finishes). For each item, provide a description, unit, quantity, an estimated Kenyan Shilling (KES) unit rate, and total cost. Also, include a reasonable material wastage percentage. Finally, provide a list of suggestions for alternative materials or cost-saving construction methods."
        };
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                projectName: { type: Type.STRING },
                billOfQuantities: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            trade: { type: Type.STRING },
                            items: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        description: { type: Type.STRING },
                                        unit: { type: Type.STRING },
                                        quantity: { type: Type.NUMBER },
                                        unitRateKES: { type: Type.NUMBER, description: "Estimated unit rate in Kenyan Shillings (KES)" },
                                        totalCostKES: { type: Type.NUMBER, description: "Total estimated cost in Kenyan Shillings (KES)" },
                                        materialWastagePercentage: { type: Type.NUMBER, description: "Estimated material wastage percentage" }
                                    },
                                    required: ["description", "unit", "quantity", "unitRateKES", "totalCostKES", "materialWastagePercentage"]
                                }
                            }
                        }
                    }
                },
                suggestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Suggestions for alternative materials or construction methods"
                }
            }
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
        return JSON.stringify({ error: "Failed to analyze the drawing. Please ensure it's a clear floor plan and try again." });
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
