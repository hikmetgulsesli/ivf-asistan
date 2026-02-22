/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be of the same dimension');
  }

  if (a.length === 0 || b.length === 0) {
    throw new Error('Vectors cannot be empty');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface Candidate {
  id: string;
  embedding: number[] | null | undefined;
}

interface SimilarityResult {
  id: string;
  score: number;
}

/**
 * Find the most similar candidates to a query vector
 */
export function findMostSimilar(query: number[], candidates: Candidate[], limit?: number): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const candidate of candidates) {
    if (!candidate.embedding || candidate.embedding.length === 0) {
      continue;
    }
    const score = cosineSimilarity(query, candidate.embedding);
    results.push({ id: candidate.id, score });
  }

  results.sort((a, b) => b.score - a.score);
  
  if (limit !== undefined && limit > 0) {
    return results.slice(0, limit);
  }
  
  return results;
}
