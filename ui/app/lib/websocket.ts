// WebSocket service for real-time features
import { apiService } from './api'
import { offlineManager } from './offline'
import { useConnectionStore } from './stores/connection-store'
import { ReconnectionManager } from './websocket/reconnection-manager'
import { MessageFailureHandler, type PendingMessage } from './websocket/message-failure-handler'
import type { Message, Conversation } from './api'

export interface WebSocketMessage {
  type: 'message_created' | 'message_updated' | 'message_deleted' | 
        'conversation_created' | 'conversation_created_confirmed' | 'conversation_updated' | 
        'user_joined' | 'user_left' | 'typing_start' | 'typing_stop' | 'ping' | 'pong' |
        'join_conversation' | 'leave_conversation' | 'message' | 'connected' |
        'joined_conversation'
  data: any
  timestamp: number
}

export interface TypingIndicator {
  userId: string
  userName: string
  conversationId: string
  isTyping?: boolean
}



export interface ConnectionHealth {
  isConnected: boolean
  lastPing: number
  lastPong: number
  reconnectAttempts: number
  failedMessages: PendingMessage[]
}

class WebSocketService {
  private ws: WebSocket | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isConnecting = false
  
  // Message acknowledgment and health monitoring
  private pendingMessages = new Map<string, PendingMessage>()
  private messageTimeout = 10000 // 10 seconds timeout for message acknowledgment
  private lastPing = 0
  private lastPong = 0
  
  // Dedicated connection management modules
  private reconnectionManager: ReconnectionManager
  private messageFailureHandler: MessageFailureHandler
  
  // Event listeners
  private messageListeners: Array<(message: Message) => void> = []
  private conversationListeners: Array<(conversation: Conversation) => void> = []
  private typingListeners: Array<(typing: TypingIndicator) => void> = []
  private connectionListeners: Array<(connected: boolean) => void> = []

