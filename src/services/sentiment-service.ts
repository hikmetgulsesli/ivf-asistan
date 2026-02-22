export type Sentiment = 'calm' | 'anxious' | 'fearful' | 'hopeful';

export interface SentimentAnalysis {
  sentiment: Sentiment;
  confidence: number;
}

export class SentimentService {
  private anxiousKeywords: string[];
  private fearfulKeywords: string[];
  private hopefulKeywords: string[];

  constructor() {
    this.anxiousKeywords = [
      'endiseliyim',
      'korkuyorum',
      'stresli',
      'merak ediyorum',
      'acaba',
      'ne olur',
      'bilmiyorum',
      'kararsızım',
      'şüpheliyim',
      'endişe',
      'kaygılı',
      'gergin',
      'endişeli',
    ];

    this.fearfulKeywords = [
      'çok acı',
      'dayanamıyorum',
      'kan',
      'kanama',
      'kan geldi',
      'lekelenme',
      'ates',
      'titreme',
      'nefes darlığı',
      'nefes alamıyorum',
      'bayıldım',
      'bayılıyorum',
      'baş dönmesi',
      'karın şişliği',
      'ohss',
      'panik',
      'korkunç',
      'yardım',
      'acil',
      'doktor',
      'hemen',
    ];

    this.hopefulKeywords = [
      'umutluyum',
      'mutluyum',
      'heyecanlıyım',
      'iyi',
      'güzel',
      'harika',
      'umut',
      'mutlu',
      'sevinçli',
      'tamamdır',
      'olur',
      'başarılı',
    ];
  }

  analyze(text: string): SentimentAnalysis {
    const normalizedText = text.toLowerCase();

    const fearfulMatches = this.fearfulKeywords.filter((kw) =>
      normalizedText.includes(kw)
    );
    if (fearfulMatches.length > 0) {
      return {
        sentiment: 'fearful',
        confidence: Math.min(fearfulMatches.length * 0.3, 1),
      };
    }

    const anxiousMatches = this.anxiousKeywords.filter((kw) =>
      normalizedText.includes(kw)
    );
    if (anxiousMatches.length > 0) {
      return {
        sentiment: 'anxious',
        confidence: Math.min(anxiousMatches.length * 0.2, 1),
      };
    }

    const hopefulMatches = this.hopefulKeywords.filter((kw) =>
      normalizedText.includes(kw)
    );
    if (hopefulMatches.length > 0) {
      return {
        sentiment: 'hopeful',
        confidence: Math.min(hopefulMatches.length * 0.25, 1),
      };
    }

    return { sentiment: 'calm', confidence: 0.5 };
  }
}
