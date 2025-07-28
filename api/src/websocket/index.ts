import { lucia } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { AuthService } from '../modules/auth/service.js'
import { redisConnectionManager } from './redis-connection-manager.js'

interface WebSocketConnection {
  ws: any
  userId: string
  conversationIds: Set<string>
}

// Store active connections
const connections = new Map<string, WebSocketConnection>()

// Store user ID to WebSocket ID mapping for targeted broadcasting
const userToWebSocket = new Map<string, string>()

export const websocketHandler = {
  message: async (ws: any, message: any) => {
    try {
      console.log('🔍 Raw message received:', typeof message, message)
      
      // Handle different message types that Bun/Elysia might send
      let data: any
      if (typeof message === 'string') {
        data = JSON.parse(message)
      } else if (typeof message === 'object' && message !== null) {
        data = message
      } else if (message instanceof ArrayBuffer || message instanceof Uint8Array) {
        const textDecoder = new TextDecoder()
        const text = textDecoder.decode(message)
        data = JSON.parse(text)
      } else {
        throw new Error(`Unsupported message type: ${typeof message}`)
      }
      
      console.log('🔍 Parsed message data:', data)
      const { type, data: messageData } = data
      
      const connection = connections.get(ws.id)
      if (!connection) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }))
        return
      }

      switch (type) {
        case 'join_conversation':
          await handleJoinConversation(connection, messageData?.conversationId)
          break
          
        case 'leave_conversation':
          await handleLeaveConversation(connection, messageData?.conversationId)
          break
          
        case 'typing_start':
          await handleTypingStart(connection, messageData?.conversationId)
          break
          
        case 'typing_stop':
          await handleTypingStop(connection, messageData?.conversationId)
          break
          
        case 'message':
        case 'message_created':
          await handleMessage(connection, messageData?.conversationId, messageData)
          break
          
        case 'conversation_created':
          await handleConversationCreated(connection, messageData)
          break
          
        case 'ping':
          // Heartbeat - send pong response
          connection.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          break
          
        default:
          console.log('❌ Unknown message type received:', type)
          console.log('❌ Full message data:', JSON.stringify(data, null, 2))
          ws.send(JSON.stringify({ error: 'Unknown message type' }))
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
      ws.send(JSON.stringify({ error: 'Invalid message format' }))
    }
  },

  open: async (ws: any) => {
    console.log('🚀 WebSocket connection opened')
    console.log('🔍 Full WebSocket object keys:', Object.keys(ws))
    console.log('🔍 WebSocket URL:', ws.url)
    console.log('🔍 WebSocket data:', ws.data)
    console.log('🔍 WebSocket remoteAddress:', ws.remoteAddress)
    
    try {
      // Extract session token from WebSocket URL query parameters
      const websocketUrl = ws.data?.url || ws.url || ''
      console.log('🔍 Using WebSocket URL:', websocketUrl)
      const url = new URL(websocketUrl, 'http://localhost')
      console.log('🔍 Parsed URL:', url.toString())
      console.log('🔍 URL search params:', url.search)
      console.log('🔍 All URL params:', Array.from(url.searchParams.entries()))
      
      const token = url.searchParams.get('token')
      console.log('🔍 Extracted token:', token ? `[${token.substring(0, 10)}...]` : 'null')
      
      if (!token) {
        console.log('❌ No token found in WebSocket URL')
        console.log('❌ Sending authentication required error')
        ws.send(JSON.stringify({ error: 'Authentication required' }))
        ws.close()
        return
      }
      
      console.log('🔑 WebSocket token received:', token.substring(0, 20) + '...')
      console.log('🔍 Attempting session validation...')
      
      // Validate session using AuthService (token is the sessionId)
      const sessionValidation = await AuthService.validateSession(token)
      console.log('🔍 Session validation result:', sessionValidation ? 'SUCCESS' : 'FAILED')
      
      if (!sessionValidation) {
        console.log('❌ Session validation failed')
        ws.send(JSON.stringify({ error: 'Invalid or expired session' }))
        ws.close()
        return
      }
      
      console.log('✅ Session validation successful for user:', sessionValidation.user.username)
      
      // Create authenticated connection
      const connection: WebSocketConnection = {
        ws,
        userId: sessionValidation.user.id,
        conversationIds: new Set()
      }
      
      // Store in local map AND Redis for scoped delivery
      connections.set(ws.id, connection)
      
      // Handle Redis registration with error handling
      try {
        await redisConnectionManager.addConnection(ws.id, sessionValidation.user.id)
        console.log(`✅ WebSocket connection registered in Redis: ${ws.id}`)
      } catch (redisError) {
        console.warn('⚠️ Redis connection registration failed, continuing without Redis:', redisError)
        // Continue without Redis - WebSocket will still work with local connections only
      }
      
      const connectedMessage = {
        type: 'connected',
        message: 'WebSocket authenticated successfully',
        userId: sessionValidation.user.id,
        username: sessionValidation.user.username
      }
      console.log('Sending WebSocket message:', JSON.stringify(connectedMessage))
      ws.send(JSON.stringify(connectedMessage))
      
      console.log(`WebSocket authenticated for user: ${sessionValidation.user.username} (${sessionValidation.user.id})`)
      
    } catch (error) {
      console.error('WebSocket authentication error:', error)
      ws.send(JSON.stringify({ error: 'Authentication failed' }))
      ws.close()
    }
  },

  close: (ws: any) => {
    console.log('WebSocket connection closed')
    // Remove from local map immediately
    connections.delete(ws.id)
    
    // Handle Redis cleanup asynchronously without blocking the close handler
    redisConnectionManager.removeConnection(ws.id).catch(error => {
      console.error('Error cleaning up Redis connection:', error)
    })
  },

  error: (ws: any, error: Error) => {
    console.error('WebSocket error:', error)
  }
}

