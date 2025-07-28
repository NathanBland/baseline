import type { MetaFunction } from "@remix-run/node"
import { useState, useEffect } from "react"
import { useNavigate } from "@remix-run/react"
import { motion } from "motion/react"

import { ChatLayout } from "~/components/chat-layout"
import { ErrorBoundary, ChatErrorFallback } from "~/components/error-boundary"
import { apiService, type Conversation as ApiConversation, type Message as ApiMessage, type User } from "~/lib/api"
import { webSocketService } from '~/lib/websocket'
import { type PendingMessage } from '~/lib/websocket/message-failure-handler'

// Type adapters to convert API types to ChatLayout component types
interface ChatConversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  participants: { id: string; name: string; avatar?: string }[]
}

interface ChatMessage {
  id: string
  content: string
  authorId: string
  authorName: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'link'
  pending?: boolean // For optimistic updates
  failed?: boolean // For failed sends
  retryCount?: number // Number of retry attempts
  canRetry?: boolean // Whether retry is available
}

// Helper function to safely format timestamps
const formatTimestamp = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'now'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'now'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return 'now'
  }
}

// Adapter functions
const adaptConversation = (conv: ApiConversation): ChatConversation => {
  // Safely extract participants with nested user structure
  const participants = conv.participants?.map(p => ({
    id: p.user?.id || p.id,
    name: p.user?.username || 'Unknown User',
    avatar: p.user?.avatar || undefined
  })) || []
  
  return {
    id: conv.id,
    title: conv.title,
    lastMessage: conv.lastMessage?.content || conv.messages?.[conv.messages.length - 1]?.content || 'No messages yet',
    timestamp: formatTimestamp(conv.updatedAt),
    unreadCount: 0, // TODO: Implement unread count from API
    participants
  }
}

const adaptMessage = (msg: ApiMessage): ChatMessage => ({
  id: msg.id,
  content: msg.content,
  authorId: msg.authorId,
  authorName: msg.author.username,
  timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  type: msg.type
})

export const meta: MetaFunction = () => {
  return [
    { title: "Chat - Baseline" },
    { name: "description", content: "Baseline Chat Application" },
  ]
}

interface TypingIndicator {
  userId: string
  userName: string
  conversationId: string
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string>()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [error, setError] = useState<string | null>(null)
  const [wsService, setWsService] = useState<typeof webSocketService | null>(null)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [isMessageSending, setIsMessageSending] = useState(false)
  const [failedMessages, setFailedMessages] = useState<Map<string, PendingMessage>>(new Map())
  const navigate = useNavigate()

