// Offline mode utilities for Baseline UI
import type { Conversation, Message, User } from './api'

const STORAGE_KEYS = {
  CONVERSATIONS: 'baseline_offline_conversations',
  MESSAGES: 'baseline_offline_messages',
  USER: 'baseline_offline_user',
  PENDING_ACTIONS: 'baseline_pending_actions',
  LAST_SYNC: 'baseline_last_sync'
}

export interface PendingAction {
  id: string
  type: 'send_message' | 'update_message' | 'delete_message' | 'create_conversation'
  data: any
  timestamp: number
  retryCount: number
}

class OfflineManager {
  private isOnline: boolean = true
  private syncInProgress: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
    }
  }

  // Network status
  getNetworkStatus(): boolean {
    return this.isOnline
  }

  private handleOnline() {
    this.isOnline = true
    console.log('Network: Online - Starting sync...')
    this.syncPendingActions()
  }

  private handleOffline() {
    this.isOnline = false
    console.log('Network: Offline - Enabling offline mode')
  }

  // Local storage utilities
  private getStoredData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return null
    }
  }

  private setStoredData<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  }

  // Conversation management
  getOfflineConversations(): Conversation[] {
    return this.getStoredData<Conversation[]>(STORAGE_KEYS.CONVERSATIONS) || []
  }

  setOfflineConversations(conversations: Conversation[]): void {
    this.setStoredData(STORAGE_KEYS.CONVERSATIONS, conversations)
  }

  addOfflineConversation(conversation: Conversation): void {
    const conversations = this.getOfflineConversations()
    const existingIndex = conversations.findIndex(c => c.id === conversation.id)
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation
    } else {
      conversations.push(conversation)
    }
    
    this.setOfflineConversations(conversations)
  }

  // Message management
  getOfflineMessages(conversationId?: string): Message[] {
    const allMessages = this.getStoredData<Message[]>(STORAGE_KEYS.MESSAGES) || []
    
    if (conversationId) {
      return allMessages.filter(m => m.conversationId === conversationId)
    }
    
    return allMessages
  }

  setOfflineMessages(messages: Message[]): void {
    this.setStoredData(STORAGE_KEYS.MESSAGES, messages)
  }

  addOfflineMessage(message: Message): void {
    const messages = this.getOfflineMessages()
    const existingIndex = messages.findIndex(m => m.id === message.id)
    
    if (existingIndex >= 0) {
      messages[existingIndex] = message
    } else {
      messages.push(message)
    }
    
    this.setOfflineMessages(messages)
  }

  // User management
  getOfflineUser(): User | null {
    return this.getStoredData<User>(STORAGE_KEYS.USER)
  }

  setOfflineUser(user: User): void {
    this.setStoredData(STORAGE_KEYS.USER, user)
  }

  // Pending actions for sync
  getPendingActions(): PendingAction[] {
    return this.getStoredData<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || []
  }

  addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'retryCount'>): void {
    const pendingActions = this.getPendingActions()
    const newAction: PendingAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retryCount: 0
    }
    
    pendingActions.push(newAction)
    this.setStoredData(STORAGE_KEYS.PENDING_ACTIONS, pendingActions)
  }

  removePendingAction(actionId: string): void {
    const pendingActions = this.getPendingActions()
    const filteredActions = pendingActions.filter(a => a.id !== actionId)
    this.setStoredData(STORAGE_KEYS.PENDING_ACTIONS, filteredActions)
  }

  // Sync functionality
  async syncPendingActions(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) return
    
    this.syncInProgress = true
    const pendingActions = this.getPendingActions()
    
    console.log(`Syncing ${pendingActions.length} pending actions...`)
    
    for (const action of pendingActions) {
      try {
        await this.processPendingAction(action)
        this.removePendingAction(action.id)
      } catch (error) {
        console.error('Failed to sync action:', action, error)
        
        // Increment retry count and remove if too many retries
        action.retryCount++
        if (action.retryCount >= 3) {
          console.warn('Removing action after 3 failed retries:', action)
          this.removePendingAction(action.id)
        }
      }
    }
    
    this.setLastSyncTime()
    this.syncInProgress = false
  }

  private async processPendingAction(action: PendingAction): Promise<void> {
    // TODO: Implement actual API calls based on action type
    console.log('Processing pending action:', action)
    
    switch (action.type) {
      case 'send_message':
        // await apiService.sendMessage(action.data.conversationId, action.data.content)
        break
      case 'update_message':
        // await apiService.updateMessage(action.data.id, action.data.content)
        break
      case 'delete_message':
        // await apiService.deleteMessage(action.data.id)
        break
      case 'create_conversation':
        // await apiService.createConversation(action.data.title, action.data.participantIds)
        break
      default:
        console.warn('Unknown action type:', action.type)
    }
  }

  // Sync timing
  getLastSyncTime(): number | null {
    return this.getStoredData<number>(STORAGE_KEYS.LAST_SYNC)
  }

  private setLastSyncTime(): void {
    this.setStoredData(STORAGE_KEYS.LAST_SYNC, Date.now())
  }

  // Data management
  clearOfflineData(): void {
    if (typeof window === 'undefined') return
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  getStorageUsage(): { used: number; available: number } {
    if (typeof window === 'undefined') return { used: 0, available: 0 }
    
    let used = 0
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key)
      if (data) {
        used += new Blob([data]).size
      }
    })
    
    // Estimate available space (localStorage typically has ~5-10MB limit)
    const available = 5 * 1024 * 1024 - used // 5MB estimate
    
    return { used, available }
  }

  // Utility methods
  isOfflineCapable(): boolean {
    return typeof window !== 'undefined' && 'localStorage' in window
  }

  getOfflineStatus(): {
    isOnline: boolean
    lastSync: number | null
    pendingActions: number
    storageUsed: number
  } {
    return {
      isOnline: this.isOnline,
      lastSync: this.getLastSyncTime(),
      pendingActions: this.getPendingActions().length,
      storageUsed: this.getStorageUsage().used
    }
  }
}

export const offlineManager = new OfflineManager()
export default offlineManager