// Helper functions for handling different message types
async function handleJoinConversation(connection: WebSocketConnection, conversationId: string, retryCount = 0) {
  try {
    console.log('🔍 Join conversation attempt:', {
      userId: connection.userId,
      conversationId: conversationId,
      conversationIdType: typeof conversationId,
      retryCount
    })
    
    if (!conversationId) {
      console.log('❌ No conversationId provided')
      connection.ws.send(JSON.stringify({ error: 'No conversation ID provided' }))
      return
    }
    
    // Verify user has access to conversation
    console.log('🔍 Checking participant access...')
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: connection.userId,
          conversationId: conversationId
        }
      }
    })
    
    console.log('🔍 Participant found:', participant ? 'YES' : 'NO')
    
    if (!participant) {
      // Handle race condition: participant record might not be committed yet
      if (retryCount < 3) {
        console.log(`🔄 Participant not found, retrying in 100ms (attempt ${retryCount + 1}/3)...`)
        setTimeout(() => {
          handleJoinConversation(connection, conversationId, retryCount + 1)
        }, 100)
        return
      }
      
      console.log('❌ Access denied to conversation:', conversationId)
      connection.ws.send(JSON.stringify({ error: 'Access denied to conversation' }))
      return
    }
    
    console.log('✅ User has access to conversation')
    
    connection.conversationIds.add(conversationId)
    connection.ws.send(JSON.stringify({
      type: 'joined_conversation',
      data: { conversationId }
    }))
    
    // Notify other participants
    broadcastToConversation(conversationId, {
      type: 'user_joined',
      data: {
        userId: connection.userId,
        conversationId
      }
    }, connection.userId)
    
  } catch (error) {
    console.error('Join conversation error:', error)
    connection.ws.send(JSON.stringify({ error: 'Failed to join conversation' }))
  }
}

async function handleLeaveConversation(connection: WebSocketConnection, conversationId: string) {
  connection.conversationIds.delete(conversationId)
  connection.ws.send(JSON.stringify({
    type: 'user_left',
    data: { conversationId }
  }))
  
  // Notify other participants
  broadcastToConversation(conversationId, {
    type: 'user_left',
    data: {
      userId: connection.userId,
      conversationId
    }
  }, connection.userId)
}

async function handleTypingStart(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) {
    connection.ws.send(JSON.stringify({ error: 'Not in conversation' }))
    return
  }
  
  // Get user info for typing indicator
  const user = await prisma.user.findUnique({
    where: { id: connection.userId },
    select: { username: true }
  })
  
  // Broadcast typing start to conversation participants
  broadcastToConversation(conversationId, {
    type: 'typing_start',
    data: {
      userId: connection.userId,
      userName: user?.username || 'Unknown User',
      conversationId,
      isTyping: true
    }
  }, connection.userId)
}

async function handleTypingStop(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) {
    return
  }
  
  // Get user info for typing indicator
  const user = await prisma.user.findUnique({
    where: { id: connection.userId },
    select: { username: true }
  })
  
  // Broadcast typing stop to conversation participants
  broadcastToConversation(conversationId, {
    type: 'typing_stop',
    data: {
      userId: connection.userId,
      userName: user?.username || 'Unknown User',
      conversationId,
      isTyping: false
    }
  }, connection.userId)
}

