import React, { useEffect, useMemo, useRef, useState } from 'react'
import { io } from "socket.io-client";
import '../components/chat/chat-layout.css'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatHeader from '../components/chat/ChatHeader'
import Messages from '../components/chat/Messages'
import InputBar from '../components/chat/InputBar'
import { useDispatch, useSelector } from 'react-redux'
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

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

const STORAGE_KEYS = {
  chats: 'chats_v1',
  active: 'activeChatId_v1',
}

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
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, { withCredentials: true })
      // console.log('Authentication check response:', response.data)
      
      if (response.data.success) {
        setIsAuthenticated(true)
        // console.log('User authenticated successfully')
      } else {
        setIsAuthenticated(false)
        navigate('/login')
      }
    } catch (error) {
      console.log('Authentication check failed:', error?.response?.status, error?.response?.data)
      setIsAuthenticated(false)
      navigate('/login')
    } finally {
      setIsCheckingAuth(false)
    }
  }

  useEffect(() => {
    // Check authentication first
    checkAuthentication()
  }, [])

  useEffect(() => {
    // Only load chats and setup socket if authenticated
    if (!isAuthenticated) return

    // console.log('Loading chats for authenticated user...')
    axios.get(`${API_BASE_URL}/api/chat`, { withCredentials: true })
      .then((res) => {
        console.log('Chats loaded successfully:', res.data);
        dispatch(setChats(res.data.chats.reverse()))
      }).catch((err) => {
        console.log('GET /api/chat failed:', err?.response?.status, err?.response?.data || err?.message)
      })

    const newSocket = io(API_BASE_URL, {
      withCredentials: true
    });

    // Handle typing indicator
    newSocket.on("ai-typing", (payload) => {
      // console.log("AI typing indicator received:", payload);
      if (payload.typing) {
        setMessage((prevMessages) => {
          // Remove any existing typing indicator first
          const withoutTyping = prevMessages.filter(m => !m.typing);
          // Add new typing indicator
          return [...withoutTyping, {
            id: 'typing-indicator',
            role: 'assistant',
            content: '',
            typing: true,
            ts: Date.now()
          }];
        });
      } else {
        // Remove typing indicator when AI stops typing
        setMessage((prevMessages) => prevMessages.filter(m => !m.typing));
      }
    });

    newSocket.on("ai-response", (messagePayload) => {
      // console.log("AI response received:", messagePayload);
      setMessage((prevMessages) => {
        // Remove typing indicator and add actual response
        const withoutTyping = prevMessages.filter(m => !m.typing);
        return [...withoutTyping, {
          id: uid(),
          role: 'assistant',
          content: messagePayload.content,
          ts: Date.now()
        }];
      });
      dispatch(addMessage(activeChatId, messagePayload.content))
    })

    setSocket(newSocket);

    // Cleanup socket on unmount or when dependencies change
    return () => {
      if (newSocket) {
        newSocket.disconnect()
      }
    }

  }, [isAuthenticated])


  async function handleSend() {
    const text = input.trim()
    if (!text || isSending) return


    let targetChatId = activeChatId
    if (!targetChatId) {
      targetChatId = await handleNewChat({ programmatic: true })
      if (!targetChatId) return
    }

    setIsSending(true)

    const userMsg = { id: uid(), role: 'user', content: text, ts: Date.now() }

    dispatch(addMessage({ chatId: targetChatId, message: userMsg }))
    dispatch(updateCurrentChatTitleIfNeeded(text))


    const currentChat = chats.find(c => (c.id || c._id) === targetChatId)
    if (currentChat && currentChat.title === 'New chat' && (!currentChat.messages || currentChat.messages.length === 0)) {
      const newTitle = text.trim().slice(0, 30)
      try {
        await axios.patch(`/api/chat/${targetChatId}`, { title: newTitle }, { withCredentials: true })
      } catch (err) {
        console.warn('Failed to update chat title on server:', err?.response?.data || err?.message)
      }
    }

    // Clear any existing typing indicators and add user message
    setMessage((prevMessages) => {
      const withoutTyping = prevMessages.filter(m => !m.typing);
      return [...withoutTyping, {
        id: uid(),
        role: 'user',
        content: text,
        ts: Date.now()
      }];
    });
    
    setIsSending(false)
    setInput('')


    socket.emit("ai-message", {
      chat: targetChatId,
      content: text
    });

  }

  async function handleNewChat(options = {}) {
    const skipConfirm = options === true || options.programmatic || options.skipConfirm
    const hasCurrent = messages && messages.length > 0
    const hasDraft = input.trim().length > 0
    if (!skipConfirm && (hasCurrent || hasDraft)) {
      const proceed = window.confirm('Start a new chat? The current chat will remain saved.')
      if (!proceed) return
    }

    let serverId = ''
    let serverTitle = ''
    const titles = hasDraft ? input.trim().slice(0, 30) : 'New chat'

    try {
      const res = await axios.post(`${API_BASE_URL}/api/chat`, { title: titles }, { withCredentials: true })
 
      serverId = res?.data?.chat?._id || res?.data?._id || ''
      serverTitle = res?.data?.chat?.title || res?.data?.title || ''
    } catch (err) {
      console.warn('Create chat on server failed, using local id:', err?.response?.data || err?.message || err)
    }
    const id = serverId || uid()
    const title = serverTitle || 'New chat'
    dispatch(newChatAction({ id, title, createdAt: Date.now() }))
    setInput('')
    getMessages(id)

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      setSidebarOpen(false)
    }
    return id
  }

  const getMessages = async (chatId) => {
    console.log('Fetching messages for chatId:', chatId)
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/messages/${chatId}`, { withCredentials: true })
      console.log('Messages response:', response);

      if (response.data && response.data.messages) {
        setMessage(response.data.messages.reverse().map(msg => ({
          id: msg._id,
          role: msg.role == 'user' ? "user" : "assistant",
          content: msg.content,
          ts: new Date(msg.createdAt).getTime()
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
    getMessages(id)
  }

  async function handleDeleteChat(chatId) {
    const chatToDelete = chats.find(c => (c._id || c.id) === chatId)
    const chatTitle = chatToDelete?.title || 'this chat'
    



    try {
      await axios.delete(`${API_BASE_URL}/api/chat/messages/${chatId}`, { withCredentials: true })
      console.log('Chat deleted successfully from server')

      dispatch(deleteChatAction(chatId))

      if (activeChatId === chatId) {
        setMessage([])
      }
    } catch (err) {
      console.error('Failed to delete chat from server:', err?.response?.data || err?.message)
      alert('Failed to delete chat from server, but removing from local storage.')
      dispatch(deleteChatAction(chatId))
      if (activeChatId === chatId) {
        setMessage([])
      }
    }
  }

  async function handleRenameChat(chatId, newTitle) {
    try {
      // Update on server
      await axios.patch(`${API_BASE_URL}/api/chat/${chatId}`, { title: newTitle }, { withCredentials: true })
      
      // Update local state
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
      // Clear authentication token by making logout request to server
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true })
      
      // Clear local storage
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

  const containerClass = `chat-layout ${sidebarOpen ? '' : 'no-sidebar'}`

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Checking authentication...</p>
      </div>
    )
  }

  // If not authenticated, the useEffect will redirect to login
  // This return is just a fallback
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

        {
          activeChatId?.length >= 0 &&
          <InputBar
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isSending}
          />}
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