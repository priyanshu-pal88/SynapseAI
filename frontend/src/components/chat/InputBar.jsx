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
    <div className="input-container">
      <div className="input-wrapper">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message SynapseAI..."
          rows={1}
        />
        <button
          className="send-btn"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          title="Send message"
        >
          <i className="ri-arrow-up-line"></i>
        </button>
      </div>
      <p className="input-disclaimer">SynapseAI can make mistakes. Check important info.</p>
    </div>
  )
}

export default InputBar
