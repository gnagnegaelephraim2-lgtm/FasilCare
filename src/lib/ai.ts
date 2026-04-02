import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface AIResponse {
  text: string;
  suggestions?: string[];
}

export async function generateInitialContent(prompt: string, files?: { data: string, mimeType: string }[]): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  const contents: any[] = [{ text: prompt }];
  
  if (files) {
    files.forEach(file => {
      contents.push({
        inlineData: {
          data: file.data.split(',')[1] || file.data,
          mimeType: file.mimeType
        }
      });
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts: contents },
    config: {
      systemInstruction: "You are an expert writer and thought partner. Generate high-quality, engaging content based on the user's prompt and any provided context. Use professional yet creative tone."
    }
  });

  return response.text || "";
}

export async function iterateOnText(originalText: string, feedback: string, context: string): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Original Text: "${originalText}"\n\nUser Feedback: "${feedback}"\n\nFull Document Context: "${context}"\n\nRewrite the original text to incorporate the feedback while maintaining the flow of the document. Return ONLY the rewritten text.`,
    config: {
      systemInstruction: "You are a precise editor. Your goal is to improve specific sections of text based on user feedback while ensuring they fit perfectly into the surrounding context."
    }
  });

  return response.text || originalText;
}

export async function generateBilingualSMS(testInfo: string, portalLink?: string): Promise<{ english: string, creole: string }> {
  const model = "gemini-3.1-flash-lite-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Generate a short, professional SMS update for a patient regarding their medical test.
    Test Info: ${testInfo}
    ${portalLink ? `Portal Link: ${portalLink}` : ""}
    
    Provide the message in both English and Mauritian Creole.
    Keep it concise and clear. ${portalLink ? "Ensure the portal link is included in both versions as a direct way to view detailed results." : ""}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          creole: { type: Type.STRING }
        },
        required: ["english", "creole"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{"english":"","creole":""}');
  } catch (e) {
    return { english: "Your test results are ready.", creole: "Ou bann rezilta tess pare." };
  }
}

export async function analyzePatientDelays(patientData: string): Promise<string> {
  const model = "gemini-3.1-pro-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Analyze the following patient test data and identify any critical delays or actions needed. Provide a concise summary for healthcare staff.
    Data: ${patientData}`,
    config: {
      systemInstruction: "You are a clinical workflow assistant. Focus on identifying bottlenecks and suggesting immediate next steps."
    }
  });
  return response.text || "No critical delays identified.";
}
