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
    <div className={`messages ${hasMessages ? 'has-messages' : ''}`} role="log" aria-live="polite">
      {!hasMessages && (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <h2>SynapseAI</h2>
          <p>Start a conversation to explore ideas together.</p>
        </div>
      )}

      {hasMessages && message.map((m, index) => (
        <div key={m.id || `msg-${index}`} className={`message ${m.role || m.type}`}>
          <div className="avatar">
            {(m.role === 'user' || m.type === 'user') ? (
              <i className="ri-user-line"></i>
            ) : (
              <i className="ri-sparkling-line"></i>
            )}
          </div>
          <div className={`bubble ${m.error ? 'error' : ''} ${m.typing ? 'typing-bubble' : ''}`}>
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
      ))}
      <div ref={endRef} />
    </div>
  )
}

export default React.memo(Messages)