  // Initialize user and data on mount
  useEffect(() => {
    let unsubscribeFailure: (() => void) | null = null
    
    const initializeChat = async () => {
      try {
        setError(null)
        
        // Check if user is authenticated
        const user = await apiService.getCurrentUser()
        setCurrentUser(user)
        
        // Get user conversations with offline handling
        try {
          const userConversations = await apiService.getConversations()
          setConversations(userConversations.map(adaptConversation))
        } catch (error) {
          console.warn('Failed to load conversations, app will work in offline mode:', error)
          // Set empty conversations array for offline mode - let connection indicator show offline status
          setConversations([])
          // Don't set error state - let chat UI render normally in offline mode
        }
        
        // Initialize WebSocket connection
        webSocketService.connect()
        
        // Set up WebSocket event listeners
        webSocketService.onMessage((message: ApiMessage) => {
          const adaptedMessage = adaptMessage(message)
          
          setMessages(prev => {
            // Check if this exact message already exists by ID (prevent duplicates)
            const messageExists = prev.some(m => m.id === adaptedMessage.id)
            if (messageExists) {
              console.log('Real message already exists, skipping:', adaptedMessage.id)
              return prev
            }
            
            // Remove matching optimistic messages (same author + content)
            const withoutOptimistic = prev.filter(m => {
              if (!m.pending) return true // Keep all real messages
              
              // Remove if optimistic message matches this real message
              const isMatch = m.authorId === adaptedMessage.authorId && 
                             m.content === adaptedMessage.content
              
              if (isMatch) {
                console.log('Removing optimistic message:', m.id, '-> replacing with real:', adaptedMessage.id)
              }
              
              return !isMatch
            })
            
            // Reset loading state when real message arrives
            setIsMessageSending(false)
            
            // Add the real message
            console.log('Adding real message:', adaptedMessage.id)
            return [...withoutOptimistic, adaptedMessage]
          })
          
          // Update conversation list to show latest message
          setConversations(prev => prev.map(conv => {
            if (conv.id === message.conversationId) {
              return {
                ...conv,
                lastMessage: message.content,
                timestamp: formatTimestamp(message.createdAt)
              }
            }
            return conv
          }))
        })
        
        webSocketService.onConversation((conversation: ApiConversation) => {
          console.log('🏗️ Received conversation event:', conversation.id)
          setConversations(prev => {
            const existingIndex = prev.findIndex(c => c.id === conversation.id)
            const adaptedConversation = adaptConversation(conversation)
            
            if (existingIndex >= 0) {
              // Update existing conversation
              console.log('📝 Updating existing conversation:', conversation.id)
              const updated = [...prev]
              updated[existingIndex] = adaptedConversation
              return updated
            } else {
              // Add new conversation to the top of the list
              console.log('➕ Adding new conversation:', conversation.id)
              return [adaptedConversation, ...prev]
            }
          })
        })
        
        // Set up typing indicator WebSocket listener
        webSocketService.onTyping((typingData: any) => {
          const { userId, userName, conversationId, isTyping } = typingData
          
          if (isTyping) {
            setTypingUsers(prev => {
              // Remove existing typing indicator for this user and add new one
              const filtered = prev.filter(t => t.userId !== userId || t.conversationId !== conversationId)
              return [...filtered, { userId, userName, conversationId }]
            })
          } else {
            setTypingUsers(prev => 
              prev.filter(t => t.userId !== userId || t.conversationId !== conversationId)
            )
          }
        })
        
        // Set up failure listener for message retry functionality
        unsubscribeFailure = webSocketService.onFailure((failedMessage: PendingMessage) => {
          console.warn('💥 Message failed:', failedMessage.id, failedMessage.type)
          
          // Store failed message for retry
          setFailedMessages(prev => {
            const updated = new Map(prev)
            updated.set(failedMessage.id, failedMessage)
            return updated
          })
          
          // Mark corresponding optimistic message as failed
          if (failedMessage.type === 'message_created') {
            setMessages(prev => prev.map(msg => {
              // Find matching optimistic message by content and author
              if (msg.pending && 
                  msg.content === failedMessage.data.content &&
                  msg.authorId === currentUser?.id) {
                return {
                  ...msg,
                  failed: true,
                  canRetry: true,
                  timestamp: 'failed to send',
                  pending: false // No longer pending, now failed
                }
              }
              return msg
            }))
          }
          
          // For non-message failures (join_conversation, typing, etc.), still reset loading state
          // and show user-friendly error if needed
          if (failedMessage.type === 'join_conversation') {
            console.warn('🚫 Failed to join conversation:', failedMessage.data?.conversationId)
            // Could show toast notification here in the future
          }
          
          // Reset loading state
          setIsMessageSending(false)
        })
        
        setWsService(webSocketService)
        
      } catch (error) {
        console.error('Failed to initialize chat:', error)
        if (error instanceof Error && (
          error.message.includes('not authenticated') || 
          error.message.includes('401') ||
          error.message.includes('No session found')
        )) {
          // Redirect to login if not authenticated
          console.log('Redirecting to login due to authentication error')
          navigate('/')
        } else {
          setError('Failed to load chat. Please try again.')
        }
      }
    }
    
    initializeChat()
    
    // Cleanup WebSocket on unmount
    return () => {
      if (wsService) {
        wsService.disconnect()
      }
      // Cleanup failure listener to prevent duplicates
      if (unsubscribeFailure) {
        unsubscribeFailure()
      }
    }
  }, [])

  const handleConversationSelect = async (conversationId: string) => {
    try {
      // Leave previous conversation if any
      if (activeConversationId && wsService && wsService.isConnected()) {
        wsService.leaveConversation(activeConversationId)
      }
      
      setActiveConversationId(conversationId)
      setError(null)
      
      // Load messages for the selected conversation
      const response = await apiService.getMessages(conversationId)
      // Handle new API response structure with messages array
      const conversationMessages = response.messages || []
      setMessages(conversationMessages.map(adaptMessage))
      
      // Join the new conversation for real-time updates
      if (wsService && wsService.isConnected()) {
        wsService.joinConversation(conversationId)
      }
      
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setError('Failed to load conversation messages.')
    }
  }

