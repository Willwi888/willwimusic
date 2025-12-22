import { GoogleGenAI, Type } from "@google/genai";
import { VisualSettings, ThemeStyle, LyricLine } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLyricsForTheme = async (lyrics: string): Promise<Partial<VisualSettings>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following song lyrics (which may be in Chinese or English) and suggest a visual theme. 
      Determine the best color palette (hex codes), and the overall mood style.
      
      Lyrics Sample:
      ${lyrics.substring(0, 1000)}...
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING, description: "Main accent color hex code" },
            secondaryColor: { type: Type.STRING, description: "Secondary accent color hex code" },
            backgroundColor: { type: Type.STRING, description: "Dark background color hex code" },
            style: { 
              type: Type.STRING, 
              enum: [ThemeStyle.NEON, ThemeStyle.MINIMAL, ThemeStyle.NATURE, ThemeStyle.FIERY],
              description: "The visual style category"
            },
            moodDescription: { type: Type.STRING, description: "Short description of the song's mood" }
          },
          required: ["primaryColor", "secondaryColor", "backgroundColor", "style"]
        }
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        return {
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            backgroundColor: data.backgroundColor,
            style: data.style as ThemeStyle,
        };
    }
    return {};
  } catch (error) {
    console.error("Error analyzing lyrics with Gemini:", error);
    return {
        primaryColor: "#6366f1",
        secondaryColor: "#c084fc",
        backgroundColor: "#0f172a",
        style: ThemeStyle.NEON
    };
  }
};

export const translateLyricsAI = async (lyrics: LyricLine[], targetLang: string = "Traditional Chinese"): Promise<LyricLine[]> => {
    // Only send text to save tokens and reduce complexity
    const textLines = lyrics.map(l => ({ id: l.id, text: l.text }));
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Translate the following lyric lines into ${targetLang}. 
            Keep the meaning poetic and suitable for a song. 
            Return a JSON object where keys are the IDs and values are the translations.
            
            Input:
            ${JSON.stringify(textLines)}
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        translations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    translation: { type: Type.STRING }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            const translationMap = new Map<string, string>(data.translations.map((t: any) => [t.id, t.translation]));
            
            return lyrics.map(line => ({
                ...line,
                translation: translationMap.get(line.id) || ""
            }));
        }
    } catch (error) {
        console.error("Translation error", error);
    }
    return lyrics;
};

export const smartTimingAI = async (text: string, totalDuration: number): Promise<LyricLine[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `I have a song lyric text and a total duration of ${totalDuration} seconds.
            Please distribute the timestamps for each line.
            Analyze the structure (verses usually faster, choruses might be slower or more emphatic).
            Assign a start and end time for each line so they flow consecutively filling the ${totalDuration} seconds.
            
            Lyrics:
            ${text}
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lines: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    startTime: { type: Type.NUMBER },
                                    endTime: { type: Type.NUMBER }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            return data.lines.map((l: any, index: number) => ({
                id: `line-${index}`,
                startTime: l.startTime,
                endTime: l.endTime,
                text: l.text,
                translation: ""
            }));
        }
    } catch (e) {
        console.error("Smart timing error", e);
    }
    // Fallback handled by caller
    return [];
};

export const generateVideo = async (
  prompt: string, 
  base64Image: string | undefined, 
  aspectRatio: '16:9' | '9:16'
): Promise<string | null> => {
  try {
    const config: any = {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: aspectRatio
    };

    let requestParams: any = {
        model: 'veo-3.1-fast-generate-preview',
        config: config
    };

    if (base64Image) {
        // Image-to-Video
        requestParams.image = {
            imageBytes: base64Image,
            mimeType: 'image/png' // Assuming PNG/JPEG generic handling, Veo handles standard types
        };
        // Prompt is optional for image-to-video but good to have
        if (prompt) requestParams.prompt = prompt;
        else requestParams.prompt = "Animate this image cinematically";
    } else {
        // Text-to-Video
        requestParams.prompt = prompt || "Abstract musical visualization";
    }

    let operation = await ai.models.generateVideos(requestParams);

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (downloadLink) {
        // Must append API key to download
        return `${downloadLink}&key=${process.env.API_KEY}`;
    }
    
    return null;

  } catch (error) {
    console.error("Veo generation error:", error);
    throw error;
  }
};