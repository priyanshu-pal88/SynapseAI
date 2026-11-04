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

  const handleOpenPdf = (e, url) => {
    e.stopPropagation()
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDownloadPdf = async (e, url, fileName) => {
    e.stopPropagation()
    e.preventDefault()
    if (!url) return

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Fetch failed')
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'document.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
    } catch (err) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

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
            const hasAttachments = m.attachments && m.attachments.length > 0;

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

                  {/* Clean, luxury attachment cards (ChatGPT / Claude style) */}
                  {hasAttachments && (
                    <div className="message-attachments-grid">
                      {m.attachments.map((att, attIndex) => {
                        const fileUrl = att.fileUrl;
                        const docName = att.fileName || 'Document.pdf';

                        return (
                          <div
                            key={attIndex}
                            className={`msg-file-card ${fileUrl ? 'clickable' : ''}`}
                            onClick={(e) => fileUrl && handleOpenPdf(e, fileUrl)}
                            title={fileUrl ? `Click to view ${docName}` : docName}
                          >
                            <div className="msg-file-icon">
                              <i className="ri-file-pdf-2-fill"></i>
                            </div>
                            <div className="msg-file-meta">
                              <span className="msg-file-name">{docName}</span>
                              <span className="msg-file-type">PDF</span>
                            </div>
                            {fileUrl && (
                              <button
                                type="button"
                                className="msg-file-dl-btn"
                                onClick={(e) => handleDownloadPdf(e, fileUrl, docName)}
                                title="Download PDF"
                                aria-label="Download PDF"
                              >
                                <i className="ri-download-2-line"></i>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

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