  const handleRetryMessage = async (messageId: string) => {
    const failedMessage = failedMessages.get(messageId)
    if (!failedMessage || !activeConversationId) return
    
    try {
      console.log('🔄 Retrying failed message:', messageId)
      
      // Update UI to show retrying state - match by content since IDs are different
      setMessages(prev => prev.map(msg => {
        if (msg.content === failedMessage.data.content && 
            msg.authorId === currentUser?.id &&
            msg.failed) {
          return {
            ...msg,
            failed: false,
            pending: true,
            timestamp: 'retrying...',
            retryCount: (msg.retryCount || 0) + 1
          }
        }
        return msg
      }))
      
      // Remove from failed messages queue
      setFailedMessages(prev => {
        const updated = new Map(prev)
        updated.delete(messageId)
        return updated
      })
      
      // Attempt to send the message again
      if (wsService && wsService.isConnected()) {
        wsService.sendMessage('message_created', {
          conversationId: activeConversationId,
          content: failedMessage.data.content,
          type: failedMessage.data.type || 'text'
        })
        console.log('📤 Retry message sent via WebSocket')
      } else {
        throw new Error('WebSocket not connected')
      }
      
    } catch (error) {
      console.error('Failed to retry message:', error)
      
      // Mark as failed again if retry fails - match by content since IDs are different
      setMessages(prev => prev.map(msg => {
        if (msg.content === failedMessage.data.content && 
            msg.authorId === currentUser?.id &&
            msg.pending) {
          return {
            ...msg,
            failed: true,
            pending: false,
            timestamp: 'retry failed',
            canRetry: (msg.retryCount || 0) < 3 // Allow up to 3 retries
          }
        }
        return msg
      }))
      
      // Put back in failed messages if retry limit not reached
      if ((failedMessage.retryCount || 0) < 3) {
        setFailedMessages(prev => {
          const updated = new Map(prev)
          updated.set(messageId, {
            ...failedMessage,
            retryCount: (failedMessage.retryCount || 0) + 1
          })
          return updated
        })
      }
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || !currentUser) return
    
    try {
      setError(null)
      setIsMessageSending(true) // Start loading state
      
      // Create optimistic message for immediate UI feedback
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content,
        type: 'text',
        authorId: currentUser?.id || '',
        authorName: currentUser?.username || 'You',
        timestamp: 'sending...', // User-friendly timestamp for optimistic messages
        pending: true // Mark as pending for styling
      }
      
      console.log('🚀 Adding optimistic message:', optimisticMessage.id, optimisticMessage.content)
      
      // Add optimistic message to UI immediately
      setMessages(prev => {
        console.log('📝 Previous messages count:', prev.length)
        const updated = [...prev, optimisticMessage]
        console.log('📝 Updated messages count:', updated.length)
        return updated
      })
      
      // Send message via WebSocket only
      if (wsService) {
        wsService.sendMessage('message_created', {
          conversationId: activeConversationId,
          content,
          type: 'text'
        })
        console.log('📤 Message sent via WebSocket')
        // Keep loading state true until real message comes back
      } else {
        throw new Error('WebSocket not connected')
      }
      
      // Real message will replace optimistic one via WebSocket event listener
      
    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Failed to send message. Please try again.')
      setIsMessageSending(false) // Reset loading state on error
      
      // Remove the failed optimistic message
      setMessages(prev => prev.filter(m => !m.pending || m.content !== content))
    }
  }

  const handleCreateConversation = async (title: string, participantIds: string[]) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }
    
    try {
      setError(null)
      
      // Create conversation via API
      const newConversation = await apiService.createConversation(title, participantIds)
      
      // Add conversation to local state
      const adaptedConversation = adaptConversation(newConversation)
      setConversations(prev => [adaptedConversation, ...prev])
      
      // Automatically select the new conversation
      setActiveConversationId(newConversation.id)
      
      // Send WebSocket event for real-time updates to other users
      if (wsService) {
        wsService.sendMessage('conversation_created', {
          conversationId: newConversation.id,
          title,
          participantIds
        })
      }
      
      // Load initial empty messages for the new conversation
      setMessages([])
      
    } catch (error) {
      console.error('Failed to create conversation:', error)
      throw new Error('Failed to create conversation. Please try again.')
    }
  }

  const handleTypingStart = (conversationId: string) => {
    if (!currentUser || !wsService) return
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    // Send typing start event
    wsService.sendMessage('typing_start', {
      conversationId
    })
    
    // Auto-stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      handleTypingStop(conversationId)
    }, 3000)
    
    setTypingTimeout(timeout)
  }
  
  const handleTypingStop = (conversationId: string) => {
    if (!currentUser || !wsService) return
    
    // Clear timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }
    
    // Send typing stop event
    wsService.sendMessage('typing_stop', {
      conversationId
    })
  }

  const handleSearchUsers = async (query: string): Promise<any[]> => {
    try {
      setError(null)
      const users = await apiService.searchUsers(query)
      return users
    } catch (error) {
      console.error('Failed to search users:', error)
      return []
    }
  }

  // Show error state if something went wrong
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-screen flex items-center justify-center"
      >
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </motion.div>
    )
  }

  // Don't render if user is not available
  if (!currentUser) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-screen"
    >
      <ErrorBoundary fallback={ChatErrorFallback}>
        <ChatLayout
          conversations={conversations}
          activeConversationId={activeConversationId}
          messages={messages}
          currentUser={{
            id: currentUser?.id || '',
            name: currentUser?.username || 'Unknown',
            avatar: currentUser?.avatar || undefined
          }}
          typingUsers={typingUsers}
          isMessageSending={isMessageSending}
          onConversationSelect={handleConversationSelect}
          onSendMessage={handleSendMessage}
          onCreateConversation={handleCreateConversation}
          onSearchUsers={handleSearchUsers}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onRetryMessage={handleRetryMessage}
        />
      </ErrorBoundary>
    </motion.div>
  )
}
