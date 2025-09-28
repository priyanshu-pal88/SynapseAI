import React from 'react'
import './ChatHeader.css'

const ChatHeader = ({ sidebarOpen, onToggleSidebar, onLogout }) => {
  return (
    <header className="chat-header">
      <button
        className="icon-btn menu"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
      >
        ☰
      </button>
      
      {/* Animated Logo */}
      <div className="logo-container">
        <div className="logo-wrapper">
          <img 
            src="/SynapseAI.png" 
            alt="SynapseAI Logo" 
            className="logo-image"
          />
          <div className="logo-glow"></div>
        </div>
        <span className="logo-text">SynapseAI</span>
      </div>
      
      <div className="spacer" />
      <button className="btn logout-btn" onClick={onLogout} title="Logout">
        <span className="logout-icon">⏻</span>
        <span className="logout-text">Logout</span>
      </button>
    </header>
  )
}

export default ChatHeader
