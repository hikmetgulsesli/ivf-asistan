import OpenAI from 'openai';
import { Pool } from 'pg';
import { CacheService } from './cache-service.js';
import { EmbeddingService, ArticleRecord, FaqRecord, VideoRecord } from './embedding-service.js';
import { SentimentService, Sentiment } from './sentiment-service.js';
import { EmergencyService } from './emergency-service.js';

const SYSTEM_PROMPT = `Sen bir tüp bebek (IVF) kliniğinin dijital hasta rehberisin.

KURALLAR:
1. ASLA tanı koyma. "Hamilesiniz", "Düşük yapıyorsunuz" gibi ifadeler YASAK.
2. ASLA ilaç dozu önerme veya ilaç değişikliği yapma.
3. Sadece sana verilen bilgi bankasındaki içerikleri kullan.
4. Bilmiyorsan "Bu konuda doktorunuza danışmanızı öneririm" de.
5. Acil belirtiler (kanama, şiddetli ağrı, ateş, nefes darlığı) için
   HEMEN "Lütfen doktorunuzu veya acil servisi arayın" uyarısı ver.
6. Empatik ve sıcak bir dil kullan. Hasta endişeli olabilir.
7. Cevapların sonunda kaynaklarını belirt.
8. Türkçe yaz, tıbbi terimlerin yanına parantez içinde açıklama ekle.
9. Hasta korku içindeyse (fearful), önce sakinleştirici mesaj ver.
10. Hasta endişeliyse (anxious), empatik giriş yap, sonra bilgiyi sun.
11. Hasta umutluysa (hopeful), pozitif ama gerçekçi destek ver.
12. Her zaman kaynaklarla destekli bilgi ver.
13. Markdown formatı KULLANMA. Başlık (#), kalın (**), italik (*), liste (-) gibi işaretler kullanma. Düz metin yaz.`;

interface ChatContext {
  articles: ArticleRecord[];
  faqs: FaqRecord[];
  videos: VideoRecord[];
}

interface ChatResponse {
  answer: string;
  sources: Array<{
    type: 'article' | 'faq' | 'video';
    id: number;
    title: string;
    url?: string;
    category: string;
  }>;
  sentiment: Sentiment;
  isEmergency: boolean;
  emergencyMessage?: string;
}

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();
}

export class ChatService {
  private cacheService: CacheService;
  private embeddingService: EmbeddingService;
  private sentimentService: SentimentService;
  private emergencyService: EmergencyService;
  private openai: OpenAI;
  private pool: Pool;

  constructor(
    pool: Pool,
    minimaxApiKey: string,
    minimaxApiHost: string,
    cacheTtlHours: number
  ) {
    this.pool = pool;
    this.cacheService = new CacheService(pool, cacheTtlHours);
    this.embeddingService = new EmbeddingService(minimaxApiKey, minimaxApiHost);
    this.sentimentService = new SentimentService();
    this.emergencyService = new EmergencyService();
    this.openai = new OpenAI({
      apiKey: minimaxApiKey,
      baseURL: `${minimaxApiHost}/v1`,
    });
  }

  async getContext(): Promise<ChatContext> {
    const [articlesResult, faqsResult, videosResult] = await Promise.all([
      this.pool.query(
        'SELECT id, title, content, category, tags, embedding FROM articles WHERE status = $1',
        ['published']
      ),
      this.pool.query('SELECT id, question, answer, category, embedding FROM faqs'),
      this.pool.query(
        'SELECT id, title, url, category, summary, key_topics, timestamps, embedding FROM videos WHERE analysis_status = $1',
        ['done']
      ),
    ]);

    return {
      articles: articlesResult.rows,
      faqs: faqsResult.rows,
      videos: videosResult.rows,
    };
  }

