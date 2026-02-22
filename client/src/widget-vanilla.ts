import './widget.css';

interface WidgetConfig {
  apiUrl?: string;
  welcomeMessage?: string;
  clinic?: string;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Source[];
}

interface Source {
  type: 'article' | 'video' | 'faq';
  id: number;
  title: string;
  url?: string;
  timestamp?: string;
}

interface ChatState {
  sessionId: string;
  messages: Message[];
}

class IVFChatWidget {
  private config: WidgetConfig;
  private isOpen = false;
  private messages: Message[] = [];
  private isLoading = false;
  private sessionId: string;
  private suggestedQuestions: string[] = [];
  private container: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private storageKey: string;

  constructor(config: WidgetConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || '/api',
      welcomeMessage: config.welcomeMessage || 'Merhaba! Ben IVF Asistan. Size nasıl yardımcı olabilirim?',
      clinic: config.clinic || 'default',
      theme: config.theme || 'light',
      position: config.position || 'bottom-right',
      ...config,
    };
    this.storageKey = `ivf-chat-${this.config.clinic}`;
    this.sessionId = this.generateSessionId();
    this.loadSession();
    this.init();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const state: ChatState = JSON.parse(stored);
        this.sessionId = state.sessionId;
        this.messages = state.messages;
      }
    } catch {
      // Ignore storage errors
    }
    
    if (this.messages.length === 0) {
      this.messages = [{
        id: 'welcome',
        role: 'assistant',
        content: this.config.welcomeMessage!,
        timestamp: Date.now(),
      }];
    }
  }

  private saveSession(): void {
    try {
      const state: ChatState = {
        sessionId: this.sessionId,
        messages: this.messages,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }

  private init(): void {
    if (document.getElementById('ivf-chat-widget-root')) {
      console.warn('IVF Chat Widget already initialized');
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'ivf-chat-widget-root';
    document.body.appendChild(this.container);

    this.render();
    this.loadSuggestions();
  }

  private render(): void {
    if (!this.container) return;

    const themeClass = this.config.theme === 'dark' ? 'ivf-dark' : '';
    const positionClass = this.config.position === 'bottom-left' ? 'ivf-position-left' : '';

    this.container.innerHTML = `
      <div class="ivf-chat-widget ${themeClass} ${positionClass}">
        ${this.renderChatWindow()}
        ${this.renderFloatingButton()}
      </div>
    `;

    this.attachEventListeners();
  }

  private renderChatWindow(): string {
    if (!this.isOpen) return '';

    return `
      <div class="ivf-chat-window ivf-animate-in">
        <div class="ivf-chat-header">
          <span class="ivf-chat-title">IVF Asistan</span>
          <button class="ivf-close-btn" aria-label="Kapat">×</button>
        </div>
        <div class="ivf-messages-container">
          ${this.messages.map(m => this.renderMessage(m)).join('')}
          ${this.isLoading ? this.renderTypingIndicator() : ''}
        </div>
        ${this.suggestedQuestions.length > 0 ? this.renderSuggestions() : ''}
        <div class="ivf-chat-input-container">
          <input 
            type="text" 
            class="ivf-chat-input" 
            placeholder="Mesajınızı yazın..."
            maxlength="500"
          />
          <button class="ivf-send-btn" aria-label="Gonder">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private renderMessage(message: Message): string {
    const sourcesHtml = message.sources?.length 
      ? `<div class="ivf-sources">${message.sources.map(s => this.renderSource(s)).join('')}</div>`
      : '';

    return `
      <div class="ivf-message ivf-${message.role}">
        <div class="ivf-message-bubble">
          ${this.escapeHtml(message.content)}
        </div>
        ${sourcesHtml}
      </div>
    `;
  }

  private renderSource(source: Source): string {
    const icon = source.type === 'video' ? '▶' : '📄';
    const timestamp = source.timestamp ? `<span class="ivf-source-timestamp">${source.timestamp}</span>` : '';
    
    return `
      <a href="${source.url || '#'}" class="ivf-source-card" target="_blank" rel="noopener">
        <span class="ivf-source-icon">${icon}</span>
        <span class="ivf-source-title">${this.escapeHtml(source.title)}</span>
        ${timestamp}
      </a>
    `;
  }

  private renderTypingIndicator(): string {
    return `
      <div class="ivf-message ivf-assistant ivf-typing">
        <div class="ivf-typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
  }

  private renderSuggestions(): string {
    return `
      <div class="ivf-suggestions">
        ${this.suggestedQuestions.map(q => `
          <button class="ivf-suggestion-btn">${this.escapeHtml(q)}</button>
        `).join('')}
      </div>
    `;
  }

  private renderFloatingButton(): string {
    return `
      <button class="ivf-floating-btn ${this.isOpen ? 'ivf-hidden' : ''}" aria-label="Sohbeti Ac">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      </button>
    `;
  }

  private attachEventListeners(): void {
    const floatingBtn = this.container?.querySelector('.ivf-floating-btn');
    const closeBtn = this.container?.querySelector('.ivf-close-btn');
    const sendBtn = this.container?.querySelector('.ivf-send-btn');
    const input = this.container?.querySelector('.ivf-chat-input') as HTMLInputElement;
    const suggestions = this.container?.querySelectorAll('.ivf-suggestion-btn');

    floatingBtn?.addEventListener('click', () => this.toggleOpen());
    closeBtn?.addEventListener('click', () => this.toggleOpen());
    sendBtn?.addEventListener('click', () => this.handleSend());
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSend();
    });

    suggestions?.forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.textContent || '';
        this.sendMessage(text);
      });
    });

    this.messagesContainer = this.container?.querySelector('.ivf-messages-container') || null;
    this.inputElement = input;
    this.scrollToBottom();
  }

  private toggleOpen(): void {
    this.isOpen = !this.isOpen;
    this.render();
    if (this.isOpen) {
      this.inputElement?.focus();
    }
  }

  private async handleSend(): Promise<void> {
    const text = this.inputElement?.value.trim();
    if (!text) return;

    this.inputElement!.value = '';
    await this.sendMessage(text);
  }

  private async sendMessage(text: string): Promise<void> {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    this.messages.push(userMessage);
    this.isLoading = true;
    this.render();
    this.saveSession();

    try {
      const response = await fetch(`${this.config.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: this.sessionId,
          clinic: this.config.clinic,
        }),
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_resp`,
        role: 'assistant',
        content: data.data?.answer || 'Uzgunum, bir hata olustu.',
        timestamp: Date.now(),
        sources: data.data?.sources,
      };

      this.messages.push(assistantMessage);
    } catch {
      this.messages.push({
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Uzgunum, baglanti hatasi olustu. Lutfen tekrar deneyin.',
        timestamp: Date.now(),
      });
    } finally {
      this.isLoading = false;
      this.render();
      this.saveSession();
    }
  }

  private async loadSuggestions(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/suggestions?clinic=${this.config.clinic}`);
      if (response.ok) {
        const data = await response.json();
        this.suggestedQuestions = data.data?.questions || this.getDefaultSuggestions();
      } else {
        this.suggestedQuestions = this.getDefaultSuggestions();
      }
    } catch {
      this.suggestedQuestions = this.getDefaultSuggestions();
    }
    if (this.isOpen) this.render();
  }

  private getDefaultSuggestions(): string[] {
    return [
      'IVF tedavisine nasıl hazırlanmalıyım?',
      'Embriyo transferi sonrası nelere dikkat etmeliyim?',
      'IVF başarı oranları nedir?',
      'Tup bebek tedavisi ne kadar surer?',
    ];
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}

// Global initialization function
function initIVFChatWidget(config: WidgetConfig = {}): IVFChatWidget {
  return new IVFChatWidget(config);
}

// Auto-initialize if config exists
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).IVFChatWidget = {
    init: initIVFChatWidget,
  };

  const widgetConfig = (window as unknown as { ivfChatWidgetConfig?: WidgetConfig }).ivfChatWidgetConfig;
  if (widgetConfig) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initIVFChatWidget(widgetConfig));
    } else {
      initIVFChatWidget(widgetConfig);
    }
  }
}

export { IVFChatWidget, initIVFChatWidget };
export default initIVFChatWidget;