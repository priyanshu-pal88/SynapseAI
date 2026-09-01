  import { createSlice, createSelector } from '@reduxjs/toolkit'

const STORAGE_KEYS = {
  chats: 'chats_v1',
  active: 'activeChatId_v1',
}

const loadInitialState = () => {
  try {
    const rawChats = localStorage.getItem(STORAGE_KEYS.chats)
    const rawActive = localStorage.getItem(STORAGE_KEYS.active)
    const chats = rawChats ? JSON.parse(rawChats) : []
    const currentChatId = rawActive || (chats[0]?.id || '')
    return { chats, currentChatId }
  } catch (e) {
    return { chats: [], currentChatId: '' }
  }
}

const initialState = loadInitialState()

const normalizeChat = (chat) => {
  if (!chat) return chat
  const id = chat.id || chat._id || ''
  return { ...chat, id, _id: chat._id || id }
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setCurrentChatId(state, action) {
      state.currentChatId = action.payload
    },
    setChats(state, action) {
      state.chats = (action.payload || []).map(normalizeChat)
      if (!state.currentChatId && state.chats.length) {
        state.currentChatId = state.chats[0]?.id || state.chats[0]?._id || ''
      }
    },
    newChat(state, action) {
      const { id, _id, title , createdAt = Date.now() } = action.payload
      const normalizedChat = normalizeChat({ id: id || _id, _id: _id || id, title, createdAt, messages: [] })
      state.chats = [normalizedChat, ...state.chats]
      state.currentChatId = normalizedChat.id
    },
    selectChat(state, action) {
      state.currentChatId = action.payload
    },
    deleteChat(state, action) {
      const chatId = action.payload
      state.chats = state.chats.filter((c) => (c._id || c.id) !== chatId)
      if (state.currentChatId === chatId) {
        state.currentChatId = state.chats[0]?._id || state.chats[0]?.id || ''
      }
    },
    addMessage(state, action) {
      const { chatId, message } = action.payload
      const chat = state.chats.find((c) => (c.id || c._id) === chatId)
      if (chat) {
        chat.messages = [...(chat.messages || []), message]
      }
    },
    replaceMessage(state, action) {
      const { chatId, messageId, patch } = action.payload
      const chat = state.chats.find((c) => (c.id || c._id) === chatId)
      if (chat) {
        chat.messages = (chat.messages || []).map((m) => (m.id === messageId ? { ...m, ...patch } : m))
      }
    },
    updateCurrentChatTitleIfNeeded(state, action) {
      const text = action.payload || ''
      const chat = state.chats.find((c) => (c.id || c._id) === state.currentChatId)
      if (chat && chat.title === 'New chat') {
        const title = text.trim().slice(0, 30) || 'New chat'
        chat.title = title
      }
    },
  },
})

// Selectors
export const selectChats = (state) => state.chat.chats
export const selectCurrentChatId = (state) => state.chat.currentChatId

// Memoized selectors to prevent unnecessary re-renders
export const selectCurrentChat = createSelector(
  [selectChats, selectCurrentChatId],
  (chats, currentChatId) => chats.find((c) => c.id === currentChatId) || null
)

export const selectCurrentMessages = createSelector(
  [selectCurrentChat],
  (currentChat) => currentChat?.messages || []
)

export const {
  setCurrentChatId,
  setChats,
  newChat,
  selectChat,
  deleteChat,
  addMessage,
  replaceMessage,
  updateCurrentChatTitleIfNeeded,
} = chatSlice.actions

export default chatSlice.reducer
