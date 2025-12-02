import { GoogleGenAI, Type } from "@google/genai";

export interface AudioAnalysisData {
    bass: number; // 0-255
    mid: number; // 0-255
    treble: number; // 0-255
}

export const generateEQPreset = async (
    promptText: string, 
    trackInfo?: { title: string, artist: string },
    analysis?: AudioAnalysisData
): Promise<{ name: string; gains: number[] } | null> => {
  // Initialize AI client here to ensure it uses the latest process.env.API_KEY
  // which might be set dynamically by the user via the UI
  if (!process.env.API_KEY) {
    console.warn("No API Key provided for Gemini");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    let systemPrompt = `You are a world-class Audio Mastering Engineer. 
    Your task is to generate the perfect 10-band equalizer settings based on the provided inputs.
    The equalizer frequencies are: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz.
    Return gains between -12 and 12 dB.`;

    let userContent = `Generate an EQ preset.`;

    if (trackInfo) {
        userContent += `\nTrack Details: "${trackInfo.title}" by ${trackInfo.artist}. Detect the genre from this metadata and optimize for it.`;
    }

    if (analysis) {
        userContent += `\nDeep Audio Analysis (Energy Levels 0-255): 
        - Bass Energy: ${Math.round(analysis.bass)}
        - Mid Energy: ${Math.round(analysis.mid)}
        - Treble Energy: ${Math.round(analysis.treble)}
        
        Based on this analysis, balance the spectrum. If bass is too high (>180), trim it slightly. If treble is dull (<50), boost high frequencies.`;
    }

    if (promptText) {
        userContent += `\nUser Preference: "${promptText}". Prioritize this request.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "A creative name for this audio profile" },
            gains: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "Array of 10 integers for the EQ bands"
            },
          },
          required: ["name", "gains"],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating EQ preset:", error);
    return null;
  }
};