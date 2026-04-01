import { WidgetConfig } from './types';

export class StyleManager {
  private styleId = 'rb-widget-styles';

  injectStyles(config: WidgetConfig): void {
    if (document.getElementById(this.styleId)) return;

    const primaryColor = config.primaryColor || '#4F6EF7';
    const positionClass =
      config.position === 'bottom-left' ? 'rb-position-left' : 'rb-position-right';

    const styles = `
      .rb-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
          'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica',
          'Arial', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .rb-button {
        position: fixed;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: ${primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        transition: all 0.3s ease;
      }

      .rb-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }

      .rb-button.${positionClass} {
        bottom: 24px;
        ${config.position === 'bottom-left' ? 'left' : 'right'}: 24px;
      }

      .rb-button svg {
        width: 24px;
        height: 24px;
      }

      .rb-panel {
        position: fixed;
        width: 320px;
        height: 480px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
        display: flex;
        flex-direction: column;
        z-index: 999998;
        animation: rb-slide-up 0.3s ease;
      }

      .rb-panel.${positionClass} {
        bottom: 96px;
        ${config.position === 'bottom-left' ? 'left' : 'right'}: 24px;
      }

      @keyframes rb-slide-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .rb-header {
        padding: 16px;
        border-bottom: 1px solid #e5e7eb;
        background-color: ${primaryColor};
        color: white;
        border-radius: 12px 12px 0 0;
      }

      .rb-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .rb-message {
        display: flex;
        gap: 8px;
      }

      .rb-message-user {
        justify-content: flex-end;
      }

      .rb-message-user .rb-message-content {
        background-color: ${primaryColor};
        color: white;
      }

      .rb-message-assistant .rb-message-content {
        background-color: #f3f4f6;
        color: #111827;
      }

      .rb-message-content {
        max-width: 80%;
        padding: 8px 12px;
        border-radius: 8px;
        word-wrap: break-word;
        font-size: 14px;
        line-height: 1.4;
      }

      .rb-confidence-badge {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        margin-top: 4px;
        font-weight: 500;
      }

      .rb-confidence-high {
        background-color: #d1fae5;
        color: #065f46;
      }

      .rb-confidence-medium {
        background-color: #fef3c7;
        color: #92400e;
      }

      .rb-confidence-low {
        background-color: #fee2e2;
        color: #742a2a;
      }

      .rb-escalation-banner {
        background-color: #fef3c7;
        color: #92400e;
        padding: 8px;
        border-radius: 4px;
        font-size: 12px;
        text-align: center;
      }

      .rb-input-area {
        padding: 12px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 8px;
      }

      .rb-input {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
      }

      .rb-send-button {
        padding: 8px 12px;
        background-color: ${primaryColor};
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
      }

      .rb-send-button:hover:not(:disabled) {
        opacity: 0.9;
      }

      .rb-send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .rb-typing-indicator {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
      }

      .rb-typing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #9ca3af;
        animation: rb-bounce 1.4s infinite;
      }

      .rb-typing-dot:nth-child(2) {
        animation-delay: 0.2s;
      }

      .rb-typing-dot:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes rb-bounce {
        0%, 80%, 100% { opacity: 0.5; }
        40% { opacity: 1; }
      }

      @media (max-width: 480px) {
        .rb-panel {
          width: 100%;
          height: 100%;
          max-width: 100vw;
          max-height: 100vh;
          border-radius: 0;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          animation: none;
        }

        .rb-message-content {
          max-width: 90%;
        }
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = this.styleId;
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }
}
