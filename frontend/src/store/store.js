import { configureStore } from '@reduxjs/toolkit'
import chatReducer from './chatSlice'

const store = configureStore({
  reducer: {
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
})

// Persist to localStorage
const STORAGE_KEYS = {
  chats: 'chats_v1',
  active: 'activeChatId_v1',
}

store.subscribe(() => {
  const state = store.getState()
  try {
    localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(state.chat.chats))
    if (state.chat.currentChatId) {
      localStorage.setItem(STORAGE_KEYS.active, state.chat.currentChatId)
    }
  } catch (e) {
    // ignore
  }
})

export default store
