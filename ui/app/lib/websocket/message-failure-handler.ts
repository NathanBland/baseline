/**
 * Message Failure Handler - Manages instant failure of pending messages
 * when connection is lost or errors occur
 */
import type { PendingMessage, OutgoingType, OutgoingPayloadMap } from './types'
export type { PendingMessage } from './types'

export type FailureListener = (failedMessage: PendingMessage) => void

export class MessageFailureHandler {
  private failureListeners: FailureListener[] = []
  
  constructor() {}
  
  /**
   * Register a failure listener
   */
  onFailure(listener: FailureListener): () => void {
    this.failureListeners.push(listener)
    
    // Return unsubscribe function
    return () => {
      const index = this.failureListeners.indexOf(listener)
      if (index > -1) {
        this.failureListeners.splice(index, 1)
      }
    }
  }
  
  /**
   * Notify all failure listeners about a failed message
   */
  notifyFailure(failedMessage: PendingMessage): void {
    console.warn('💥 Notifying failure listeners:', failedMessage.id, failedMessage.type)
    this.failureListeners.forEach(listener => {
      try {
        listener(failedMessage)
      } catch (error) {
        console.error('Error in failure listener:', error)
      }
    })
  }
  
  /**
   * INSTANT FAIL: Immediately fail all pending messages due to connection loss
   * This is the key enhancement the user requested
   */
  failAllPendingMessages(
    pendingMessages: Map<string, PendingMessage>, 
    reason: string = 'Connection lost'
  ): void {
    console.warn(`🔥 INSTANT FAIL: Failing ${pendingMessages.size} pending messages due to: ${reason}`)
    
    // Convert all pending messages to failed messages
    const failedMessages = Array.from(pendingMessages.values())
    
    // Clear all pending messages and their timeouts
    failedMessages.forEach(msg => {
      if (msg.timeoutId) {
        clearTimeout(msg.timeoutId)
      }
      
      // Create failed version with updated reason
      const failedMessage: PendingMessage = {
        ...msg,
        id: `instant-fail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now()
      }
      
      // Notify failure immediately
      this.notifyFailure(failedMessage)
    })
    
    // Clear the pending messages map
    pendingMessages.clear()
    
    console.warn(`🔥 INSTANT FAIL COMPLETE: All ${failedMessages.length} messages failed instantly`)
  }
  
  /**
   * Create a failed message from disconnected send attempt
   */
  createFailedMessage<T extends OutgoingType>(type: T, data: OutgoingPayloadMap[T]): PendingMessage<T> {
    return {
      id: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    }
  }
  
  /**
   * Queue a failed message with timeout backup notification
   */
  queueFailedMessage<T extends OutgoingType>(
    type: T, 
    data: OutgoingPayloadMap[T], 
    pendingMessages: Map<string, PendingMessage>
  ): void {
    const failedMessage = this.createFailedMessage(type, data)
    
    console.warn('📥 Queueing failed message for retry:', failedMessage.id, type)
    
    // Store in pendingMessages for auto-retry on reconnection
    pendingMessages.set(failedMessage.id, failedMessage)
    
    // Set a short timeout to ensure UI gets updated even if immediate notification fails
    failedMessage.timeoutId = setTimeout(() => {
      console.warn('🔥 Ensuring failed message notification:', failedMessage.id)
      this.notifyFailure(failedMessage)
    }, 100) // Very short delay to ensure UI is ready
    
    // Also notify immediately
    this.notifyFailure(failedMessage)
  }
}
