import React, { useEffect, useRef } from 'react'
import './Messages.css'

const Messages = ({ message }) => {
  const endRef = useRef(null)

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [message])

  const hasMessages = message && message.length > 0

  return (
    <div className={`messages ${hasMessages ? 'has-messages' : 'empty-view'}`} role="log" aria-live="polite">
      {!hasMessages && (
        <div className="empty-state">
          <div className="empty-logo-aura-container">
            <div className="empty-logo-aura"></div>
            <div className="empty-logo-frame">
              <img 
                src="/SynapseAI.png" 
                alt="Synapse AI" 
                className="empty-logo-img"
              />
            </div>
          </div>

          <h2 className="empty-title">Ready to explore with Synapse AI?</h2>
          <p className="empty-subtitle">
            Experience intelligent conversations, deep reasoning, and creativity crafted with neural precision.
          </p>

          <div className="empty-feature-cards">
            <div className="feature-card">
              <i className="ri-brain-line"></i>
              <div className="feature-card-text">
                <span className="card-title">Deep Reasoning</span>
                <span className="card-desc">Complex questions & analysis</span>
              </div>
            </div>
            <div className="feature-card">
              <i className="ri-code-s-slash-line"></i>
              <div className="feature-card-text">
                <span className="card-title">Code & Architecture</span>
                <span className="card-desc">Refactor, debug & develop</span>
              </div>
            </div>
            <div className="feature-card">
              <i className="ri-magic-line"></i>
              <div className="feature-card-text">
                <span className="card-title">Creative Synthesis</span>
                <span className="card-desc">Ideate & compose content</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasMessages && (
        <div className="messages-flow">
          {message.map((m, index) => {
            const isUser = m.role === 'user' || m.type === 'user';

            return (
              <div key={m.id || `msg-${index}`} className={`message ${isUser ? 'user' : 'assistant'}`}>
                <div className="message-avatar-wrap">
                  {isUser ? (
                    <div className="avatar user-avatar">
                      <i className="ri-user-3-line"></i>
                    </div>
                  ) : (
                    <div className="avatar ai-avatar">
                      <img src="/SynapseAI.png" alt="Synapse AI" className="ai-avatar-logo" />
                      <div className="ai-avatar-glow"></div>
                    </div>
                  )}
                </div>

                <div className={`bubble ${m.error ? 'error' : ''} ${m.typing ? 'typing-bubble' : ''}`}>
                  <div className="message-header-meta">
                    <span className="sender-name">{isUser ? 'You' : 'Synapse AI'}</span>
                  </div>

                  {m.typing ? (
                    <div className="typing-animation">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  ) : (
                    <div className="content">{m.content}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

export default React.memo(Messages)
