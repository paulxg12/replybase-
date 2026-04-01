import { ChatMessage } from './types';

export class DOM {
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: Partial<Record<string, any>>,
    ...children: (string | HTMLElement)[]
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (props) {
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'className') {
          el.className = value;
        } else if (key === 'innerHTML') {
          el.innerHTML = value;
        } else if (key.startsWith('on')) {
          const eventName = key.slice(2).toLowerCase();
          el.addEventListener(eventName, value);
        } else {
          (el as any)[key] = value;
        }
      });
    }
    children.forEach((child) => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    });
    return el;
  }

  static renderMessage(message: ChatMessage): HTMLElement {
    const container = this.createElement('div', {
      className: `rb-message rb-message-${message.role}`,
    });

    const content = this.createElement('div', {
      className: 'rb-message-content',
      textContent: message.content,
    });

    container.appendChild(content);

    if (message.role === 'assistant' && message.confidence !== undefined) {
      const badge = this.createElement('div', {
        className: `rb-confidence-badge ${
          message.confidence >= 0.8
            ? 'rb-confidence-high'
            : message.confidence >= 0.5
              ? 'rb-confidence-medium'
              : 'rb-confidence-low'
        }`,
        textContent: `${Math.round(message.confidence * 100)}%`,
      });
      container.appendChild(badge);
    }

    if (message.escalated) {
      const escalationBanner = this.createElement('div', {
        className: 'rb-escalation-banner',
        textContent: 'Connecting you with an agent...',
      });
      container.appendChild(escalationBanner);
    }

    return container;
  }
}
