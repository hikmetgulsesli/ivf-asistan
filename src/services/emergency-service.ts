export interface EmergencyDetection {
  isEmergency: boolean;
  keywords: string[];
  message: string;
}

export class EmergencyService {
  private emergencyKeywords: {
    pattern: RegExp;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }[];

  constructor() {
    this.emergencyKeywords = [
      {
        pattern: /kan(ama| geldi| lekelenme| dökülme)/i,
        severity: 'high',
        message: 'Kanama belirtisi tespit edildi. Lütfen hemen doktorunuzu veya acil servisi arayın.',
      },
      {
        pattern: /(çok)?(şiddetli|dayanılmaz|korkunç|berbat) (ağrı|sanci|acı)/i,
        severity: 'high',
        message: 'Şiddetli ağrı belirtisi tespit edildi. Lütfen hemen doktorunuzu arayın.',
      },
      {
        pattern: /(yüksek|çok) (ateş|titreme|titriyor)/i,
        severity: 'high',
        message: 'Ateş/titreme belirtisi tespit edildi. Lütfen hemen doktorunuzu arayın.',
      },
      {
        pattern: /nefes (darlığı|almıyorum|alamiyorum|kesilmesi)/i,
        severity: 'high',
        message: 'Nefes darlığı belirtisi tespit edildi. Bu acil bir durumdur, lütfen acil servise başvurun.',
      },
      {
        pattern: /(bayıldım|bayılıyorum|bayılmak üzereyim|baş dönmesi)/i,
        severity: 'high',
        message: 'Bayılma/baş dönmesi belirtisi tespit edildi. Lütfen hemen doktorunuzu veya acil servisi arayın.',
      },
      {
        pattern: /(karın şişliği|şiş karın|karnım çok şiş|ohss)/i,
        severity: 'medium',
        message: 'Karın şişliği veya OHSS belirtisi olabilir. Lütfen en kısa sürede doktorunuzu arayın.',
      },
      {
        pattern: /ağrı/i,
        severity: 'low',
        message: 'Ağrı belirtisi tespit edildi. Eğer ağrı şiddetliyse veya artıyorsa doktorunuza başvurun.',
      },
    ];
  }

  detect(text: string): EmergencyDetection {
    const detectedKeywords: string[] = [];
    let highestSeverity: 'high' | 'medium' | 'low' | null = null;
    let emergencyMessage = '';

    for (const emergency of this.emergencyKeywords) {
      const match = text.match(emergency.pattern);
      if (match) {
        detectedKeywords.push(match[0]);

        if (
          !highestSeverity ||
          (emergency.severity === 'high' && highestSeverity !== 'high') ||
          (emergency.severity === 'medium' && highestSeverity === 'low')
        ) {
          highestSeverity = emergency.severity;
          emergencyMessage = emergency.message;
        }
      }
    }

    return {
      isEmergency: highestSeverity === 'high' || highestSeverity === 'medium',
      keywords: detectedKeywords,
      message: emergencyMessage || '',
    };
  }
}
