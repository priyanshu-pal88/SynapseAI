import React, { useState, useEffect, useRef } from 'react'
import './ChatSidebar.css'

const ChatSidebar = ({ id = 'sidebar', chats, activeChatId, onSelectChat, onNewChat, onDeleteChat, onRenameChat, open, onClose }) => {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [chatToDelete, setChatToDelete] = useState(null)
  const sidebarRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setOpenMenuId(null)
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const handleDeleteClick = (e, chatId) => {
    e.stopPropagation()
    const chat = chats.find(c => (c._id || c.id) === chatId)
    setDeleteConfirmId(chatId)
    setChatToDelete(chat)
    setOpenMenuId(null)
  }

  const handleConfirmDelete = () => {
    if (deleteConfirmId && onDeleteChat) {
      onDeleteChat(deleteConfirmId)
    }
    setDeleteConfirmId(null)
    setChatToDelete(null)
  }

  const handleCancelDelete = () => {
    setDeleteConfirmId(null)
    setChatToDelete(null)
  }

  const handleMenuToggle = (e, chatId) => {
    e.stopPropagation()
    setOpenMenuId(openMenuId === chatId ? null : chatId)
  }

  const handleRenameClick = (e, chatId, currentTitle) => {
    e.stopPropagation()
    setEditingId(chatId)
    setEditTitle(currentTitle)
    setOpenMenuId(null)
  }

  const handleRenameSubmit = (e, chatId) => {
    e.stopPropagation()
    if (e.key === 'Enter' || e.type === 'blur') {
      if (editTitle.trim() && onRenameChat) {
        onRenameChat(chatId, editTitle.trim())
      }
      setEditingId(null)
      setEditTitle('')
    }
    if (e.key === 'Escape') {
      setEditingId(null)
      setEditTitle('')
    }
  }

  return (
    <aside id={id} className={`chat-sidebar ${open ? 'open' : 'closed'}`} ref={sidebarRef}>
      <div className="sidebar-top">
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <img 
              src="/SynapseAI.png" 
              alt="Synapse AI" 
              className="sidebar-logo"
            />
          </div>
          <div className="sidebar-actions">
            <button className="btn small" onClick={onNewChat} title="Start a new session">
              <i className="ri-add-line"></i>
              New Session
            </button>
            <button
              className="btn small close-btn"
              onClick={onClose}
              aria-label="Close sidebar"
              title="Close sidebar"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        </div>
      </div>
      <div className="chat-list">
        {(!chats || chats.length === 0) && <div className="empty">No chats yet</div>}
        {chats && chats.map((c, index) => {
          const chatId = c._id || c.id;
          const isEditing = editingId === chatId;
          const isMenuOpen = openMenuId === chatId;
          
          return (
            <div
              key={chatId || `chat-${index}`}
              className={`chat-list-item ${chatId === activeChatId ? 'active' : ''} ${isMenuOpen ? 'menu-open' : ''}`}
              onClick={() => !isEditing && onSelectChat(chatId)}
            >
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => handleRenameSubmit(e, chatId)}
                  onBlur={(e) => handleRenameSubmit(e, chatId)}
                  className="rename-input"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="title" title={c.title}>{c.title}</span>
              )}
              
              <div className="chat-actions">
                <button
                  className="menu-btn"
                  onClick={(e) => handleMenuToggle(e, chatId)}
                  title="Chat options"
                  aria-label={`Options for ${c.title}`}
                >
                  <i className="ri-more-2-line"></i>
                </button>
                
                {isMenuOpen && (
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={(e) => handleRenameClick(e, chatId, c.title)}
                    >
                      <i className="ri-edit-line"></i>
                      Rename
                    </button>
                    <button
                      className="dropdown-item delete"
                      onClick={(e) => handleDeleteClick(e, chatId)}
                    >
                      <i className="ri-delete-bin-line"></i>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="delete-modal-overlay">
          <div className="delete-modal">
            <div className="delete-modal-header">
              <h3>Delete Chat</h3>
            </div>
            <div className="delete-modal-body">
              <p>Are you sure you want to delete</p>
              <p className="chat-title-highlight">"{chatToDelete?.title || 'this chat'}"?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="delete-modal-actions">
              <button 
                className="btn-cancel" 
                onClick={handleCancelDelete}
              >
                <i className="ri-close-line"></i>
                Cancel
              </button>
              <button 
                className="btn-delete" 
                onClick={handleConfirmDelete}
              >
                <i className="ri-delete-bin-line"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="footer-content">
          <div className="footer-branding">
            <img src="/SynapseAI.png" alt="Synapse AI" className="footer-logo" />
            <div className="footer-text">
              <h4>Synapse AI</h4>
              <p>Intelligent conversations, limitless possibilities</p>
            </div>
          </div>
          <div className="footer-stats">
            <div className="stat-item">
              <i className="ri-chat-3-line"></i>
              <span>{chats?.length || 0} conversations</span>
            </div>
            <div className="stat-item">
              <i className="ri-sparkling-line"></i>
              <span>Powered by AI</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default ChatSidebar
