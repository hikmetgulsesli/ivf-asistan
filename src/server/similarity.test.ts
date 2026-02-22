import { describe, it, expect } from 'vitest';
import { cosineSimilarity, findMostSimilar } from '../utils/similarity.js';

describe('Cosine Similarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBe(1);
  });

  it('should return 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
  });

  it('should return -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBe(-1);
  });

  it('should handle vectors with different magnitudes', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [2, 4, 6];
    expect(cosineSimilarity(vec1, vec2)).toBe(1);
  });

  it('should handle vectors with negative values', () => {
    const vec1 = [-1, -2, -3];
    const vec2 = [1, 2, 3];
    expect(cosineSimilarity(vec1, vec2)).toBe(-1);
  });

  it('should throw error for vectors of different dimensions', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow('same dimension');
  });

  it('should throw error for empty vectors', () => {
    expect(() => cosineSimilarity([], [])).toThrow('empty');
  });

  it('should return 0 when one vector is all zeros', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});

describe('findMostSimilar', () => {
  const query = [1, 2, 3];

  it('should return empty array for no candidates', () => {
    const result = findMostSimilar(query, []);
    expect(result).toEqual([]);
  });

  it('should return candidates sorted by similarity', () => {
    const candidates = [
      { id: 'a', embedding: [1, 0, 0] }, // 0.267
      { id: 'b', embedding: [1, 2, 3] },  // 1.0
      { id: 'c', embedding: [-1, -2, -3] }, // -1.0
    ];

    const result = findMostSimilar(query, candidates);

    expect(result[0].id).toBe('b');
    expect(result[0].score).toBe(1);
    expect(result[1].id).toBe('a');
    expect(result[2].id).toBe('c');
    expect(result[2].score).toBe(-1);
  });

  it('should filter out candidates without embeddings', () => {
    const candidates = [
      { id: 'a', embedding: [1, 2, 3] },
      { id: 'b', embedding: [] },
      { id: 'c', embedding: null },
    ];

    const result = findMostSimilar(query, candidates as any);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('a');
  });

  it('should respect limit parameter', () => {
    const candidates = [
      { id: 'a', embedding: [1, 2, 3] },
      { id: 'b', embedding: [1, 1, 1] },
      { id: 'c', embedding: [0, 0, 1] },
      { id: 'd', embedding: [-1, 0, 0] },
    ];

    const result = findMostSimilar(query, candidates, 2);

    expect(result.length).toBe(2);
  });
});