  async chat(
    message: string,
    sessionId: string,
    stage?: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    const cachedResponse = await this.cacheService.get(message);
    if (cachedResponse) {
      const cacheTime = Date.now() - startTime;
      console.log(`Cache hit in ${cacheTime}ms`);

      const sentiment = this.sentimentService.analyze(message);
      const emergency = this.emergencyService.detect(message);

      return {
        answer: stripThinkTags(cachedResponse.response),
        sources: cachedResponse.sources,
        sentiment: sentiment.sentiment,
        isEmergency: emergency.isEmergency,
        emergencyMessage: emergency.isEmergency ? emergency.message : undefined,
      };
    }

    const sentimentAnalysis = this.sentimentService.analyze(message);
    console.log(`Sentiment: ${sentimentAnalysis.sentiment} (${sentimentAnalysis.confidence})`);

    const emergencyDetection = this.emergencyService.detect(message);
    if (emergencyDetection.isEmergency) {
      console.log(`Emergency detected: ${emergencyDetection.keywords.join(', ')}`);

      await this.saveConversation(
        sessionId,
        message,
        'user',
        sentimentAnalysis.sentiment,
        [],
        true
      );

      return {
        answer: emergencyDetection.message,
        sources: [],
        sentiment: 'fearful',
        isEmergency: true,
        emergencyMessage: emergencyDetection.message,
      };
    }

    const context = await this.getContext();

    // Graceful degradation: if embedding search fails, continue without search results
    let searchResults: Array<{
      id: number;
      type: 'article' | 'faq' | 'video';
      title: string;
      content?: string;
      url?: string;
      category: string;
      score: number;
      metadata?: Record<string, unknown>;
    }> = [];

    try {
      searchResults = await this.embeddingService.search(
        message,
        context.articles,
        context.faqs,
        context.videos,
        5
      );
    } catch (error) {
      console.warn('Embedding search failed, continuing without context:', error instanceof Error ? error.message : error);
    }

    console.log(`Found ${searchResults.length} relevant results`);

    const contextText = this.buildContextText(searchResults);

    const userPrompt = this.buildUserPrompt(message, contextText, sentimentAnalysis.sentiment, stage);

    const completion = await this.openai.chat.completions.create({
      model: 'MiniMax-M2.5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const rawAnswer = completion.choices[0]?.message?.content || '';
    const answer = stripThinkTags(rawAnswer);

    const sources: Array<{
      type: 'article' | 'faq' | 'video';
      id: number;
      title: string;
      url?: string;
      category: string;
    }> = searchResults.map((result) => ({
      type: result.type,
      id: result.id,
      title: result.title,
      url: result.url,
      category: result.category,
    }));

    await this.cacheService.set(message, answer, sources);

    await this.saveConversation(sessionId, message, 'user', sentimentAnalysis.sentiment, [], false);
    await this.saveConversation(sessionId, answer, 'assistant', sentimentAnalysis.sentiment, sources, false);

    return {
      answer,
      sources,
      sentiment: sentimentAnalysis.sentiment,
      isEmergency: false,
    };
  }

  private buildContextText(results: Array<{ type: string; title: string; content?: string; url?: string; category: string }>): string {
    if (results.length === 0) {
      return 'Bu konuda bilgi bankasında içerik bulunamadı.';
    }

    let context = 'İlgili kaynaklar:\n\n';

    results.forEach((result, index) => {
      context += `Kaynak ${index + 1} (${result.type}): ${result.title}\n`;
      if (result.content) {
        const snippet = result.content.slice(0, 300);
        context += `İçerik: ${snippet}${result.content.length > 300 ? '...' : ''}\n`;
      }
      if (result.url) {
        context += `URL: ${result.url}\n`;
      }
      context += '\n';
    });

    return context;
  }

  private buildUserPrompt(
    message: string,
    contextText: string,
    sentiment: Sentiment,
    stage?: string
  ): string {
    let prompt = '';

    if (sentiment === 'fearful') {
      prompt += 'Hasta korku içinde ve sakinleştirilmeye ihtiyacı var. ';
    } else if (sentiment === 'anxious') {
      prompt += 'Hasta endişeli ve empatik bir yaklaşıma ihtiyaç duyuyor. ';
    } else if (sentiment === 'hopeful') {
      prompt += 'Hasta umutlu ve pozitif ama gerçekçi desteğe ihtiyaç duyuyor. ';
    }

    if (stage) {
      prompt += `Hasta şu aşamada: ${stage}. `;
    }

    prompt += `\n${contextText}\n\n`;
    prompt += `Soru: ${message}\n\n`;
    prompt += 'Lütfen yukarıdaki kaynakları kullanarak empatik ve bilgilendirici bir cevap ver. ';

    return prompt;
  }

  private async saveConversation(
    sessionId: string,
    content: string,
    role: string,
    sentiment: string,
    sources: Array<Record<string, unknown>>,
    _isEmergency: boolean
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO conversations (session_id, role, content, sources, sentiment, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [sessionId, role, content, JSON.stringify(sources), sentiment]
      );
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  async getConversationHistory(sessionId: string, limit: number = 20): Promise<Array<Record<string, unknown>>> {
    const result = await this.pool.query(
      `SELECT id, role, content, sources, sentiment, created_at
       FROM conversations
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, limit]
    );

    return result.rows.reverse();
  }

  async clearSession(sessionId: string): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM conversations WHERE session_id = $1',
      [sessionId]
    );
    return result.rowCount || 0;
  }
}
