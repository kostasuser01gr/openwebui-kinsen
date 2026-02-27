import { useState } from 'react';

interface Citation {
  id: string;
  title: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  suggestedFollowups?: string[];
  confidence?: 'high' | 'medium' | 'low';
  timestamp: string;
  pinned?: boolean;
  reactions?: string[];
  bookmarked?: boolean;
}

interface Props {
  message: Message;
  messageIndex: number;
  onFeedback?: (index: number, rating: 'up' | 'down') => void;
  onFollowupClick?: (query: string) => void;
  onCitationClick?: (citation: Citation) => void;
  onTogglePin?: () => void;
  onReaction?: (emoji: string) => void;
  onBookmark?: () => void;
}

const REACTION_EMOJIS = ['✅', '🔥', '⚠️', '📌'];

export function MessageBubble({
  message,
  messageIndex,
  onFeedback,
  onFollowupClick,
  onCitationClick,
  onTogglePin,
  onReaction,
  onBookmark,
}: Props) {
  const isUser = message.role === 'user';
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  // Simple markdown-lite renderer for bold, headers, lists, tables
  const renderContent = (text: string) => {
    // Split by lines for block-level formatting
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`table-${elements.length}`} className="md-table-wrapper">
            <table className="md-table">
              <thead>
                <tr>
                  {tableRows[0].map((cell, i) => (
                    <th key={i}>{cell.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci}>{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        tableRows = [];
      }
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table detection
      if (line.includes('|') && line.trim().startsWith('|')) {
        if (!inTable) inTable = true;
        // Skip separator rows (|---|---|)
        if (/^\|[\s\-|]+\|$/.test(line.trim())) {
          tableRows.push([]); // placeholder for separator
          continue;
        }
        const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} className="md-h3">
            {line.slice(3)}
          </h3>,
        );
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} className="md-h2">
            {line.slice(2)}
          </h2>,
        );
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        elements.push(<hr key={i} className="md-hr" />);
        continue;
      }

      // List items
      if (/^[\s]*[-•☑]\s/.test(line)) {
        elements.push(
          <div key={i} className="md-list-item">
            {formatInline(line.replace(/^[\s]*[-•☑]\s/, ''))}
          </div>,
        );
        continue;
      }

      // Numbered list
      if (/^[\s]*\d+[.)]\s/.test(line)) {
        elements.push(
          <div key={i} className="md-list-item md-numbered">
            {formatInline(line)}
          </div>,
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        elements.push(<div key={i} className="md-spacer" />);
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={i} className="md-p">
          {formatInline(line)}
        </p>,
      );
    }

    if (inTable) flushTable();
    return elements;
  };

  const formatInline = (text: string) => {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      // Italic _text_
      const italicParts = part.split(/(_[^_]+_)/g);
      return italicParts.map((ip, j) => {
        if (ip.startsWith('_') && ip.endsWith('_') && ip.length > 2) {
          return <em key={`${i}-${j}`}>{ip.slice(1, -1)}</em>;
        }
        return ip;
      });
    });
  };

  return (
    <div
      className={`message ${message.role} ${message.pinned ? 'pinned' : ''} ${message.bookmarked ? 'bookmarked' : ''}`}
    >
      <div className="message-bubble">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="md-content">{renderContent(message.content)}</div>
        )}
      </div>
      {!isUser && message.citations && message.citations.length > 0 && (
        <div className="citations">
          <span className="citation-label">Sources:</span>
          {message.citations.map((c) => (
            <button
              key={c.id}
              className="citation-tag citation-clickable"
              onClick={() => onCitationClick?.(c)}
              title="Click to view full note"
            >
              {c.title}
            </button>
          ))}
        </div>
      )}
      {/* Action bar */}
      {!isUser && (
        <div className="message-actions-bar">
          {onFeedback && (
            <div className="feedback-row">
              <button
                className={`feedback-btn ${feedbackGiven === 'up' ? 'active' : ''}`}
                onClick={() => {
                  setFeedbackGiven('up');
                  onFeedback(messageIndex, 'up');
                }}
                disabled={feedbackGiven !== null}
                title="Helpful"
              >
                👍
              </button>
              <button
                className={`feedback-btn ${feedbackGiven === 'down' ? 'active' : ''}`}
                onClick={() => {
                  setFeedbackGiven('down');
                  onFeedback(messageIndex, 'down');
                }}
                disabled={feedbackGiven !== null}
                title="Not helpful"
              >
                👎
              </button>
              {feedbackGiven && <span className="feedback-thanks">Thanks!</span>}
            </div>
          )}
          {onReaction && (
            <div className="reaction-row">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  className={`reaction-btn ${message.reactions?.includes(emoji) ? 'active' : ''}`}
                  onClick={() => onReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
          {onTogglePin && (
            <button
              className={`icon-btn pin-btn ${message.pinned ? 'active' : ''}`}
              onClick={onTogglePin}
              title={message.pinned ? 'Unpin' : 'Pin'}
            >
              📌
            </button>
          )}
          {onBookmark && (
            <button
              className={`icon-btn bookmark-btn ${message.bookmarked ? 'active' : ''}`}
              onClick={onBookmark}
              title={message.bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {message.bookmarked ? '🔖' : '🏷️'}
            </button>
          )}
        </div>
      )}
      {/* Suggested follow-ups */}
      {!isUser &&
        message.suggestedFollowups &&
        message.suggestedFollowups.length > 0 &&
        onFollowupClick && (
          <div className="followup-chips">
            {message.suggestedFollowups.map((q, i) => (
              <button key={i} className="followup-chip" onClick={() => onFollowupClick(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
