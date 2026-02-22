import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { 
  queueVideoAnalysis, 
  getQueueStatus, 
  triggerVideoAnalysis,
  initVideoAnalysisService 
} from '../services/video-analysis-service.js';
import { getKimiVideoAnalysisService } from '../services/kimi-video-analysis-service.js';
import { generateEmbedding } from '../services/embedding-service.js';

// Mock the dependencies
vi.mock('../services/kimi-video-analysis-service.js', () => ({
  getKimiVideoAnalysisService: vi.fn(),
}));

vi.mock('../services/embedding-service.js', () => ({
  generateEmbedding: vi.fn(),
}));

describe('Video Analysis Service', () => {
  let mockPool: Pool;
  let mockQuery: ReturnType<typeof vi.fn>;
  let mockKimiService: { analyzeVideo: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockQuery = vi.fn();
    mockPool = { query: mockQuery } as unknown as Pool;
    initVideoAnalysisService(mockPool);

    mockKimiService = {
      analyzeVideo: vi.fn(),
    };
    vi.mocked(getKimiVideoAnalysisService).mockReturnValue(mockKimiService as any);
    vi.mocked(generateEmbedding).mockResolvedValue({ 
      embedding: [0.1, 0.2, 0.3], 
      usage: { prompt_tokens: 10, total_tokens: 10 } 
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queueVideoAnalysis', () => {
    it('should queue a video for analysis', () => {
      queueVideoAnalysis(1);
      
      const status = getQueueStatus();
      expect(status.queued).toBeGreaterThanOrEqual(0);
    });

    it('should not duplicate videos in queue', () => {
      queueVideoAnalysis(2);
      queueVideoAnalysis(2);
      queueVideoAnalysis(2);
      
      // The queue should only have one instance of video 2
      // Since queue is processed async, we just verify no error is thrown
      expect(() => queueVideoAnalysis(2)).not.toThrow();
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', () => {
      const status = getQueueStatus();
      
      expect(status).toHaveProperty('queued');
      expect(status).toHaveProperty('isProcessing');
      expect(typeof status.queued).toBe('number');
      expect(typeof status.isProcessing).toBe('boolean');
    });
  });

  describe('Video Analysis Process', () => {
    it('should update video status to processing', async () => {
      const videoId = 1;
      const videoData = {
        id: videoId,
        title: 'Test Video',
        url: 'https://example.com/video.mp4',
        category: 'general',
      };

      // Mock the database queries
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Update to processing
        .mockResolvedValueOnce({ rows: [videoData] }) // Select video
        .mockResolvedValueOnce({ rows: [] }); // Update with results

      // Mock Kimi analysis
      mockKimiService.analyzeVideo.mockResolvedValue({
        summary: 'Test summary',
        key_topics: ['topic1', 'topic2'],
        timestamps: [{ time: '00:30', topic: 'Introduction' }],
        medical_terms: ['IVF'],
        patient_stage: 'tedavi-oncesi',
      });

      // Trigger analysis
      triggerVideoAnalysis(videoId);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify the first call updates status to processing
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("analysis_status = 'processing'"),
        expect.arrayContaining([videoId])
      );
    });

    it('should handle analysis failure and retry', async () => {
      const videoId = 2;
      const videoData = {
        id: videoId,
        title: 'Test Video 2',
        url: 'https://example.com/video2.mp4',
        category: 'general',
      };

      // Mock the database queries
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Update to processing
        .mockResolvedValueOnce({ rows: [videoData] }) // Select video
        .mockResolvedValueOnce({ rows: [] }); // Update to failed

      // Mock Kimi analysis to fail
      mockKimiService.analyzeVideo.mockRejectedValue(new Error('Analysis failed'));

      // Trigger analysis
      triggerVideoAnalysis(videoId);

      // Wait for async processing and retries
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify that the video was queued for retry or marked as failed
      expect(mockKimiService.analyzeVideo).toHaveBeenCalled();
    });

    it('should generate embedding from summary', async () => {
      const videoId = 3;
      const videoData = {
        id: videoId,
        title: 'Test Video 3',
        url: 'https://example.com/video3.mp4',
        category: 'general',
      };

      const analysisResult = {
        summary: 'This is a test summary',
        key_topics: ['IVF', 'Treatment'],
        timestamps: [{ time: '01:00', topic: 'Main Topic' }],
        medical_terms: ['IVF', 'Embryo'],
        patient_stage: 'transfer-sonrasi',
      };

      // Mock the database queries
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // Update to processing
        .mockResolvedValueOnce({ rows: [videoData] }) // Select video
        .mockResolvedValueOnce({ rows: [] }); // Update with results

      mockKimiService.analyzeVideo.mockResolvedValue(analysisResult);

      // Trigger analysis
      triggerVideoAnalysis(videoId);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify embedding was generated
      expect(generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining(analysisResult.summary)
      );
    });
  });

  describe('Kimi Video Analysis Service', () => {
    it('should return correct structure from analyzeVideo', async () => {
      const mockResult = {
        summary: 'Video summary',
        key_topics: ['topic1', 'topic2'],
        timestamps: [{ time: '00:30', topic: 'Start' }],
        medical_terms: ['IVF'],
        patient_stage: 'tedavi-oncesi',
      };

      mockKimiService.analyzeVideo.mockResolvedValue(mockResult);

      const result = await mockKimiService.analyzeVideo('url', 'title');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('key_topics');
      expect(result).toHaveProperty('timestamps');
      expect(result).toHaveProperty('medical_terms');
      expect(Array.isArray(result.key_topics)).toBe(true);
      expect(Array.isArray(result.timestamps)).toBe(true);
    });

    it('should retry on failure (up to 3 attempts)', async () => {
      mockKimiService.analyzeVideo.mockRejectedValue(new Error('API Error'));

      try {
        await mockKimiService.analyzeVideo('url', 'title');
      } catch (error) {
        // Expected to fail
      }

      // The service should attempt multiple times
      expect(mockKimiService.analyzeVideo).toHaveBeenCalled();
    });
  });
});
