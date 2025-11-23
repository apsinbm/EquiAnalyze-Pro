import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, AnalysisPhase, ComparisonImage } from "../types";

const GEMINI_MODEL_ID = "gemini-2.5-flash";

const apiKey =
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.API_KEY ||
  // @ts-expect-error - injected by vite.config.ts
  process.env.GEMINI_API_KEY ||
  // @ts-expect-error - injected by vite.config.ts
  process.env.API_KEY;

if (!apiKey) {
  throw new Error("Missing Gemini API key. Set VITE_GEMINI_API_KEY in environment");
}
const ai = new GoogleGenAI({ apiKey });

// Helper to convert file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:video/mp4;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const isValidPhase = (phase: unknown): phase is AnalysisPhase => {
  if (typeof phase !== 'object' || phase === null) return false;
  const p = phase as Record<string, unknown>;
  return (
    typeof p.startTime === 'number' &&
    typeof p.endTime === 'number' &&
    typeof p.phaseName === 'string' &&
    typeof p.riderAnalysis === 'string' &&
    typeof p.horseAnalysis === 'string' &&
    typeof p.physicsNote === 'string' &&
    typeof p.score === 'number'
  );
};

const isValidAnalysisResult = (data: unknown): data is AnalysisResult => {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    Array.isArray(d.phases) &&
    d.phases.every(isValidPhase) &&
    typeof d.overallSummary === 'string' &&
    Array.isArray(d.suggestedImprovements) &&
    d.suggestedImprovements.every((s: unknown) => typeof s === 'string') &&
    typeof d.movementName === 'string' &&
    typeof d.similarProRider === 'string'
  );
};

export const analyzeVideo = async (base64Video: string, mimeType: string): Promise<AnalysisResult> => {

  const prompt = `
    You are an expert world-class equestrian coach, biomechanics physicist, and veterinarian. 
    Analyze the provided video of an equestrian performance.
    
    1. **Segmentation**: Break the video down chronologically into distinct phases (e.g., Approach, Takeoff, Suspension, Landing, Recovery for jumping; or Preparation, Execution, Finish for dressage).
    2. **Deep Analysis**: For each phase, analyze:
       - **Rider**: Leg position (heels), seat depth, posture, hand stability, eye focus.
       - **Horse**: Engagement of hindquarters, back lift, poll position, tracking up, rhythm.
       - **Physics**: Center of mass, kinetic energy transfer, balance vectors.
    3. **Scoring**: Give a score from 1-10 for each phase.
    4. **Suggestions**: specific actionable advice.
    5. **Comparison**: Identify the specific movement (e.g., "Grand Prix Pirouette", "1.40m Oxer Jump") and name a famous top-level rider known for excellence in this specific movement (e.g., "Charlotte Dujardin", "Marcus Ehning").
    
    Return the result in JSON format only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Video
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.NUMBER, description: "Start time of phase in seconds" },
                  endTime: { type: Type.NUMBER, description: "End time of phase in seconds" },
                  phaseName: { type: Type.STRING },
                  riderAnalysis: { type: Type.STRING },
                  horseAnalysis: { type: Type.STRING },
                  physicsNote: { type: Type.STRING, description: "Biomechanical and physics observation" },
                  score: { type: Type.NUMBER }
                }
              }
            },
            overallSummary: { type: Type.STRING },
            suggestedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
            movementName: { type: Type.STRING },
            similarProRider: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed: unknown = JSON.parse(text);
    if (!isValidAnalysisResult(parsed)) {
      throw new Error("Invalid response structure from AI");
    }
    return parsed;

  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

const MAX_COMPARISON_IMAGES = 4;

export const fetchComparisonImages = async (query: string): Promise<ComparisonImage[]> => {
  const prompt = `Find 3 high-quality images of professional riders performing: ${query}. Return the image URLs and titles.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const images: ComparisonImage[] = [];

    if (chunks) {
      chunks.forEach((chunk) => {
        if (chunk.web) {
           // Google Search tool usually returns web pages. 
           // We will use the web pages as "sources" and if available, extraction logic would go here.
           // However, standard Search grounding returns text + citations. 
           // For the purpose of this demo, since we can't reliably scrape image URLs directly from the 'web' chunk without an Image Search specific tool (which isn't strictly 'googleSearch' in this context),
           // We will map the search results to a format we can display as "Sources to compare".
           // If the API returns rich snippets with images, we'd use them.
           
           if (chunk.web.uri) {
             images.push({
               title: chunk.web.title || "Reference Image",
               url: chunk.web.uri, // This is a link to the page, we will try to use a placeholder or the favicon if needed, but for now we link to the source.
               source: chunk.web.uri
             });
           }
        }
      });
    }

    return images.slice(0, MAX_COMPARISON_IMAGES);

  } catch (error) {
    console.error("Search Error:", error);
    return [];
  }
};
