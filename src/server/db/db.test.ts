import { describe, it, expect, afterAll } from 'vitest';
import { prisma, checkDatabaseConnection, disconnectDatabase } from './connection.js';

describe('Database Connection', () => {
  it('should connect to the database successfully', async () => {
    const isConnected = await checkDatabaseConnection();
    expect(isConnected).toBe(true);
  });

  it('should execute raw queries', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('test');
  });
});

describe('Articles Table', () => {
  let createdArticleId: number;

  it('should create an article', async () => {
    const article = await prisma.article.create({
      data: {
        title: 'Test Article',
        content: 'This is a test article content',
        category: 'tedavi-oncesi',
        tags: ['test', 'article'],
        status: 'published',
      },
    });
    createdArticleId = article.id;
    expect(article.title).toBe('Test Article');
    expect(article.category).toBe('tedavi-oncesi');
    expect(article.tags).toEqual(['test', 'article']);
    expect(article.status).toBe('published');
  });

  it('should store and retrieve embedding as JSONB', async () => {
    const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
    const article = await prisma.article.create({
      data: {
        title: 'Article with Embedding',
        content: 'Content with embedding',
        category: 'genel',
        embedding,
      },
    });

    const retrieved = await prisma.article.findUnique({
      where: { id: article.id },
    });

    expect(retrieved?.embedding).toEqual(embedding);
    await prisma.article.delete({ where: { id: article.id } });
  });

  it('should update an article', async () => {
    const updated = await prisma.article.update({
      where: { id: createdArticleId },
      data: { title: 'Updated Test Article', status: 'archived' },
    });
    expect(updated.title).toBe('Updated Test Article');
    expect(updated.status).toBe('archived');
  });

  it('should delete an article', async () => {
    await prisma.article.delete({ where: { id: createdArticleId } });
    const deleted = await prisma.article.findUnique({
      where: { id: createdArticleId },
    });
    expect(deleted).toBeNull();
  });
});

describe('FAQs Table', () => {
  let createdFaqId: number;

  it('should create an FAQ', async () => {
    const faq = await prisma.fAQ.create({
      data: {
        question: 'What is IVF?',
        answer: 'IVF is a fertility treatment',
        category: 'genel',
        sortOrder: 1,
      },
    });
    createdFaqId = faq.id;
    expect(faq.question).toBe('What is IVF?');
    expect(faq.sortOrder).toBe(1);
  });

  it('should store embedding in FAQ', async () => {
    const embedding = [0.5, 0.4, 0.3];
    const faq = await prisma.fAQ.create({
      data: {
        question: 'FAQ with embedding',
        answer: 'Answer with embedding',
        category: 'test',
        embedding,
      },
    });

    const retrieved = await prisma.fAQ.findUnique({
      where: { id: faq.id },
    });

    expect(retrieved?.embedding).toEqual(embedding);
    await prisma.fAQ.delete({ where: { id: faq.id } });
  });

  afterAll(async () => {
    if (createdFaqId) {
      await prisma.fAQ.delete({ where: { id: createdFaqId } }).catch(() => {});
    }
  });
});

describe('Videos Table', () => {
  let createdVideoId: number;

  it('should create a video entry', async () => {
    const video = await prisma.video.create({
      data: {
        title: 'Test Video',
        url: 'https://youtube.com/watch?v=test123',
        category: 'tedavi-oncesi',
        durationSeconds: 300,
        analysisStatus: 'pending',
      },
    });
    createdVideoId = video.id;
    expect(video.title).toBe('Test Video');
    expect(video.url).toBe('https://youtube.com/watch?v=test123');
    expect(video.analysisStatus).toBe('pending');
  });

  it('should store JSONB fields for video analysis', async () => {
    const video = await prisma.video.create({
      data: {
        title: 'Analyzed Video',
        url: 'https://example.com/video.mp4',
        category: 'opu',
        summary: 'Video summary here',
        keyTopics: ['topic1', 'topic2', 'topic3'],
        timestamps: [
          { time: '00:30', topic: 'Introduction' },
          { time: '02:15', topic: 'Main content' },
        ],
        analysisStatus: 'done',
      },
    });

    const retrieved = await prisma.video.findUnique({
      where: { id: video.id },
    });

    expect(retrieved?.summary).toBe('Video summary here');
    expect(retrieved?.keyTopics).toEqual(['topic1', 'topic2', 'topic3']);
    expect(retrieved?.timestamps).toHaveLength(2);
    expect(retrieved?.analysisStatus).toBe('done');

    await prisma.video.delete({ where: { id: video.id } });
  });

  afterAll(async () => {
    if (createdVideoId) {
      await prisma.video.delete({ where: { id: createdVideoId } }).catch(() => {});
    }
  });
});

describe('Conversations Table', () => {
  let createdConversationId: number;

  it('should create a conversation entry', async () => {
    const conversation = await prisma.conversation.create({
      data: {
        sessionId: 'test-session-123',
        role: 'user',
        content: 'Hello, I have a question about IVF',
        sentiment: 'anxious',
      },
    });
    createdConversationId = conversation.id;
    expect(conversation.sessionId).toBe('test-session-123');
    expect(conversation.role).toBe('user');
    expect(conversation.sentiment).toBe('anxious');
  });

  it('should store sources as JSONB', async () => {
    const sources = [
      { type: 'article', id: 1, title: 'IVF Guide' },
      { type: 'faq', id: 2, title: 'Common Questions' },
    ];

    const conversation = await prisma.conversation.create({
      data: {
        sessionId: 'test-session-456',
        role: 'assistant',
        content: 'Here is the information you requested',
        sources,
        sentiment: 'calm',
      },
    });

    const retrieved = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });

    expect(retrieved?.sources).toEqual(sources);
    await prisma.conversation.delete({ where: { id: conversation.id } });
  });

  afterAll(async () => {
    if (createdConversationId) {
      await prisma.conversation.delete({ where: { id: createdConversationId } }).catch(() => {});
    }
  });
});

describe('Response Cache Table', () => {
  let createdCacheId: number;

  it('should create a cache entry', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const cache = await prisma.responseCache.create({
      data: {
        queryHash: 'abc123hash',
        queryText: 'What is IVF treatment?',
        response: 'IVF is a fertility treatment...',
        expiresAt,
      },
    });
    createdCacheId = cache.id;
    expect(cache.queryHash).toBe('abc123hash');
    expect(cache.hitCount).toBe(1);
  });

  it('should enforce unique query_hash constraint', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await expect(
      prisma.responseCache.create({
        data: {
          queryHash: 'abc123hash',
          queryText: 'Another question',
          response: 'Another response',
          expiresAt,
        },
      })
    ).rejects.toThrow();
  });

  it('should store sources in cache', async () => {
    const sources = [{ type: 'article', id: 1, title: 'IVF Overview' }];
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const cache = await prisma.responseCache.create({
      data: {
        queryHash: 'unique-hash-xyz',
        queryText: 'How does IVF work?',
        response: 'IVF works by...',
        sources,
        expiresAt,
      },
    });

    const retrieved = await prisma.responseCache.findUnique({
      where: { id: cache.id },
    });

    expect(retrieved?.sources).toEqual(sources);
    await prisma.responseCache.delete({ where: { id: cache.id } });
  });

  afterAll(async () => {
    if (createdCacheId) {
      await prisma.responseCache.delete({ where: { id: createdCacheId } }).catch(() => {});
    }
  });
});

afterAll(async () => {
  await disconnectDatabase();
});