  constructor() {
    // Initialize dedicated connection management modules
    this.reconnectionManager = new ReconnectionManager()
    this.messageFailureHandler = new MessageFailureHandler()
    
    // Auto-connect when online and authenticated
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
    }
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected, skipping duplicate connect()')
        resolve()
        return
      }

      if (this.isConnecting) {
        console.log('Connection already in progress, waiting for existing connection...')
        // Wait for existing connection instead of rejecting
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve()
          } else if (!this.isConnecting) {
            reject(new Error('Connection failed'))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        setTimeout(checkConnection, 100)
        return
      }

      if (!apiService.isAuthenticated()) {
        reject(new Error('Not authenticated'))
        return
      }

      this.isConnecting = true
      useConnectionStore.getState().setConnecting()
      
      try {
        this.ws = apiService.createWebSocketConnection()
        
        if (!this.ws) {
          throw new Error('Failed to create WebSocket connection')
        }

        this.ws.onopen = (event) => {
          console.log('WebSocket connected:', event)
          this.isConnecting = false
          
          // Reset reconnection manager on successful connection
          this.reconnectionManager.resetReconnection()
          
          // Update connection store to connected state
          useConnectionStore.getState().setConnected()
          
          this.startHeartbeat()
          this.notifyConnectionListeners(true)
          this.retryQueuedMessages()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.stopHeartbeat()
          this.notifyConnectionListeners(false)
          
          // Use MessageFailureHandler to instantly fail all pending messages
          this.messageFailureHandler.failAllPendingMessages(this.pendingMessages, 'Connection lost')
          
          // Update connection store to disconnected state
          useConnectionStore.getState().setDisconnected(
            event.code !== 1000 ? `Connection closed: ${event.reason || 'Unknown error'}` : undefined
          )
          
          // Use ReconnectionManager for robust reconnection if not a clean close
          if (event.code !== 1000) {
            this.reconnectionManager.scheduleReconnect(() => this.connect())
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnecting = false
          
          // Use MessageFailureHandler to instantly fail all pending messages on error
          this.messageFailureHandler.failAllPendingMessages(this.pendingMessages, 'WebSocket error')
          
          // Update connection store to error state
          useConnectionStore.getState().setError('WebSocket connection error')
          
          reject(error)
        }

      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.stopHeartbeat()
    this.notifyConnectionListeners(false)
    
    // Update connection store to disconnected state (clean disconnect)
    useConnectionStore.getState().setDisconnected()
  }

  isConnected(): boolean {
    // Use connection store as single source of truth for connection status
    // Only allow sending when explicitly connected, not during connecting/reconnecting states
    const connectionState = useConnectionStore.getState()
    return connectionState.status === 'connected' && connectionState.isConnected
  }

  // Message handling
  private handleMessage(data: string): void {
    try {
      console.log('Raw WebSocket data received:', data)
      const parsedMessage = JSON.parse(data)
      console.log('Parsed WebSocket message:', parsedMessage)
      
      // Handle authentication errors (no type field)
      if (parsedMessage.error) {
        console.error('WebSocket authentication error:', parsedMessage.error)
        this.notifyConnectionListeners(false)
        // Don't attempt to reconnect on auth errors
        this.reconnectionManager.resetReconnection()
        return
      }
      
      console.log('Message type:', parsedMessage.type, 'Type of type:', typeof parsedMessage.type)
      const message: WebSocketMessage = parsedMessage
      
      switch (message.type) {
        case 'message_created':
          this.handleMessageCreated(message.data)
          // Acknowledge any pending message_created messages (fixes retry issue)
          this.acknowledgePendingMessages('message_created')
          break
        case 'message_updated':
          this.handleMessageUpdated(message.data)
          break
        case 'message_deleted':
          this.handleMessageDeleted(message.data)
          break
        case 'conversation_created':
          console.log('🎉 Received conversation_created event:', message.data)
          this.handleConversationCreated(message.data.conversation || message.data)
          break
        case 'conversation_created_confirmed':
          // Handle when someone else creates a conversation that includes this user
          console.log('🎉 New conversation confirmed:', message.data)
          this.handleConversationCreated(message.data.conversation)
          break
        case 'conversation_updated':
          this.handleConversationUpdated(message.data)
          break
        case 'user_joined':
          console.log('User joined conversation:', message.data)
          // Could trigger UI update to show new participant
          break
        case 'user_left':
          console.log('User left conversation:', message.data)
          // Could trigger UI update to remove participant
          break
        case 'typing_start':
        case 'typing_stop':
          this.handleTypingIndicator(message.data, message.type === 'typing_start')
          break
        case 'pong':
          // Heartbeat response
          break
        case 'connected':
          console.log('WebSocket authenticated successfully:', message)
          break
        case 'joined_conversation':
          console.log('Joined conversation:', message.data?.conversationId)
          // Acknowledge any pending join_conversation messages
          this.acknowledgePendingMessages('join_conversation')
          break
        default:
          console.log('Unknown WebSocket message type:', message.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  private handleMessageCreated(message: Message): void {
    // Store message offline for resilience
    offlineManager.addOfflineMessage(message)
    
    // Notify listeners
    this.messageListeners.forEach(listener => listener(message))
  }

  private handleMessageUpdated(message: Message): void {
    offlineManager.addOfflineMessage(message)
    this.messageListeners.forEach(listener => listener(message))
  }

  private handleMessageDeleted(data: { id: string; conversationId: string }): void {
    // Remove from offline storage
    const messages = offlineManager.getOfflineMessages()
    const filteredMessages = messages.filter(m => m.id !== data.id)
    offlineManager.setOfflineMessages(filteredMessages)
    
    // Notify listeners with a deleted message indicator
    const deletedMessage: Message = {
      id: data.id,
      content: '[Message deleted]',
      authorId: '',
      conversationId: data.conversationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: '', email: '', username: '', createdAt: '', updatedAt: '' },
      type: 'text'
    }
    this.messageListeners.forEach(listener => listener(deletedMessage))
  }

  private handleConversationCreated(conversation: Conversation): void {
    console.log('🏗️ Handling conversation creation:', {
      id: conversation?.id,
      title: conversation?.title,
      type: conversation?.type,
      listenersCount: this.conversationListeners.length
    })
    
    if (!conversation) {
      console.error('❌ No conversation data provided to handleConversationCreated')
      return
    }
    
    offlineManager.addOfflineConversation(conversation)
    console.log('✅ Added conversation to offline storage')
    
    this.conversationListeners.forEach((listener, index) => {
      console.log(`📢 Notifying conversation listener ${index + 1}/${this.conversationListeners.length}`)
      listener(conversation)
    })
    
    console.log('✅ Conversation creation handling complete')
  }

  private handleConversationUpdated(conversation: Conversation): void {
    offlineManager.addOfflineConversation(conversation)
    this.conversationListeners.forEach(listener => listener(conversation))
  }

  private handleTypingIndicator(data: TypingIndicator, isTyping: boolean): void {
    this.typingListeners.forEach(listener => {
      // Always pass the full data with isTyping flag
      listener({ ...data, isTyping })
    })
  }

  // Sending messages with acknowledgment tracking
  sendMessage(type: WebSocketMessage['type'], data: any): string | void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, message not sent:', type, data)
      // For critical messages, immediately queue as failed to trigger UI update
      if (type === 'message_created') {
        this.queueFailedMessage(type, data)
        return // Return early since message failed immediately
      }
      return
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const message: WebSocketMessage & { id: string } = {
      id: messageId,
      type,
      data,
      timestamp: Date.now()
    }

    // Track pending message for acknowledgment (only for critical messages)
    if (type === 'message_created' || type === 'join_conversation') {
      const pendingMessage: PendingMessage = {
        id: messageId,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3
      }
      
      // Set timeout for acknowledgment
      pendingMessage.timeoutId = setTimeout(() => {
        this.handleMessageTimeout(messageId)
      }, this.messageTimeout)
      
      this.pendingMessages.set(messageId, pendingMessage)
    }

    try {
      this.ws!.send(JSON.stringify(message))
      console.log('📤 Sent message:', messageId, type)
      return messageId
    } catch (error) {
      console.error('Failed to send message:', error)
      if (this.pendingMessages.has(messageId)) {
        this.handleMessageTimeout(messageId)
      }
    }
  }

  // Message timeout and failure handling
  private handleMessageTimeout(messageId: string): void {
    const pendingMessage = this.pendingMessages.get(messageId)
    if (!pendingMessage) return

    console.warn('⏰ Message timeout:', messageId, pendingMessage.type, `(${pendingMessage.retryCount}/${pendingMessage.maxRetries})`)
    
    // Clear timeout
    if (pendingMessage.timeoutId) {
      clearTimeout(pendingMessage.timeoutId)
    }
    
    // Check if we should retry or declare as failed
    if (pendingMessage.retryCount < pendingMessage.maxRetries && this.isConnected()) {
      // Attempt immediate retry if still connected
      console.log(`🔄 Immediate retry for timed-out message: ${messageId}`)
      pendingMessage.retryCount++
      pendingMessage.timestamp = Date.now()
      
      // Set new timeout for retry
      pendingMessage.timeoutId = setTimeout(() => {
        this.handleMessageTimeout(messageId)
      }, this.messageTimeout)
      
      // Send retry
      const retryMessage: WebSocketMessage & { id: string } = {
        id: messageId,
        type: pendingMessage.type,
        data: pendingMessage.data,
        timestamp: pendingMessage.timestamp
      }
      
      try {
        this.ws!.send(JSON.stringify(retryMessage))
        console.log(`📤 Immediate retry attempt ${pendingMessage.retryCount}/${pendingMessage.maxRetries}:`, messageId, pendingMessage.type)
      } catch (error) {
        console.error('Failed immediate retry:', error)
        // If immediate retry fails, escalate to final failure
        this.escalateToFinalFailure(pendingMessage)
      }
    } else {
      // Message has exhausted retries or we're disconnected - declare as failed
      this.escalateToFinalFailure(pendingMessage)
    }
  }
  
  private escalateToFinalFailure(pendingMessage: PendingMessage): void {
    console.error(`❌ Message permanently failed after ${pendingMessage.retryCount} attempts:`, pendingMessage.id, pendingMessage.type)
    
    // Remove from pending messages
    this.pendingMessages.delete(pendingMessage.id)
    
    // Notify failure listeners with final failure
    this.notifyFailureListeners(pendingMessage)
  }
  
  private failAllPendingMessages(reason: string): void {
    if (this.pendingMessages.size === 0) {
      return
    }
    
    console.warn(`💥 Failing ${this.pendingMessages.size} pending messages due to: ${reason}`)
    
    // Get all pending messages
    const allPendingMessages = Array.from(this.pendingMessages.values())
    
    // Clear timeouts but keep messages for retry on reconnection
    allPendingMessages.forEach(msg => {
      if (msg.timeoutId) {
        clearTimeout(msg.timeoutId)
        msg.timeoutId = undefined // Clear timeout reference
      }
    })
    
    // DON'T clear the pending messages map - keep them for auto-retry on reconnection
    // this.pendingMessages.clear() // ❌ This was the bug!
    
    // Notify failure listeners for each failed message
    allPendingMessages.forEach(msg => {
      console.warn(`💥 Instant fail: ${msg.id} (${msg.type}) - ${reason}`)
      this.notifyFailureListeners(msg)
    })
  }
  
  private queueFailedMessage(type: WebSocketMessage['type'], data: any): void {
    const failedMessage: PendingMessage = {
      id: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    }
    
    console.warn('📥 Queueing failed message for retry:', failedMessage.id, type)
    
    // Store in pendingMessages for auto-retry on reconnection
    this.pendingMessages.set(failedMessage.id, failedMessage)
    
    // Set a short timeout to ensure UI gets updated even if immediate notification fails
    failedMessage.timeoutId = setTimeout(() => {
      console.warn('🔥 Ensuring failed message notification:', failedMessage.id)
      this.notifyFailureListeners(failedMessage)
    }, 100) // Very short delay to ensure UI is ready
    
    // Also notify immediately
    this.notifyFailureListeners(failedMessage)
  }
  
  private acknowledgeMessage(messageId: string): void {
    const pendingMessage = this.pendingMessages.get(messageId)
    if (!pendingMessage) return
    
    console.log('✅ Message acknowledged:', messageId)
    
    // Clear timeout
    if (pendingMessage.timeoutId) {
      clearTimeout(pendingMessage.timeoutId)
    }
    
    // Remove from pending messages
    this.pendingMessages.delete(messageId)
  }
  
  private acknowledgePendingMessages(messageType: WebSocketMessage['type']): void {
    console.log(`✅ Acknowledging all pending messages of type: ${messageType}`)
    
    // Find all pending messages of the specified type
    const messagesToAcknowledge = Array.from(this.pendingMessages.entries())
      .filter(([, msg]) => msg.type === messageType)
    
    // Acknowledge each matching message
    messagesToAcknowledge.forEach(([messageId]) => {
      this.acknowledgeMessage(messageId)
    })
    
    if (messagesToAcknowledge.length > 0) {
      console.log(`✅ Acknowledged ${messagesToAcknowledge.length} pending ${messageType} messages`)
    }
  }
  
  private retryQueuedMessages(): void {
    console.log('🔄 Auto-retrying queued messages on reconnection')
    
    // Get all pending messages that haven't exceeded retry limit
    const messagesToRetry = Array.from(this.pendingMessages.values())
      .filter(msg => msg.retryCount < msg.maxRetries)
    
    if (messagesToRetry.length === 0) {
      console.log('📝 No messages to retry')
      return
    }
    
    console.log(`🔄 Retrying ${messagesToRetry.length} queued messages`)
    
    // Retry each message (keeping same ID for simplicity)
    messagesToRetry.forEach(msg => {
      // Clear existing timeout
      if (msg.timeoutId) {
        clearTimeout(msg.timeoutId)
      }
      
      // Increment retry count
      msg.retryCount++
      msg.timestamp = Date.now() // Update timestamp for retry
      
      // Create retry message with same ID
      const retryMessage: WebSocketMessage & { id: string } = {
        id: msg.id, // Keep same ID to avoid confusion
        type: msg.type,
        data: msg.data,
        timestamp: msg.timestamp
      }
      
      // Set new timeout for this retry
      msg.timeoutId = setTimeout(() => {
        this.handleMessageTimeout(msg.id)
      }, this.messageTimeout)
      
      // Send the retry attempt
      try {
        this.ws!.send(JSON.stringify(retryMessage))
        console.log(`📤 Auto-retry attempt ${msg.retryCount}/${msg.maxRetries}:`, msg.id, msg.type)
      } catch (error) {
        console.error('Failed to auto-retry message:', error)
        this.handleMessageTimeout(msg.id)
      }
    })
  }

  // Conversation management
  joinConversation(conversationId: string): void {
    if (!this.isConnected()) {
      console.warn('Cannot join conversation: WebSocket not connected')
      return
    }
    this.sendMessage('join_conversation', { conversationId })
  }

  leaveConversation(conversationId: string): void {
    if (!this.isConnected()) {
      return
    }
    this.sendMessage('leave_conversation', { conversationId })
  }

  // Typing indicators
  sendTypingStart(conversationId: string): void {
    this.sendMessage('typing_start', { conversationId })
  }

  sendTypingStop(conversationId: string): void {
    this.sendMessage('typing_stop', { conversationId })
  }

  // Heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage('ping', {})
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Reconnection handled by ReconnectionManager
  private scheduleReconnect(): void {
    this.reconnectionManager.scheduleReconnect(() => this.connect())
  }

  private handleOnline(): void {
    if (!this.isConnected() && apiService.isAuthenticated()) {
      this.connect().catch(error => {
        console.error('Failed to connect on network online:', error)
      })
    }
  }

  private handleOffline(): void {
    this.disconnect()
  }

  // Event listeners
  onMessage(listener: (message: Message) => void): () => void {
    this.messageListeners.push(listener)
    return () => {
      const index = this.messageListeners.indexOf(listener)
      if (index > -1) {
        this.messageListeners.splice(index, 1)
      }
    }
  }

  onConversation(listener: (conversation: Conversation) => void): () => void {
    this.conversationListeners.push(listener)
    return () => {
      const index = this.conversationListeners.indexOf(listener)
      if (index > -1) {
        this.conversationListeners.splice(index, 1)
      }
    }
  }

  onTyping(listener: (typing: TypingIndicator) => void): () => void {
    this.typingListeners.push(listener)
    return () => {
      const index = this.typingListeners.indexOf(listener)
      if (index > -1) {
        this.typingListeners.splice(index, 1)
      }
    }
  }

  onConnection(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener)
    return () => {
      const index = this.connectionListeners.indexOf(listener)
      if (index > -1) {
        this.connectionListeners.splice(index, 1)
      }
    }
  }

  onFailure(listener: (failedMessage: PendingMessage) => void): () => void {
    return this.messageFailureHandler.onFailure(listener)
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected))
  }
  
  private notifyFailureListeners(failedMessage: PendingMessage): void {
    this.messageFailureHandler.notifyFailure(failedMessage)
  }

  // Utility methods
  getConnectionHealth(): {
    connected: boolean
    reconnectAttempts: number
    lastError?: string
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectionManager.getReconnectionState().attempts
    }
  }
}

export const webSocketService = new WebSocketService()
export default webSocketService
