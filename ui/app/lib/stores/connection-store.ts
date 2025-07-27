import { create } from 'zustand'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error'

export interface ConnectionState {
  // Connection status
  status: ConnectionStatus
  isConnected: boolean
  lastConnectedAt: Date | null
  lastDisconnectedAt: Date | null
  
  // Reconnection state
  reconnectAttempts: number
  maxReconnectAttempts: number
  nextReconnectAt: Date | null
  
  // Error state
  lastError: string | null
  consecutiveErrors: number
  
  // Actions
  setConnected: () => void
  setConnecting: () => void
  setDisconnected: (error?: string) => void
  setReconnecting: (attemptNumber: number, nextAttempt: Date) => void
  setError: (error: string) => void
  clearError: () => void
  reset: () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  // Initial state
  status: 'disconnected',
  isConnected: false,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  
  reconnectAttempts: 0,
  maxReconnectAttempts: Infinity,
  nextReconnectAt: null,
  
  lastError: null,
  consecutiveErrors: 0,
  
  // Actions
  setConnected: () => {
    console.log('🟢 Connection state: CONNECTED')
    set({
      status: 'connected',
      isConnected: true,
      lastConnectedAt: new Date(),
      reconnectAttempts: 0,
      nextReconnectAt: null,
      lastError: null,
      consecutiveErrors: 0
    })
  },
  
  setConnecting: () => {
    const currentState = get()
    // Prevent flashing: if we're already reconnecting, stay in reconnecting state
    if (currentState.status === 'reconnecting') {
      console.log('🟠 Staying in RECONNECTING state (preventing flash)')
      return
    }
    
    console.log('🟡 Connection state: CONNECTING')
    set({
      status: 'connecting',
      isConnected: false,
      lastError: null
    })
  },
  
  setDisconnected: (error?: string) => {
    console.log('🔴 Connection state: DISCONNECTED', error ? `(${error})` : '')
    set({
      status: 'disconnected',
      isConnected: false,
      lastDisconnectedAt: new Date(),
      lastError: error || null,
      consecutiveErrors: error ? get().consecutiveErrors + 1 : 0,
      nextReconnectAt: null
    })
  },
  
  setReconnecting: (attemptNumber: number, nextAttempt: Date) => {
    console.log(`🟠 Connection state: RECONNECTING (attempt ${attemptNumber}, next: ${nextAttempt.toLocaleTimeString()})`)
    set({
      status: 'reconnecting',
      isConnected: false,
      reconnectAttempts: attemptNumber,
      nextReconnectAt: nextAttempt
    })
  },
  
  setError: (error: string) => {
    console.log('❌ Connection state: ERROR', error)
    set({
      status: 'error',
      isConnected: false,
      lastError: error,
      consecutiveErrors: get().consecutiveErrors + 1
    })
  },
  
  clearError: () => {
    set({
      lastError: null,
      consecutiveErrors: 0
    })
  },
  
  reset: () => {
    console.log('🔄 Connection state: RESET')
    set({
      status: 'disconnected',
      isConnected: false,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      reconnectAttempts: 0,
      nextReconnectAt: null,
      lastError: null,
      consecutiveErrors: 0
    })
  }
}))
