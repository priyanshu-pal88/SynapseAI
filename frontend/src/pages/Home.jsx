import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io } from "socket.io-client";
import '../components/chat/chat-layout.css'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatHeader from '../components/chat/ChatHeader'
import Messages from '../components/chat/Messages'
import InputBar from '../components/chat/InputBar'
import { useDispatch, useSelector } from 'react-redux'
import './Home.css'
import {
  selectChats,
  selectCurrentChatId,
  selectCurrentMessages,
  selectChat,
  newChat as newChatAction,
  deleteChat as deleteChatAction,
  addMessage,
  replaceMessage,
  updateCurrentChatTitleIfNeeded,
  setChats,
} from '../store/chatSlice'
import axios from 'axios'
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
// const API_BASE_URL = 'http://localhost:3000'

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const Home = () => {
  const dispatch = useDispatch()
  const chats = useSelector(selectChats)
  const activeChatId = useSelector(selectCurrentChatId)
  const messages = useSelector(selectCurrentMessages)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(min-width: 961px)').matches
    }
    return true
  })
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState([])
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const navigate = useNavigate()

  // ── Document Upload State ──
  const [pendingFiles, setPendingFiles] = useState([])   // Files selected but not yet uploaded
  const [uploadedDocs, setUploadedDocs] = useState([])   // Successfully uploaded document records
  const [isUploading, setIsUploading] = useState(false)


  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen((s) => !s)
    }
  }

  const handleCloseSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(false)
    }
  }

  // Check if user is authenticated
  const checkAuthentication = async () => {
    const start = Date.now()
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, { withCredentials: true })
      if (response.data.success) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
        navigate('/login')
      }
    } catch (error) {
      console.log('Authentication check failed:', error?.response?.status, error?.response?.data)
      setIsAuthenticated(false)
      navigate('/login')
    } finally {
      const elapsed = Date.now() - start
      const minDisplay = 400
      const delay = Math.max(0, minDisplay - elapsed)
      setTimeout(() => setIsCheckingAuth(false), delay)
    }
  }

  useEffect(() => {
    checkAuthentication()
  }, [])

  useEffect(() => {
    // Only load chats and setup socket if authenticated
    if (!isAuthenticated) return

    // Load user chats from server
    axios.get(`${API_BASE_URL}/api/chat`, { withCredentials: true })
      .then((res) => {
        console.log('Chats loaded successfully:', res.data);
        const serverChats = (res.data.chats || []).reverse()
        dispatch(setChats(serverChats))

        // Requirement 1: Whenever user logs in or opens the page, the first chat gets selected automatically
        if (serverChats.length > 0) {
          const firstId = serverChats[0]._id || serverChats[0].id
          dispatch(selectChat(firstId))
          getMessages(firstId)
        } else {
          dispatch(selectChat(''))
          setMessage([])
        }
      }).catch((err) => {
        console.log('GET /api/chat failed:', err?.response?.status, err?.response?.data || err?.message)
      })

    const newSocket = io(API_BASE_URL, {
      withCredentials: true
    });

    // Handle typing indicator
    newSocket.on("ai-typing", (payload) => {
      if (payload.typing) {
        setMessage((prevMessages) => {
          const withoutTyping = prevMessages.filter(m => !m.typing);
          return [...withoutTyping, {
            id: 'typing-indicator',
            role: 'assistant',
            content: '',
            typing: true,
            ts: Date.now()
          }];
        });
      } else {
        setMessage((prevMessages) => prevMessages.filter(m => !m.typing));
      }
    });

    newSocket.on("ai-response", (messagePayload) => {
      setIsSending(false)
      setMessage((prevMessages) => {
        const withoutTyping = prevMessages.filter(m => !m.typing);
        return [...withoutTyping, {
          id: uid(),
          role: 'assistant',
          content: messagePayload.content,
          ts: Date.now()
        }];
      });
      if (messagePayload?.chat) {
        dispatch(addMessage({
          chatId: messagePayload.chat,
          message: {
            id: uid(),
            role: 'assistant',
            content: messagePayload.content,
            ts: Date.now(),
          }
        }))
      }
    })

    newSocket.on("ai-error", (payload) => {
      setIsSending(false)
      const chatId = payload?.chat || activeChatId
      const messageText = payload?.message || 'The AI could not respond right now. Please try again.'
      setMessage((prevMessages) => {
        const withoutTyping = prevMessages.filter(m => !m.typing)
        return [...withoutTyping, {
          id: uid(),
          role: 'assistant',
          content: messageText,
          ts: Date.now(),
          error: true,
        }]
      })
      if (chatId) {
        dispatch(addMessage({
          chatId,
          message: {
            id: uid(),
            role: 'assistant',
            content: messageText,
            ts: Date.now(),
            error: true,
          }
        }))
      }
    })

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect()
      }
    }

  }, [isAuthenticated])

  // ── Document Upload Logic ──

  // Handle file selection from InputBar
  function handleFilesChange(newFiles) {
    const filesToAdd = newFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      status: null,
      documentId: null,
      document: null,
    }))
    setPendingFiles(prev => [...prev, ...filesToAdd])
  }

  // Remove a file from the pending list
  function handleRemoveFile(index) {
    setPendingFiles(prev => {
      const updated = [...prev]
      const removed = updated.splice(index, 1)[0]
      if (removed.documentId) {
        setUploadedDocs(prevDocs => prevDocs.filter(d => d._id !== removed.documentId))
      }
      return updated
    })
  }

  // Upload a single file to the backend
  async function uploadSingleFile(file, chatId, fileIndex) {
    const formData = new FormData()
    formData.append('file', file)

    setPendingFiles(prev => prev.map((f, i) =>
      i === fileIndex ? { ...f, status: 'uploading' } : f
    ))

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/${chatId}/upload`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      )

      const doc = response.data.document

      setPendingFiles(prev => prev.map((f, i) =>
        i === fileIndex ? {
          ...f,
          status: doc.status || 'ready',
          documentId: doc._id,
          document: doc
        } : f
      ))

      return doc
    } catch (error) {
      const errMsg = error?.response?.data?.message || error.message || 'Upload failed'
      console.error('File upload failed:', errMsg)

      setPendingFiles(prev => prev.map((f, i) =>
        i === fileIndex ? { ...f, status: 'error' } : f
      ))

      return { _error: true, fileName: file.name, message: errMsg }
    }
  }

  // Upload all pending files
  async function uploadAllPendingFiles(chatId) {
    const filesToUpload = pendingFiles
      .map((f, index) => ({ ...f, originalIndex: index }))
      .filter(f => !f.documentId && f.status !== 'error')

    if (filesToUpload.length === 0) {
      const alreadyUploaded = pendingFiles.filter(f => f.documentId && f.document)
        .map(f => f.document)
      return { successDocs: alreadyUploaded, failedNames: [] }
    }

    setIsUploading(true)

    const results = await Promise.all(
      filesToUpload.map(f => uploadSingleFile(f.file, chatId, f.originalIndex))
    )

    setIsUploading(false)

    const successDocs = results.filter(r => r && !r._error)
    const failedNames = results.filter(r => r && r._error).map(r => r.fileName)

    return { successDocs, failedNames }
  }


  async function handleSend() {
    const text = input.trim()
    const hasFiles = pendingFiles.length > 0

    // Requirement 3: Text message is strictly required!
    // Do not allow sending with empty message even if a file is selected.
    if (!text || isSending || isUploading) return

    // 1. Clear input & lock UI
    setInput('')
    setIsSending(true)

    try {
      // Requirement 2: Check if activeChatId actually exists in loaded chats
      const chatExists = chats.some(c => (c._id || c.id) === activeChatId)
      let targetChatId = chatExists ? activeChatId : null

      // If no chat exists or activeChatId is invalid, create a new chat on backend
      if (!targetChatId) {
        const titleText = text.slice(0, 30) || 'New chat'
        targetChatId = await handleNewChat({ programmatic: true, draftText: titleText })
        if (!targetChatId) {
          setIsSending(false)
          alert('Could not start a new chat session on the server. Please try again.')
          return
        }
      }

      // 3. Upload files FIRST (before showing user message)
      let uploadedDocuments = []
      if (hasFiles) {
        const { successDocs, failedNames } = await uploadAllPendingFiles(targetChatId)
        uploadedDocuments = successDocs

        // If ALL uploads failed, show error and abort
        if (successDocs.length === 0 && failedNames.length > 0) {
          setIsSending(false)
          setMessage(prev => [...prev, {
            id: uid(),
            role: 'assistant',
            content: `❌ Could not upload document${failedNames.length > 1 ? 's' : ''}: ${failedNames.join(', ')}. Please try again.`,
            ts: Date.now(),
            error: true,
          }])
          return
        }

        // If some failed, warn the user but continue with successful ones
        if (failedNames.length > 0) {
          setMessage(prev => [...prev, {
            id: uid(),
            role: 'assistant',
            content: `⚠️ Failed to upload: ${failedNames.join(', ')}. Continuing with ${successDocs.length} uploaded document(s).`,
            ts: Date.now(),
            error: true,
          }])
        }
      }

      // 4. Build the user message WITH document data from upload response
      const attachmentInfo = uploadedDocuments.map(doc => ({
        fileName: doc.fileName,
        documentId: doc._id,
      }))

      const documentIds = uploadedDocuments.map(doc => doc._id)

      const userMsg = {
        id: uid(),
        role: 'user',
        content: text,
        ts: Date.now(),
        attachments: attachmentInfo.length > 0 ? attachmentInfo : undefined,
      }

      // 5. NOW show user message + typing indicator
      setMessage((prevMessages) => {
        const withoutTyping = prevMessages.filter(m => !m.typing);
        return [
          ...withoutTyping,
          userMsg,
          {
            id: 'typing-indicator',
            role: 'assistant',
            content: '',
            typing: true,
            ts: Date.now()
          }
        ];
      });

      dispatch(addMessage({ chatId: targetChatId, message: userMsg }))
      dispatch(updateCurrentChatTitleIfNeeded(text))

      // Update title on server in background
      const currentChat = chats.find(c => (c.id || c._id) === targetChatId)
      if (currentChat && currentChat.title === 'New chat' && (!currentChat.messages || currentChat.messages.length === 0)) {
        const newTitle = text.slice(0, 30)
        axios.patch(`${API_BASE_URL}/api/chat/${targetChatId}`, { title: newTitle }, { withCredentials: true })
          .catch(err => console.warn('Failed to update chat title:', err?.message))
      }

      if (!socket) {
        setIsSending(false)
        setMessage((prev) => prev.filter(m => !m.typing))
        alert('The AI connection is not ready yet. Please try again in a moment.')
        return
      }

      // 6. Emit message to AI over socket with document IDs from upload response
      socket.emit("ai-message", {
        chat: targetChatId,
        content: text,
        documentIds: documentIds.length > 0 ? documentIds : undefined,
      });

      // 7. Clear pending files after successful send
      setPendingFiles([])
      setUploadedDocs(prev => [...prev, ...uploadedDocuments])

    } catch (error) {
      console.error('Error in handleSend:', error)
      setIsSending(false)
      setMessage((prev) => prev.filter(m => !m.typing))
    }
  }

  async function handleNewChat(options = {}) {
    const isProgrammatic = options === true || options.programmatic || options.skipConfirm
    const hasCurrent = messages && messages.length > 0
    const hasDraft = input.trim().length > 0
    if (!isProgrammatic && (hasCurrent || hasDraft)) {
      const proceed = window.confirm('Start a new chat? The current chat will remain saved.')
      if (!proceed) return null
    }

    let serverId = ''
    let serverTitle = ''
    const titleText = options.draftText ? options.draftText.slice(0, 30) : (hasDraft ? input.trim().slice(0, 30) : 'New chat')

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat`, { title: titleText }, { withCredentials: true })
      serverId = res?.data?.chat?._id || res?.data?._id || ''
      serverTitle = res?.data?.chat?.title || res?.data?.title || ''
    } catch (err) {
      console.error('Create chat on server failed:', err?.response?.data || err?.message || err)
      if (isProgrammatic) {
        return null
      }
    }

    if (!serverId && isProgrammatic) {
      return null
    }

    const id = serverId || uid()
    const title = serverTitle || titleText || 'New chat'
    dispatch(newChatAction({ id, title, createdAt: Date.now() }))

    if (!isProgrammatic) {
      setInput('')
      setMessage([])
      setPendingFiles([])
      setUploadedDocs([])
    }

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(false)
    }
    return id
  }

  const getMessages = async (chatId) => {
    if (!chatId) return
    console.log('Fetching messages for chatId:', chatId)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/messages/${chatId}`, { withCredentials: true })
      console.log('Messages response:', response);

      if (response.data && response.data.messages) {
        setMessage(response.data.messages.reverse().map(msg => ({
          id: msg._id,
          role: msg.role === 'user' ? "user" : "assistant",
          content: msg.content,
          ts: new Date(msg.createdAt).getTime(),
          attachments: msg.attachments && msg.attachments.length > 0
            ? msg.attachments.map(att => ({
              fileName: att.fileName || att.document?.fileName || 'Document',
              documentId: att.document?._id || att.document,
            }))
            : undefined,
        })))
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  function handleSelectChat(id) {
    dispatch(selectChat(id))

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(false)
    }

    // Clear files when switching chats
    setPendingFiles([])
    setUploadedDocs([])

    getMessages(id)
  }

  async function handleDeleteChat(chatId) {
    const chatToDelete = chats.find(c => (c._id || c.id) === chatId)

    try {
      await axios.delete(`${API_BASE_URL}/api/chat/messages/${chatId}`, { withCredentials: true })
      console.log('Chat deleted successfully from server')

      dispatch(deleteChatAction(chatId))

      const remainingChats = chats.filter(c => (c._id || c.id) !== chatId)
      if (activeChatId === chatId) {
        if (remainingChats.length > 0) {
          const nextId = remainingChats[0]._id || remainingChats[0].id
          dispatch(selectChat(nextId))
          getMessages(nextId)
        } else {
          dispatch(selectChat(''))
          setMessage([])
        }
        setPendingFiles([])
        setUploadedDocs([])
      }
    } catch (err) {
      console.error('Failed to delete chat from server:', err?.response?.data || err?.message)
      alert('Failed to delete chat from server, but removing from local storage.')
      dispatch(deleteChatAction(chatId))
      const remainingChats = chats.filter(c => (c._id || c.id) !== chatId)
      if (activeChatId === chatId) {
        if (remainingChats.length > 0) {
          const nextId = remainingChats[0]._id || remainingChats[0].id
          dispatch(selectChat(nextId))
          getMessages(nextId)
        } else {
          dispatch(selectChat(''))
          setMessage([])
        }
        setPendingFiles([])
        setUploadedDocs([])
      }
    }
  }

  async function handleRenameChat(chatId, newTitle) {
    try {
      await axios.patch(`${API_BASE_URL}/api/chat/${chatId}`, { title: newTitle }, { withCredentials: true })
      const updatedChats = chats.map(chat => {
        const id = chat._id || chat.id
        if (id === chatId) {
          return { ...chat, title: newTitle }
        }
        return chat
      })
      dispatch(setChats(updatedChats))
    } catch (err) {
      console.error('Failed to rename chat:', err?.response?.data || err?.message)
      alert('Failed to rename chat on server.')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(min-width: 961px)')
    const onChange = (e) => {
      if (e.matches) {
        setSidebarOpen(true)
      }
    }
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else if (mql.addListener) mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else if (mql.removeListener) mql.removeListener(onChange)
    }
  }, [])

  const handleLogout = () => {
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    try {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true })
      localStorage.removeItem('chats_v1')
      localStorage.removeItem('activeChatId_v1')
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err?.response?.data || err?.message)
      localStorage.clear()
      navigate('/login')
    }
  }

  const handleCancelLogout = () => {
    setShowLogoutModal(false)
  }

  const containerClass = `chat-layout ${sidebarOpen ? 'sidebar-open' : 'no-sidebar'}`

  if (isCheckingAuth) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={containerClass}>
      <ChatSidebar
        id="chat-sidebar"
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        open={sidebarOpen}
        onClose={handleCloseSidebar}
      />

      <main className="chat-main">
        <ChatHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
          onLogout={handleLogout}
        />

        <Messages message={message} />

        <InputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isSending}
          files={pendingFiles}
          onFilesChange={handleFilesChange}
          onRemoveFile={handleRemoveFile}
          isUploading={isUploading}
        />
      </main>

      {/* Backdrop for mobile when sidebar open */}
      {sidebarOpen && <div className="backdrop" onClick={handleCloseSidebar} />}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-header">
              <h3>Logout</h3>
            </div>
            <div className="logout-modal-body">
              <p>Are you sure you want to logout?</p>
              <p className="logout-warning-text">You will be redirected to the login page.</p>
            </div>
            <div className="logout-modal-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelLogout}
              >
                Cancel
              </button>
              <button
                className="btn-logout"
                onClick={handleConfirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