async function handleMessage(connection: WebSocketConnection, conversationId: string, messageData: any) {
  try {
    if (!connection.conversationIds.has(conversationId)) {
      connection.ws.send(JSON.stringify({ error: 'Not in conversation' }))
      return
    }
    
    // Save message to database
    // Convert client message type to Prisma MessageType enum
    const messageType = (messageData.type || 'text').toString().toUpperCase()
    console.log('🔍 Converting message type:', messageData.type, '->', messageType)
    
    const message = await prisma.message.create({
      data: {
        content: messageData.content,
        conversationId,
        authorId: connection.userId,
        type: messageType,
        replyToId: messageData.replyToId,
        metadata: messageData.metadata
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    })
    
    // Broadcast to all conversation participants
    broadcastToConversation(conversationId, {
      type: 'message_created',
      data: message
    })
    
  } catch (error) {
    console.error('Message handling error:', error)
    connection.ws.send(JSON.stringify({ error: 'Failed to send message' }))
  }
}

async function handleConversationCreated(connection: WebSocketConnection, messageData: any) {
  try {
    console.log('🔍 Conversation created notification:', {
      userId: connection.userId,
      conversationId: messageData?.conversationId,
      title: messageData?.title
    })
    
    if (!messageData?.conversationId) {
      console.log('❌ No conversationId provided in conversation_created event')
      connection.ws.send(JSON.stringify({ error: 'No conversation ID provided' }))
      return
    }
    
    // Get the full conversation with all participant data needed for title display
    const conversation = await prisma.conversation.findUnique({
      where: { id: messageData.conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    })
    
    if (!conversation) {
      connection.ws.send(JSON.stringify({ error: 'Conversation not found' }))
      return
    }
    
    // Verify user is a participant
    const userParticipant = conversation.participants.find(p => p.userId === connection.userId)
    if (!userParticipant) {
      connection.ws.send(JSON.stringify({ error: 'Not a participant in this conversation' }))
      return
    }
    
    // Auto-join the user to their newly created conversation
    connection.conversationIds.add(messageData.conversationId)
    
    // Send confirmation to the creator first
    connection.ws.send(JSON.stringify({
      type: 'conversation_created_confirmed',
      data: { 
        conversationId: messageData.conversationId, 
        conversation: {
          ...conversation,
          lastMessage: conversation.messages[0] || null,
          updatedAt: conversation.updatedAt.toISOString()
        }
      }
    }))
    
    // Now notify all OTHER participants (excluding the creator) with complete data
    console.log(`📡 Broadcasting conversation_created to other participants of conversation ${messageData.conversationId}`)
    await notifyAllParticipants(messageData.conversationId, {
      type: 'conversation_created',
      data: { 
        conversationId: messageData.conversationId, 
        conversation: {
          ...conversation,
          lastMessage: conversation.messages[0] || null,
          updatedAt: conversation.updatedAt.toISOString()
        },
        createdBy: connection.userId 
      }
    }, connection.userId)
    
    console.log(`✅ Conversation creation notification complete for conversation ${messageData.conversationId}`)
  } catch (error) {
    console.error('Error in handleConversationCreated:', error)
    connection.ws.send(JSON.stringify({ error: 'Failed to handle conversation creation' }))
  }
}

async function notifyAllParticipants(conversationId: string, message: any, excludeUserId?: string) {
  try {
    // Get all participants from database
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: conversationId
      },
      select: {
        userId: true
      }
    })
    
    const participantUserIds = participants.map(p => p.userId).filter(id => id !== excludeUserId)
    console.log(`📡 Notifying conversation ${conversationId} participants:`, participantUserIds)
    
    // Try Redis-based scoped delivery first
    let redisSuccess = false
    try {
      for (const userId of participantUserIds) {
        const userSocketIds = await redisConnectionManager.getUserConnections(userId)
        console.log(`🔍 User ${userId} has ${userSocketIds.length} active socket(s):`, userSocketIds)
        
        for (const socketId of userSocketIds) {
          const connection = connections.get(socketId)
          if (connection) {
            console.log(`📤 Redis-scoped notification to user ${userId} via socket ${socketId}`)
            connection.ws.send(JSON.stringify(message))
          } else {
            console.warn(`⚠️ Socket ${socketId} for user ${userId} not found in local connections`)
          }
        }
      }
      redisSuccess = true
      console.log(`✅ Redis-scoped notification complete for conversation ${conversationId}`)
    } catch (redisError) {
      console.warn('⚠️ Redis notification failed, falling back to local connections:', redisError)
    }
    
    // Fallback to local connections if Redis failed
    if (!redisSuccess) {
      console.log(`🔄 Falling back to local connection broadcast for conversation ${conversationId}`)
      for (const [wsId, connection] of connections) {
        if (participantUserIds.includes(connection.userId)) {
          console.log(`📤 Local fallback notification to user ${connection.userId} via socket ${wsId}`)
          connection.ws.send(JSON.stringify(message))
        }
      }
      console.log(`✅ Local fallback notification complete for conversation ${conversationId}`)
    }
  } catch (error) {
    console.error('Error in participant notification (all methods failed):', error)
  }
}

async function broadcastToConversation(conversationId: string, message: any, excludeUserId?: string) {
  try {
    // Get all participants from database
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: conversationId
      },
      select: {
        userId: true
      }
    })
    
    const participantUserIds = participants.map(p => p.userId)
    console.log(`📡 Broadcasting to conversation ${conversationId} participants:`, participantUserIds)
    
    // Send message to all connected participants (except excluded user)
    for (const [wsId, connection] of connections) {
      if (participantUserIds.includes(connection.userId) && connection.userId !== excludeUserId) {
        console.log(`📤 Sending to user ${connection.userId} via WebSocket ${wsId}`)
        connection.ws.send(JSON.stringify(message))
      }
    }
  } catch (error) {
    console.error('Error broadcasting to conversation:', error)
  }
}
