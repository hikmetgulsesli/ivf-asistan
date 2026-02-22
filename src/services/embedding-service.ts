import { config } from '../config/index.js';

export interface EmbeddingResult {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface MiniMaxEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const EMBEDDING_MODEL = 'abab6.5s-chat';

/**
 * Generate embedding for text using MiniMax API
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!config.minimaxApiKey) {
    throw new Error('MINIMAX_API_KEY not configured');
  }

  const response = await fetch(`${config.minimaxApiHost}/v1/text/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.minimaxApiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as MiniMaxEmbeddingResponse;
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid embedding response from MiniMax API');
  }

  return {
    embedding: data.data[0].embedding,
    usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
  };
}

/**
 * Generate embedding for a single item with performance timing
 */
export async function generateEmbeddingWithTiming(
  text: string
): Promise<{ result: EmbeddingResult; durationMs: number }> {
  const startTime = Date.now();
  const result = await generateEmbedding(text);
  const durationMs = Date.now() - startTime;
  
  return { result, durationMs };
}
