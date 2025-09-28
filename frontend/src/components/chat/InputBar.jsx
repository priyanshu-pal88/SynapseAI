import React from 'react'
import './InputBar.css'

const InputBar = ({ value, onChange, onSend, disabled }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="input-bar-container">
      <div className="input-bar">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          rows={1}
          title="Press Enter to send, Shift+Enter for new line"
        />
        <button className="btn primary" onClick={onSend} disabled={disabled || !value.trim()}>
          Send
        </button>
      </div>
      <div className="input-helper">
        Synapse can make mistakes. Check important info. Press Enter to send, Shift+Enter for new line.
      </div>
    </div>
  )
}

export default InputBar
