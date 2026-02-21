import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import { prisma, testConnection } from './connection.js';

describe('Database Connection', () => {
  beforeAll(async () => {
    // Connection is established lazily
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should connect to PostgreSQL database', async () => {
    const connected = await testConnection();
    expect(connected).toBe(true);
  });

  it('should have valid prisma client', () => {
    expect(prisma).toBeDefined();
    expect(prisma.$connect).toBeDefined();
  });

  it('should be able to query articles table', async () => {
    await prisma.$connect();
    const articles = await prisma.article.findMany({ take: 1 });
    expect(Array.isArray(articles)).toBe(true);
  });

  it('should be able to query faqs table', async () => {
    const faqs = await prisma.faq.findMany({ take: 1 });
    expect(Array.isArray(faqs)).toBe(true);
  });

  it('should be able to query videos table', async () => {
    const videos = await prisma.video.findMany({ take: 1 });
    expect(Array.isArray(videos)).toBe(true);
  });

  it('should be able to query conversations table', async () => {
    const conversations = await prisma.conversation.findMany({ take: 1 });
    expect(Array.isArray(conversations)).toBe(true);
  });

  it('should be able to query response_cache table', async () => {
    const caches = await prisma.responseCache.findMany({ take: 1 });
    expect(Array.isArray(caches)).toBe(true);
  });
});

describe('Prisma Schema', () => {
  it('should have articles table with correct fields', async () => {
    await prisma.$connect();
    const article = await prisma.article.create({
      data: {
        title: 'Test Article',
        content: 'Test content',
        category: 'genel',
        status: 'draft',
      },
    });
    expect(article.id).toBeDefined();
    expect(article.title).toBe('Test Article');
    expect(article.embedding).toBeNull();
    await prisma.article.delete({ where: { id: article.id } });
  });

  it('should have faqs table with correct fields', async () => {
    const faq = await prisma.faq.create({
      data: {
        question: 'Test Question?',
        answer: 'Test Answer',
        category: 'genel',
      },
    });
    expect(faq.id).toBeDefined();
    expect(faq.question).toBe('Test Question?');
    expect(faq.embedding).toBeNull();
    await prisma.faq.delete({ where: { id: faq.id } });
  });

  it('should have videos table with correct fields', async () => {
    const video = await prisma.video.create({
      data: {
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test',
        category: 'genel',
        analysisStatus: 'pending',
      },
    });
    expect(video.id).toBeDefined();
    expect(video.title).toBe('Test Video');
    expect(video.embedding).toBeNull();
    await prisma.video.delete({ where: { id: video.id } });
  });

  it('should have conversations table with correct fields', async () => {
    const conversation = await prisma.conversation.create({
      data: {
        sessionId: 'test-session-123',
        role: 'user',
        content: 'Test message',
      },
    });
    expect(conversation.id).toBeDefined();
    expect(conversation.sessionId).toBe('test-session-123');
    await prisma.conversation.delete({ where: { id: conversation.id } });
  });

  it('should have response_cache table with correct fields', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 24);
    
    const cache = await prisma.responseCache.create({
      data: {
        queryHash: 'test-hash-123',
        queryText: 'Test query',
        response: 'Test response',
        expiresAt: futureDate,
      },
    });
    expect(cache.id).toBeDefined();
    expect(cache.queryHash).toBe('test-hash-123');
    await prisma.responseCache.delete({ where: { id: cache.id } });
  });

  it('should support JSONB fields for embeddings', async () => {
    const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    
    const article = await prisma.article.create({
      data: {
        title: 'Embedding Test',
        content: 'Testing JSONB embedding field',
        category: 'genel',
        status: 'draft',
        embedding,
      },
    });
    
    expect(article.embedding).toEqual(embedding);
    await prisma.article.delete({ where: { id: article.id } });
  });

  it('should support array fields for tags', async () => {
    const article = await prisma.article.create({
      data: {
        title: 'Tags Test',
        content: 'Testing array tags field',
        category: 'genel',
        status: 'draft',
        tags: ['OHSS', 'iğne', 'beslenme'],
      },
    });
    
    expect(article.tags).toEqual(['OHSS', 'iğne', 'beslenme']);
    await prisma.article.delete({ where: { id: article.id } });
  });
});
