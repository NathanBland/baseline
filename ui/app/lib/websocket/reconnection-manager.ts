/**
 * Reconnection Manager - Handles WebSocket reconnection with smart backoff
 * Enforces max 10s backoff as requested by user
 */

import { useConnectionStore } from '../stores/connection-store'

export interface ReconnectionConfig {
  initialDelay: number // 1000ms = 1s
  maxDelay: number // 10000ms = 10s (user requirement)
  maxAttempts: number // Infinity for real-time chat
  backoffMultiplier: number // 2 for exponential backoff
}

export class ReconnectionManager {
  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isReconnecting = false
  
  private config: ReconnectionConfig = {
    initialDelay: 1000, // Start with 1s
    maxDelay: 10000, // Never exceed 10s (user requirement)
    maxAttempts: Infinity, // Never give up for real-time chat
    backoffMultiplier: 2 // Exponential backoff
  }
  
  constructor(config?: Partial<ReconnectionConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
  }
  
  /**
   * Schedule a reconnection attempt with exponential backoff
   * Max delay capped at 10s as requested by user
   */
  scheduleReconnect(connectFunction: () => Promise<void>): void {
    if (this.isReconnecting) {
      console.log('Reconnection already in progress, skipping duplicate schedule')
      return
    }
    
    this.reconnectAttempts++
    this.isReconnecting = true
    
    // Calculate delay with exponential backoff, capped at maxDelay (10s)
    const baseDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts - 1)
    const delay = Math.min(baseDelay, this.config.maxDelay)
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms (max: ${this.config.maxDelay}ms)`)
    
    // Update connection store with reconnecting state
    const nextAttempt = new Date(Date.now() + delay)
    useConnectionStore.getState().setReconnecting(this.reconnectAttempts, nextAttempt)
    
    this.reconnectTimeout = setTimeout(async () => {
      if (!this.isReconnecting) return // Cancelled
      
      try {
        console.log(`🔄 Reconnect attempt ${this.reconnectAttempts} starting...`)
        await connectFunction()
        
        // Success! Reset reconnection state
        this.resetReconnection()
        console.log(`✅ Reconnect attempt ${this.reconnectAttempts} succeeded`)
        
      } catch (error) {
        console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error)
        
        // Update connection store with error
        const errorMessage = error instanceof Error ? error.message : 'Reconnection failed'
        useConnectionStore.getState().setError(errorMessage)
        
        // Continue reconnecting if under max attempts
        if (this.reconnectAttempts < this.config.maxAttempts) {
          this.isReconnecting = false // Allow next attempt
          this.scheduleReconnect(connectFunction)
        } else {
          console.error(`💥 Max reconnection attempts (${this.config.maxAttempts}) reached`)
          this.resetReconnection()
        }
      }
    }, delay)
  }
  
  /**
   * Cancel any pending reconnection attempt
   */
  cancelReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    this.isReconnecting = false
    console.log('Reconnection cancelled')
  }
  
  /**
   * Reset reconnection state after successful connection
   */
  resetReconnection(): void {
    this.reconnectAttempts = 0
    this.isReconnecting = false
    this.cancelReconnection()
  }
  
  /**
   * Get current reconnection state
   */
  getReconnectionState() {
    return {
      attempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      maxAttempts: this.config.maxAttempts,
      nextDelay: this.isReconnecting ? 0 : this.calculateNextDelay()
    }
  }
  
  /**
   * Calculate what the next delay would be
   */
  private calculateNextDelay(): number {
    const baseDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, this.reconnectAttempts)
    return Math.min(baseDelay, this.config.maxDelay)
  }
  
  /**
   * Update reconnection configuration
   */
  updateConfig(config: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...config }
    console.log('Reconnection config updated:', this.config)
  }
}
