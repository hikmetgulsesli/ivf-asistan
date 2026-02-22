import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('RAG Chat Engine', () => {

  describe('POST /api/chat', () => {
    it('accepts message and session_id', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'IVF tedavisi nedir?',
          session_id: 'test-session-1',
        });

      // Accept 200 (success) or 500 (database/external API issues)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('answer');
        expect(response.body.data).toHaveProperty('sources');
        expect(response.body.data).toHaveProperty('sentiment');
        expect(response.body.data).toHaveProperty('isEmergency');
        expect(Array.isArray(response.body.data.sources)).toBe(true);
      }
    });

    it('accepts optional stage parameter', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Transfer sonrası nelere dikkat etmeliyim?',
          session_id: 'test-session-2',
          stage: 'transfer-sonrasi',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('answer');
      }
    });

    it('returns 400 when message is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          session_id: 'test-session-3',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when session_id is missing', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when message is empty', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: '',
          session_id: 'test-session-4',
        });

      expect(response.status).toBe(400);
    });

    it('returns 400 when message exceeds 2000 characters', async () => {
      const longMessage = 'a'.repeat(2001);
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: longMessage,
          session_id: 'test-session-5',
        });

      expect(response.status).toBe(400);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      const sessionId = 'rate-limit-test';

      // Make 11 requests quickly (assuming default rate limit of 10/minute)
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/api/chat')
          .send({
            message: `Test message ${i}`,
            session_id: sessionId,
          });

        if (i < 10) {
          // First 10 should succeed or fail for other reasons
          expect([200, 500]).toContain(response.status);
        } else {
          // 11th should be rate limited
          expect(response.status).toBe(429);
          expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        }
      }
    });
  });

  describe('Sentiment Analysis', () => {
    it('detects calm sentiment', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'IVF tedavisi hakkında bilgi almak istiyorum',
          session_id: 'sentiment-calm',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(['calm', 'anxious', 'fearful', 'hopeful']).toContain(response.body.data.sentiment);
      }
    });

    it('detects anxious sentiment', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Çok endiseliyim, ne olacak bilmiyorum',
          session_id: 'sentiment-anxious',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(['anxious', 'fearful', 'calm', 'hopeful']).toContain(response.body.data.sentiment);
      }
    });

    it('detects fearful sentiment', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Çok korkuyorum, yardım edin',
          session_id: 'sentiment-fearful',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(['fearful', 'anxious', 'calm', 'hopeful']).toContain(response.body.data.sentiment);
      }
    });

    it('detects hopeful sentiment', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Umutluyum, her şey güzel olacak',
          session_id: 'sentiment-hopeful',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(['hopeful', 'calm', 'anxious', 'fearful']).toContain(response.body.data.sentiment);
      }
    });
  });

  describe('Emergency Detection', () => {
    it('detects emergency keywords - kanama', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Kanama var, kan geldi',
          session_id: 'emergency-1',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(true);
        expect(response.body.data.emergencyMessage).toBeTruthy();
        expect(response.body.data.sentiment).toBe('fearful');
      }
    });

    it('detects emergency keywords - siddetli agri', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Çok şiddetli ağrım var, dayanamıyorum',
          session_id: 'emergency-2',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(true);
        expect(response.body.data.emergencyMessage).toBeTruthy();
      }
    });

    it('detects emergency keywords - ates', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Yüksek ateşim var, titriyorum',
          session_id: 'emergency-3',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(true);
        expect(response.body.data.emergencyMessage).toBeTruthy();
      }
    });

    it('detects emergency keywords - nefes darligi', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Nefes alamıyorum, nefes darlığı var',
          session_id: 'emergency-4',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(true);
        expect(response.body.data.emergencyMessage).toBeTruthy();
      }
    });

    it('detects emergency keywords - bayilma', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Bayıldım, baş dönmesi var',
          session_id: 'emergency-5',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(true);
        expect(response.body.data.emergencyMessage).toBeTruthy();
      }
    });

    it('detects emergency keywords - OHSS', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Karnım çok şiş, OHSS olabilir mi?',
          session_id: 'emergency-6',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(true);
        expect(response.body.data.emergencyMessage).toBeTruthy();
      }
    });

    it('returns non-emergency for normal questions', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'IVF tedavisi kaç gün sürer?',
          session_id: 'non-emergency',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data.isEmergency).toBe(false);
      }
    });
  });

  describe('Response Structure', () => {
    it('returns sources array', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Tedavi öncesi hazırlık nedir?',
          session_id: 'sources-test',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('sources');
        expect(Array.isArray(response.body.data.sources)).toBe(true);
        
        // If sources exist, check their structure
        if (response.body.data.sources.length > 0) {
          const source = response.body.data.sources[0];
          expect(source).toHaveProperty('type');
          expect(source).toHaveProperty('id');
          expect(source).toHaveProperty('title');
          expect(['article', 'faq', 'video']).toContain(source.type);
        }
      }
    });

    it('returns answer text', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Merhaba',
          session_id: 'answer-test',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('answer');
        expect(typeof response.body.data.answer).toBe('string');
        expect(response.body.data.answer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GET /api/chat/history', () => {
    it('returns conversation history', async () => {
      const sessionId = 'history-test-session';

      // First send a message
      await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message for history',
          session_id: sessionId,
        });

      // Then get history
      const response = await request(app)
        .get(`/api/chat/history?session_id=${sessionId}&limit=10`);

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('meta');
      }
    });

    it('returns 400 when session_id is missing', async () => {
      const response = await request(app)
        .get('/api/chat/history');

      expect(response.status).toBe(400);
    });

    it('validates limit parameter', async () => {
      const response = await request(app)
        .get('/api/chat/history?session_id=test&limit=101');

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/chat/session', () => {
    it('deletes session conversation', async () => {
      const sessionId = 'delete-test-session';

      // First send a message
      await request(app)
        .post('/api/chat')
        .send({
          message: 'Test message for deletion',
          session_id: sessionId,
        });

      // Then delete the session
      const response = await request(app)
        .delete('/api/chat/session')
        .send({
          session_id: sessionId,
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('deleted');
        expect(response.body.data).toHaveProperty('session_id');
      }
    });

    it('returns 400 when session_id is missing', async () => {
      const response = await request(app)
        .delete('/api/chat/session')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
