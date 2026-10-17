import React from 'react'
import './ChatHeader.css'

const ChatHeader = ({ sidebarOpen, onToggleSidebar, onLogout }) => {
  return (
    <header className="chat-header">
      <button
        className="icon-btn menu-toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
      >
        <i className="ri-menu-2-line"></i>
      </button>

      {/* SynapseAI Brand Identity with Glowing Logo */}
      <div className="header-brand-container">
        <div className="header-logo-frame">
          <img 
            src="/SynapseAI.png" 
            alt="SynapseAI" 
            className="header-logo-image" 
          />
          <div className="header-logo-glow"></div>
        </div>
        <div className="header-brand-details">
          <span className="header-brand-title">SynapseAI</span>
          <span className="header-version-pill">
            <span className="pulse-indicator-dot"></span>
            Neural Core
          </span>
        </div>
      </div>

      <div className="header-spacer" />

      {/* Header Actions */}
      <div className="header-actions">
        <div className="header-status-badge">
          <span className="status-dot"></span>
          <span className="status-label">Online</span>
        </div>

        <button 
          className="header-logout-btn" 
          onClick={onLogout} 
          title="Sign out of SynapseAI"
        >
          <i className="ri-logout-box-r-line"></i>
          <span className="logout-text">Sign Out</span>
        </button>
      </div>
    </header>
  )
}

export default ChatHeader
