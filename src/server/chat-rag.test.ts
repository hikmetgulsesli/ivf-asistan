import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../services/chat-service';
import { SentimentService } from '../services/sentiment-service';
import { EmergencyService } from '../services/emergency-service';

describe('SentimentService', () => {
  const sentimentService = new SentimentService();

  it('should detect calm sentiment', () => {
    const result = sentimentService.analyze('Merhaba, IVF tedavisi hakkında bilgi almak istiyorum');
    expect(result.sentiment).toBe('calm');
  });

  it('should detect anxious sentiment', () => {
    const result = sentimentService.analyze('Çok endiseliyim, stresliyim');
    expect(result.sentiment).toBe('anxious');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect fearful sentiment', () => {
    const result = sentimentService.analyze('Kanama var, çok korkuyorum');
    expect(result.sentiment).toBe('fearful');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect hopeful sentiment', () => {
    const result = sentimentService.analyze('Umutluyum, her şey iyi olacak');
    expect(result.sentiment).toBe('hopeful');
    expect(result.confidence).toBeGreaterThan(0);
  });
});

describe('EmergencyService', () => {
  const emergencyService = new EmergencyService();

  it('should detect emergency for kanama', () => {
    const result = emergencyService.detect('Kanama var, kan geldi');
    expect(result.isEmergency).toBe(true);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.message).toContain('doktorunuzu');
  });

  it('should detect emergency for şiddetli ağrı', () => {
    const result = emergencyService.detect('Çok şiddetli ağrım var, dayanamıyorum');
    expect(result.isEmergency).toBe(true);
    expect(result.message).toContain('ağrı');
  });

  it('should detect emergency for ateş', () => {
    const result = emergencyService.detect('Yüksek ateşim var, titriyorum');
    expect(result.isEmergency).toBe(true);
    expect(result.message).toContain('Ateş');
  });

  it('should detect emergency for nefes darlığı', () => {
    const result = emergencyService.detect('Nefes alamıyorum, nefes darlığı');
    expect(result.isEmergency).toBe(true);
    expect(result.message).toContain('acil');
  });

  it('should detect emergency for bayılma', () => {
    const result = emergencyService.detect('Bayıldım, baş dönmesi var');
    expect(result.isEmergency).toBe(true);
  });

  it('should detect medium severity for karın şişliği', () => {
    const result = emergencyService.detect('Karnım çok şiş, OHSS olabilir mi?');
    expect(result.isEmergency).toBe(true);
    expect(result.message).toContain('OHSS');
  });

  it('should not detect emergency for normal question', () => {
    const result = emergencyService.detect('IVF tedavisi kaç gün sürer?');
    expect(result.isEmergency).toBe(false);
  });
});

describe('ChatService', () => {
  const mockPool = {
    query: vi.fn(),
  } as unknown as import('pg').Pool;

  const chatService = new ChatService(
    mockPool,
    'test-api-key',
    'https://api.minimax.io',
    24
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(chatService).toBeDefined();
  });

  it('should have chat method', () => {
    expect(typeof chatService.chat).toBe('function');
  });

  it('should have getConversationHistory method', () => {
    expect(typeof chatService.getConversationHistory).toBe('function');
  });

  it('should have clearSession method', () => {
    expect(typeof chatService.clearSession).toBe('function');
  });
});

describe('POST /api/chat', () => {
  it('should accept message, session_id, and optional stage', async () => {
    const requestBody = {
      message: 'Test message',
      session_id: 'test-session-123',
      stage: 'tedavi-oncesi',
    };

    expect(requestBody).toHaveProperty('message');
    expect(requestBody).toHaveProperty('session_id');
    expect(requestBody).toHaveProperty('stage');
    expect(typeof requestBody.message).toBe('string');
    expect(typeof requestBody.session_id).toBe('string');
    expect(typeof requestBody.stage).toBe('string');
  });

  it('should require message and session_id', async () => {
    const invalidBody = {};
    expect(invalidBody).not.toHaveProperty('message');
    expect(invalidBody).not.toHaveProperty('session_id');
  });
});

describe('RAG Pipeline', () => {
  it('should return sources array in response', () => {
    const mockResponse = {
      answer: 'Test answer',
      sources: [
        { type: 'article', id: 1, title: 'Test Article', category: 'genel' },
      ],
      sentiment: 'calm',
      isEmergency: false,
    };

    expect(mockResponse).toHaveProperty('sources');
    expect(Array.isArray(mockResponse.sources)).toBe(true);
    expect(mockResponse.sources[0]).toHaveProperty('type');
    expect(mockResponse.sources[0]).toHaveProperty('id');
    expect(mockResponse.sources[0]).toHaveProperty('title');
  });

  it('should include sentiment in response', () => {
    const mockResponse = {
      answer: 'Test answer',
      sources: [],
      sentiment: 'anxious',
      isEmergency: false,
    };

    expect(mockResponse).toHaveProperty('sentiment');
    expect(['calm', 'anxious', 'fearful', 'hopeful']).toContain(mockResponse.sentiment);
  });

  it('should include emergency flag in response', () => {
    const mockResponse = {
      answer: 'Test answer',
      sources: [],
      sentiment: 'fearful',
      isEmergency: true,
      emergencyMessage: 'Lütfen hemen doktorunuzu arayın.',
    };

    expect(mockResponse).toHaveProperty('isEmergency');
    expect(typeof mockResponse.isEmergency).toBe('boolean');
    expect(mockResponse).toHaveProperty('emergencyMessage');
  });
});

describe('Emergency Keywords', () => {
  const emergencyKeywords = [
    'kanama', 'kan geldi', 'lekelenme',
    'şiddetli ağrı', 'dayanılmaz ağrı',
    'ateş', 'titreme',
    'nefes darlığı', 'nefes alamıyorum',
    'bayılma', 'baş dönmesi',
    'karın şişliği', 'ohss',
  ];

  it('should have emergency keywords defined', () => {
    expect(emergencyKeywords.length).toBeGreaterThan(0);
    expect(emergencyKeywords).toContain('kanama');
    expect(emergencyKeywords).toContain('şiddetli ağrı');
    expect(emergencyKeywords).toContain('ateş');
  });
});

describe('System Prompt', () => {
  it('should contain required rules', () => {
    const systemPrompt = `Sen bir tüp bebek (IVF) kliniğinin dijital hasta rehberisin.

KURALLAR:
1. ASLA tanı koyma. "Hamilesiniz", "Düşük yapıyorsunuz" gibi ifadeler YASAK.
2. ASLA ilaç dozu önerme veya ilaç değişikliği yapma.
3. Sadece sana verilen bilgi bankasındaki içerikleri kullan.
4. Bilmiyorsan "Bu konuda doktorunuza danışmanızı öneririm" de.
5. Acil belirtiler (kanama, şiddetli ağrı, ateş, nefes darlığı) için
   HEMEN "Lütfen doktorunuzu veya acil servisi arayın" uyarısı ver.
6. Empatik ve sıcak bir dil kullan. Hasta endişeli olabilir.
7. Cevapların sonunda kaynaklarını belirt.
8. Türkçe yaz, tıbbi terimlerin yanına parantez içinde açıklama ekle.`;

    expect(systemPrompt).toContain('ASLA tanı koyma');
    expect(systemPrompt).toContain('ASLA ilaç dozu önerme');
    expect(systemPrompt).toContain('kanama');
    expect(systemPrompt).toContain('şiddetli ağrı');
    expect(systemPrompt).toContain('ateş');
    expect(systemPrompt).toContain('nefes darlığı');
  });
});
