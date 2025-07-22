import { lucia } from '../auth/index.js'
import { prisma, redis } from '../db/index.js'
import { wsMessageSchema } from '../lib/validation.js'

interface WebSocketConnection {
  ws: any
  userId: string
  conversationIds: Set<string>
}

// Store active connections
const connections = new Map<string, WebSocketConnection>()

export const websocketHandler = {
  message: async (ws: any, message: string) => {
    try {
      const data = JSON.parse(message)
      const { type, conversationId, data: messageData } = wsMessageSchema.parse(data)
      
      const connection = connections.get(ws.id)
      if (!connection) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }))
        return
      }

      switch (type) {
        case 'join_conversation':
          await handleJoinConversation(connection, conversationId)
          break
          
        case 'leave_conversation':
          await handleLeaveConversation(connection, conversationId)
          break
          
        case 'typing_start':
          await handleTypingStart(connection, conversationId)
          break
          
        case 'typing_stop':
          await handleTypingStop(connection, conversationId)
          break
          
        case 'message':
          await handleMessage(connection, conversationId, messageData)
          break
          
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }))
      }
    } catch (error) {
      console.error('WebSocket message error:', error)
      ws.send(JSON.stringify({ 
        error: 'Invalid message format',
        details: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  },

  open: async (ws: any) => {
    console.log('WebSocket connection opened:', ws.id)
    
    // Extract session from query params or headers
    const sessionId = ws.data?.query?.session || ws.data?.headers?.cookie?.split('lucia_session=')[1]?.split(';')[0]
    
    if (!sessionId) {
      ws.send(JSON.stringify({ error: 'Authentication required' }))
      ws.close()
      return
    }

    try {
      const { session, user } = await lucia.validateSession(sessionId)
      if (!session || !user) {
        ws.send(JSON.stringify({ error: 'Invalid session' }))
        ws.close()
        return
      }

      // Store connection
      connections.set(ws.id, {
        ws,
        userId: user.id,
        conversationIds: new Set()
      })

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }))

      // Set user as online in Redis
      await redis.setex(`user:${user.id}:online`, 300, Date.now().toString()) // 5 minute TTL
      
    } catch (error) {
      console.error('WebSocket authentication error:', error)
      ws.send(JSON.stringify({ error: 'Authentication failed' }))
      ws.close()
    }
  },

  close: async (ws: any) => {
    console.log('WebSocket connection closed:', ws.id)
    
    const connection = connections.get(ws.id)
    if (connection) {
      // Leave all conversations
      for (const conversationId of connection.conversationIds) {
        await broadcastToConversation(conversationId, {
          type: 'user_left',
          userId: connection.userId,
          conversationId
        }, connection.userId)
      }

      // Remove from online users
      await redis.del(`user:${connection.userId}:online`)
      
      // Remove connection
      connections.delete(ws.id)
    }
  },

  error: (ws: any, error: Error) => {
    console.error('WebSocket error:', error)
  }
}

async function handleJoinConversation(connection: WebSocketConnection, conversationId: string) {
  try {
    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: connection.userId,
        leftAt: null
      }
    })

    if (!participant) {
      connection.ws.send(JSON.stringify({ 
        error: 'Not authorized to join this conversation',
        conversationId 
      }))
      return
    }

    // Add to conversation
    connection.conversationIds.add(conversationId)
    
    // Store in Redis for broadcasting
    await redis.sadd(`conversation:${conversationId}:users`, connection.userId)
    
    // Notify others in conversation
    await broadcastToConversation(conversationId, {
      type: 'user_joined',
      userId: connection.userId,
      conversationId
    }, connection.userId)

    connection.ws.send(JSON.stringify({
      type: 'conversation_joined',
      conversationId
    }))
    
  } catch (error) {
    console.error('Error joining conversation:', error)
    connection.ws.send(JSON.stringify({ 
      error: 'Failed to join conversation',
      conversationId 
    }))
  }
}

async function handleLeaveConversation(connection: WebSocketConnection, conversationId: string) {
  connection.conversationIds.delete(conversationId)
  await redis.srem(`conversation:${conversationId}:users`, connection.userId)
  
  await broadcastToConversation(conversationId, {
    type: 'user_left',
    userId: connection.userId,
    conversationId
  }, connection.userId)

  connection.ws.send(JSON.stringify({
    type: 'conversation_left',
    conversationId
  }))
}

async function handleTypingStart(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) return

  await redis.setex(`typing:${conversationId}:${connection.userId}`, 10, Date.now().toString())
  
  await broadcastToConversation(conversationId, {
    type: 'typing_start',
    userId: connection.userId,
    conversationId
  }, connection.userId)
}

async function handleTypingStop(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) return

  await redis.del(`typing:${conversationId}:${connection.userId}`)
  
  await broadcastToConversation(conversationId, {
    type: 'typing_stop',
    userId: connection.userId,
    conversationId
  }, connection.userId)
}

async function handleMessage(connection: WebSocketConnection, conversationId: string, messageData: any) {
  if (!connection.conversationIds.has(conversationId)) return

  // The actual message creation should be done via REST API
  // This is just for real-time notification
  await broadcastToConversation(conversationId, {
    type: 'new_message',
    conversationId,
    ...messageData
  })
}

async function broadcastToConversation(conversationId: string, message: any, excludeUserId?: string) {
  const userIds = await redis.smembers(`conversation:${conversationId}:users`)
  
  for (const [connectionId, connection] of connections) {
    if (connection.conversationIds.has(conversationId) && connection.userId !== excludeUserId) {
      connection.ws.send(JSON.stringify(message))
    }
  }
}

// Cleanup typing indicators periodically
setInterval(async () => {
  const keys = await redis.keys('typing:*')
  for (const key of keys) {
    const timestamp = await redis.get(key)
    if (timestamp && Date.now() - parseInt(timestamp) > 10000) {
      await redis.del(key)
    }
  }
}, 5000)
