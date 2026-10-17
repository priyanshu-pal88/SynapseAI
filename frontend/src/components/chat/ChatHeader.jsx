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
        <i className="ri-menu-line"></i>
      </button>

      <h1 className="header-title">
        <span className="title-icon">✦</span>
        SynapseAI
      </h1>

      <div className="header-spacer" />

      <button className="icon-btn logout-trigger" onClick={onLogout} title="Sign out">
        <i className="ri-logout-box-r-line"></i>
      </button>
    </header>
  )
}

export default ChatHeader
