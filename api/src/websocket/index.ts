import { lucia } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { AuthService } from '../modules/auth/service.js'

interface WebSocketConnection {
  ws: any
  userId: string
  conversationIds: Set<string>
}

// Store active connections
const connections = new Map<string, WebSocketConnection>()

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
      
      connections.set(ws.id, connection)
      
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
    connections.delete(ws.id)
  },

  error: (ws: any, error: Error) => {
    console.error('WebSocket error:', error)
  }
}

// Helper functions for handling different message types
async function handleJoinConversation(connection: WebSocketConnection, conversationId: string) {
  try {
    console.log('🔍 Join conversation attempt:', {
      userId: connection.userId,
      conversationId: conversationId,
      conversationIdType: typeof conversationId
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
  
  // Broadcast typing start to conversation participants
  broadcastToConversation(conversationId, {
    type: 'typing_start',
    data: {
      userId: connection.userId,
      conversationId
    }
  }, connection.userId)
}

async function handleTypingStop(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) {
    return
  }
  
  // Broadcast typing stop to conversation participants
  broadcastToConversation(conversationId, {
    type: 'typing_stop',
    data: {
      userId: connection.userId,
      conversationId
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

function broadcastToConversation(conversationId: string, message: any, excludeUserId?: string) {
  for (const [wsId, connection] of connections) {
    if (connection.conversationIds.has(conversationId) && connection.userId !== excludeUserId) {
      connection.ws.send(JSON.stringify(message))
    }
  }
}
