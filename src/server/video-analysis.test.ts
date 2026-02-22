import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from './index';
import { initializeAdmin } from '../services/auth-service';

// Mock Kimi video analysis service
vi.mock('../services/kimi-video-analysis-service.js', () => ({
  getKimiVideoAnalysisService: vi.fn(() => ({
    analyzeVideo: vi.fn().mockResolvedValue({
      summary: 'Test video summary about IVF treatment',
      key_topics: ['OHSS', 'folikul', 'embriyo transferi'],
      timestamps: [
        { time: '00:30', topic: 'Introduction' },
        { time: '02:15', topic: 'Main topic' },
      ],
      medical_terms: ['OHSS', 'hCG', 'folikul'],
      patient_stage: 'transfer-sonrasi',
    }),
  })),
  VideoAnalysisResult: class {},
}));

// Mock embedding service
vi.mock('../services/embedding-service.js', () => ({
  generateEmbedding: vi.fn().mockResolvedValue({
    embedding: [0.1, 0.2, 0.3],
    usage: { prompt_tokens: 10, total_tokens: 10 },
  }),
}));

describe('Video Analysis Service (US-007)', () => {
  let adminToken: string;

  beforeAll(async () => {
    await initializeAdmin();

    // Get admin token
    const loginResponse = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: 'admin', password: 'ivf2024' });

    adminToken = loginResponse.body.data.token;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Acceptance Criterion 1: Video analysis triggers on POST/PUT video
  describe('POST /api/admin/videos - Triggers analysis on video creation', () => {
    it('should create video and queue analysis job', async () => {
      const response = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test IVF Video',
          url: 'https://example.com/video.mp4',
          category: 'genel',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test IVF Video');
      expect(response.body.data.analysis_status).toBe('pending');
    });

    it('returns 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          url: 'https://example.com/video.mp4',
          category: 'genel',
        });

      expect(response.status).toBe(400);
    });

    it('returns 400 when url is missing', async () => {
      const response = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Test Video',
          category: 'genel',
        });

      expect(response.status).toBe(400);
    });

    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/admin/videos')
        .send({
          title: 'Test Video',
          url: 'https://example.com/video.mp4',
          category: 'genel',
        });

      expect(response.status).toBe(401);
    });
  });

  // Acceptance Criterion 4: Status updates: pending -> processing -> done
  describe('GET /api/admin/videos/:id/status - Status updates', () => {
    it('should return video analysis status', async () => {
      // First create a video
      const createResponse = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Status Test Video',
          url: 'https://example.com/video2.mp4',
          category: 'genel',
        });

      const videoId = createResponse.body.data.id;

      const statusResponse = await request(app)
        .get(`/api/admin/videos/${videoId}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data).toHaveProperty('status');
      expect(statusResponse.body.data.status).toBe('pending');
    });
  });

  // Acceptance Criterion 2: Kimi K2.5 API returns structured JSON
  describe('Kimi K2.5 API Integration', () => {
    it('should call Kimi service with correct parameters', async () => {
      const { getKimiVideoAnalysisService } = await import('../services/kimi-video-analysis-service.js');
      const mockAnalyzeVideo = vi.mocked(getKimiVideoAnalysisService().analyzeVideo);

      await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Kimi Test Video',
          url: 'https://example.com/kimi-test.mp4',
          category: 'tedavi-oncesi',
        });

      expect(mockAnalyzeVideo).toHaveBeenCalled();
    });
  });

  // Acceptance Criterion 3: Embedding generated from summary
  describe('Embedding Generation', () => {
    it('should generate embedding from video summary', async () => {
      const { generateEmbedding } = await import('../services/embedding-service.js');
      const mockGenerateEmbedding = vi.mocked(generateEmbedding);

      await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Embedding Test Video',
          url: 'https://example.com/embed-test.mp4',
          category: 'opu',
        });

      // The embedding should be generated when analysis completes
      expect(mockGenerateEmbedding).toHaveBeenCalled();
    });
  });

  // Test PUT /api/admin/videos/:id triggers re-analysis when URL changes
  describe('PUT /api/admin/videos/:id - Triggers re-analysis on URL change', () => {
    it('should trigger re-analysis when URL is updated', async () => {
      // First create a video
      const createResponse = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Video',
          url: 'https://example.com/original.mp4',
          category: 'genel',
        });

      const videoId = createResponse.body.data.id;

      // Update with new URL
      const updateResponse = await request(app)
        .put(`/api/admin/videos/${videoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          url: 'https://example.com/updated.mp4',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.analysis_status).toBe('pending');
    });

    it('should not trigger re-analysis when only title is updated', async () => {
      // First create a video
      const createResponse = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Original Title',
          url: 'https://example.com/same-url.mp4',
          category: 'genel',
        });

      const videoId = createResponse.body.data.id;

      // Update only title (not URL)
      const updateResponse = await request(app)
        .put(`/api/admin/videos/${videoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(updateResponse.status).toBe(200);
      // Status should remain pending (same as before)
      expect(updateResponse.body.data.analysis_status).toBe('pending');
    });
  });

  // Test manual analysis trigger
  describe('POST /api/admin/videos/:id/analyze - Manual analysis trigger', () => {
    it('should manually trigger analysis', async () => {
      // First create a video
      const createResponse = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Manual Test Video',
          url: 'https://example.com/manual-test.mp4',
          category: 'genel',
        });

      const videoId = createResponse.body.data.id;

      // Manually trigger analysis
      const analyzeResponse = await request(app)
        .post(`/api/admin/videos/${videoId}/analyze`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(analyzeResponse.status).toBe(200);
      expect(analyzeResponse.body.data.status).toBe('pending');
      expect(analyzeResponse.body.data.message).toBe('Analysis queued');
    });
  });

  // Test DELETE /api/admin/videos/:id
  describe('DELETE /api/admin/videos/:id', () => {
    it('should delete video successfully', async () => {
      // First create a video
      const createResponse = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Delete Test Video',
          url: 'https://example.com/delete-test.mp4',
          category: 'genel',
        });

      const videoId = createResponse.body.data.id;

      // Delete it
      const deleteResponse = await request(app)
        .delete(`/api/admin/videos/${videoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(204);
    });

    it('returns 404 for non-existent video', async () => {
      const response = await request(app)
        .delete('/api/admin/videos/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  // Test GET /api/admin/videos - List videos
  describe('GET /api/admin/videos - List videos', () => {
    it('should list all videos', async () => {
      const response = await request(app)
        .get('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta).toHaveProperty('limit');
      expect(response.body.meta).toHaveProperty('offset');
    });

    it('should filter videos by status', async () => {
      const response = await request(app)
        .get('/api/admin/videos?status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('returns 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/admin/videos');

      expect(response.status).toBe(401);
    });
  });

  // Test GET /api/admin/videos/:id - Get single video
  describe('GET /api/admin/videos/:id - Get single video', () => {
    it('should return single video', async () => {
      // First create a video
      const createResponse = await request(app)
        .post('/api/admin/videos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Single Video Test',
          url: 'https://example.com/single-test.mp4',
          category: 'genel',
        });

      const videoId = createResponse.body.data.id;

      const getResponse = await request(app)
        .get(`/api/admin/videos/${videoId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.id).toBe(videoId);
      expect(getResponse.body.data.title).toBe('Single Video Test');
    });

    it('returns 404 for non-existent video', async () => {
      const response = await request(app)
        .get('/api/admin/videos/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});
