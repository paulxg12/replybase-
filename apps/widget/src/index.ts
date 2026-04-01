import { WidgetConfig, ChatSession, ChatMessage } from './types';
import { generateVisitorId, getSessionId, setSessionId } from './utils';
import { DOM } from './dom';
import { StyleManager } from './styles';

export class ReplybaseWidget {
  private config: WidgetConfig;
  private session: ChatSession | null = null;
  private apiUrl: string;
  private visitorId: string;
  private container: HTMLElement | null = null;
  private isOpen = false;
  private styleManager: StyleManager;

  constructor(config: WidgetConfig, apiUrl = 'http://localhost:4000') {
    this.config = config;
    this.apiUrl = apiUrl;
    this.visitorId = generateVisitorId();
    this.styleManager = new StyleManager();
    this.initialize();
  }

  private initialize(): void {
    this.styleManager.injectStyles(this.config);
    this.createWidget();
  }

  private createWidget(): void {
    // Create main container
    const container = DOM.createElement('div', {
      className: 'rb-widget',
    });

    // Chat button
    const button = DOM.createElement('button', {
      className: `rb-button rb-position-${
        this.config.position === 'bottom-left' ? 'left' : 'right'
      }`,
      onClick: () => this.togglePanel(),
      title: 'Open chat',
    });

    // Chat icon SVG (simplified)
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    `;

    // Chat panel
    const panel = DOM.createElement('div', {
      className: `rb-panel rb-position-${
        this.config.position === 'bottom-left' ? 'left' : 'right'
      }`,
      style: { display: 'none' },
    });

    const header = DOM.createElement('div', {
      className: 'rb-header',
    });
    header.innerHTML = `
      <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
        ${this.config.greeting || 'Hi! How can we help?'}
      </div>
      <div style="font-size: 12px; opacity: 0.9;">${this.config.greeting || 'We typically reply within minutes'}</div>
    `;

    const messagesContainer = DOM.createElement('div', {
      className: 'rb-messages',
      id: 'rb-messages',
    });

    const inputArea = DOM.createElement('div', {
      className: 'rb-input-area',
    });

    const input = DOM.createElement('input', {
      className: 'rb-input',
      type: 'text',
      placeholder: 'Type your message...',
      id: 'rb-input',
    });

    const sendButton = DOM.createElement('button', {
      className: 'rb-send-button',
      textContent: 'Send',
      onClick: () => this.sendMessage(input),
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(input);
      }
    });

    inputArea.appendChild(input);
    inputArea.appendChild(sendButton);

    panel.appendChild(header);
    panel.appendChild(messagesContainer);
    panel.appendChild(inputArea);

    container.appendChild(button);
    container.appendChild(panel);

    document.body.appendChild(container);
    this.container = container;
  }

  private togglePanel(): void {
    if (!this.container) return;

    const panel = this.container.querySelector('.rb-panel') as HTMLElement;
    if (!panel) return;

    this.isOpen = !this.isOpen;
    panel.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      const input = this.container.querySelector('#rb-input') as HTMLInputElement;
      if (input) input.focus();
    }
  }

  private async sendMessage(inputEl: HTMLInputElement): Promise<void> {
    const message = inputEl.value.trim();
    if (!message) return;

    // Add user message to UI
    const messagesContainer = this.container?.querySelector(
      '#rb-messages'
    ) as HTMLElement;
    if (!messagesContainer) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    messagesContainer.appendChild(DOM.renderMessage(userMessage));
    inputEl.value = '';

    // Show typing indicator
    const typingDiv = DOM.createElement('div', {
      className: 'rb-typing-indicator',
    });
    for (let i = 0; i < 3; i++) {
      typingDiv.appendChild(DOM.createElement('div', { className: 'rb-typing-dot' }));
    }
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantPublicKey: this.config.publicKey,
          visitorId: this.visitorId,
          sessionId: getSessionId(),
          message,
        }),
      });

      const data = await response.json();

      // Remove typing indicator
      typingDiv.remove();

      if (data.ok) {
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: data.data.reply,
          timestamp: Date.now(),
          confidence: data.data.confidence,
          escalated: data.data.escalated,
          sources: data.data.sources,
        };

        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }

        messagesContainer.appendChild(DOM.renderMessage(assistantMessage));
      } else {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again later.',
          timestamp: Date.now(),
          escalated: true,
        };
        messagesContainer.appendChild(DOM.renderMessage(errorMessage));
      }

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
      // Remove typing indicator
      typingDiv.remove();

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Unable to connect. Please try again.',
        timestamp: Date.now(),
        escalated: true,
      };
      messagesContainer.appendChild(DOM.renderMessage(errorMessage));
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
}

// Initialize widget when script loads
if (window.ReplybaseConfig) {
  const config = window.ReplybaseConfig as WidgetConfig;
  const apiUrl = (window as any).ReplybaseApiUrl || 'https://api.replybase.ai';
  new ReplybaseWidget(config, apiUrl);
}

declare global {
  interface Window {
    ReplybaseConfig?: WidgetConfig;
    ReplybaseApiUrl?: string;
  }
}
