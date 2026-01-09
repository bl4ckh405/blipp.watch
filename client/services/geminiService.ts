
import { GoogleGenAI, Type } from '@google/genai';
import { VideoIdea } from '../types';

if (!process.env.NEXT_PUBLIC_API_KEY) {
    // In a real app, you'd want to handle this more gracefully.
    // For this example, we assume the API key is provided.
    console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_API_KEY! });

export const generateVideoIdea = async (topic: string): Promise<VideoIdea[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Brainstorm 3 short, engaging video ideas for a blipp.watch video about "${topic}". The ideas should be trendy and likely to get views.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "A short, catchy title for the video."
                  },
                  description: {
                    type: Type.STRING,
                    description: "A one or two sentence description of the video concept."
                  }
                },
                required: ["title", "description"]
              }
            }
          },
          required: ["ideas"]
        },
      },
    });

    const jsonText = response.text!.trim();
    const parsed = JSON.parse(jsonText);
    
    if (parsed && Array.isArray(parsed.ideas)) {
        return parsed.ideas;
    } else {
        throw new Error("Invalid format received from AI.");
    }
    
  } catch (error) {
    console.error("Error generating video ideas:", error);
    throw new Error("Failed to communicate with the AI service.");
  }
};
