import OpenAI from 'openai';
import { config } from '../config/index.js';

export interface VideoAnalysisResult {
  summary: string;
  key_topics: string[];
  timestamps: Array<{ time: string; topic: string }>;
  medical_terms: string[];
  patient_stage?: string;
}

// Kimi K2.5 video analysis prompt
const VIDEO_ANALYSIS_SYSTEM_PROMPT = `Sen bir IVF (tup bebek) klinigi icin video analiz uzmanısın. Videoları analiz eder ve aşağıdaki formatta JSON döndürürsün.

Kurallar:
1. IVF/tup bebek konusunda uzmanlasmis video iceriklerini analiz et
2. Tibbi terimleri dogru sekilde tespit et
3. Hasta surecinin hangi asamasinda oldugunu belirle
4. Zaman damgalarını video icerigine gore dogru yerlestir

Donus formatı (sadece JSON):
{
  "summary": "Videonun 2-3 paragraflik detayli ozeti",
  "key_topics": ["konu1", "konu2", "konu3", "konu4", "konu5"],
  "timestamps": [
    {"time": "00:30", "topic": "Konunun kisa aciklamasi"},
    {"time": "02:15", "topic": "Baska bir konu"}
  ],
  "medical_terms": ["OHSS", "folikul", "embriyo transferi", "hCG"],
  "patient_stage": "tedavi-oncesi | opu-oncesi | opu-sonrasi | transfer-sonrasi | beta-bekleme"
}`;

const VIDEO_ANALYSIS_USER_PROMPT = (videoUrl: string, videoTitle: string) => `
Lütfen bu IVF videosunu analiz et:

Video URL: ${videoUrl}
Video Basligi: ${videoTitle}

Yukarıdaki videonun icerigini analiz et ve Yukarıdaki JSON formatında sonuc dondur. Sadece JSON dondur, baska bir sey yazma.
`;

class KimiVideoAnalysisService {
  private client: OpenAI;
  private model: string;
  private maxRetries: number = 3;
  private retryDelayMs: number = 2000;

  constructor() {
    if (!config.kimiApiKey) {
      throw new Error('KIMI_API_KEY not configured');
    }

    this.client = new OpenAI({
      apiKey: config.kimiApiKey,
      baseURL: config.kimiApiUrl,
    });
    this.model = config.kimiModel;
  }

  /**
   * Analyze video using Kimi K2.5
   */
  async analyzeVideo(
    videoUrl: string,
    videoTitle: string,
    attempt: number = 1
  ): Promise<VideoAnalysisResult> {
    try {
      console.log(`[KimiVideoAnalysis] Starting analysis for video: ${videoTitle} (attempt ${attempt}/${this.maxRetries})`);
      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: VIDEO_ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'video_url',
                video_url: {
                  url: videoUrl,
                },
              },
              {
                type: 'text',
                text: VIDEO_ANALYSIS_USER_PROMPT(videoUrl, videoTitle),
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      } as {
        model: string;
        messages: { role: string; content: unknown }[];
        temperature: number;
        max_tokens: number;
      });

      const chatResponse = response as { choices: Array<{ message: { content: string | null } }> };
      const content = chatResponse.choices[0]?.message?.content;

      const durationMs = Date.now() - startTime;
      console.log(`[KimiVideoAnalysis] Analysis completed in ${durationMs}ms`);

      if (!content) {
        throw new Error('No content in Kimi response');
      }

      // Parse JSON from the response
      const parsed = this.parseJsonResponse(content);

      return {
        summary: parsed.summary || '',
        key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics : [],
        timestamps: Array.isArray(parsed.timestamps) ? parsed.timestamps : [],
        medical_terms: Array.isArray(parsed.medical_terms) ? parsed.medical_terms : [],
        patient_stage: parsed.patient_stage,
      };
    } catch (error) {
      console.error(`[KimiVideoAnalysis] Error on attempt ${attempt}:`, error);

      // Check if we should retry
      if (attempt < this.maxRetries) {
        const delay = this.retryDelayMs * attempt; // Exponential backoff
        console.log(`[KimiVideoAnalysis] Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.analyzeVideo(videoUrl, videoTitle, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Parse JSON from Kimi response, handling potential markdown code blocks
   */
  private parseJsonResponse(content: string): VideoAnalysisResult {
    // Remove markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      const firstNewline = jsonStr.indexOf('\n');
      if (firstNewline !== -1) {
        jsonStr = jsonStr.substring(firstNewline + 1);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.substring(0, jsonStr.length - 3);
      }
    }

    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();

    try {
      return JSON.parse(jsonStr) as VideoAnalysisResult;
    } catch {
      console.error('[KimiVideoAnalysis] Failed to parse JSON:', jsonStr);
      throw new Error('Invalid JSON response from Kimi');
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let kimiService: KimiVideoAnalysisService | null = null;

export function getKimiVideoAnalysisService(): KimiVideoAnalysisService {
  if (!kimiService) {
    kimiService = new KimiVideoAnalysisService();
  }
  return kimiService;
}

export { KimiVideoAnalysisService };
