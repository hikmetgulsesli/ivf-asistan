/**
 * Calculate cosine similarity between two vectors
 * @returns Similarity score between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  if (vec1.length === 0) {
    throw new Error('Vectors cannot be empty');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const normalizedProduct = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (normalizedProduct === 0) {
    return 0;
  }

  return dotProduct / normalizedProduct;
}

/**
 * Calculate cosine similarity between a query vector and multiple document vectors
 */
export function findMostSimilar(
  queryEmbedding: number[],
  candidates: Array<{ id: string; embedding: number[] }>,
  limit?: number
): Array<{ id: string; score: number }> {
  const similarities = candidates
    .filter(c => c.embedding && c.embedding.length > 0)
    .map(c => ({
      id: c.id,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score);

  if (limit !== undefined) {
    return similarities.slice(0, limit);
  }
  
  return similarities;
}
