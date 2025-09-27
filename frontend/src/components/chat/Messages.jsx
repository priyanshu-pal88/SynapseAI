import React, { useEffect, useRef } from 'react'
import './Messages.css'

const Messages = ({ message }) => {
  const endRef = useRef(null)

  // Auto-scroll when messages change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [message])

  return (
    <div className="messages" role="log" aria-live="polite">
      {(!message || message.length === 0) && (
        <div className="empty-state">
          <h2>What's on the agenda today?</h2>
        </div>
      )}

      {message && message.map((m, index) => (
        <div key={m.id || `message-${index}`} className={`message ${m.role || m.type}`}>
          <div className="avatar" aria-hidden>
            {(m.role === 'user' || m.type === 'user') ? 'You' : 'ChatGPT'}
          </div>
          <div className={`bubble ${m.error ? 'error' : ''} ${m.typing ? 'typing-bubble' : ''}`}>
            {m.typing ? (
              <div className="typing-animation">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            ) : (
              m.content
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

export default React.memo(Messages)
