import { lucia } from '../auth/index.js'
import { prisma } from '../db/index.js'

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
      const { type, conversationId, data: messageData } = data
      
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
      ws.send(JSON.stringify({ error: 'Invalid message format' }))
    }
  },

  open: async (ws: any) => {
    console.log('WebSocket connection opened')
    
    // For now, we'll implement a simple echo connection
    // In a full implementation, you'd authenticate the user here
    // using cookies or tokens from the WebSocket headers
    
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Welcome to Baseline API WebSocket!'
    }))
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
    // Verify user has access to conversation
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        userId_conversationId: {
          userId: connection.userId,
          conversationId: conversationId
        }
      }
    })
    
    if (!participant) {
      connection.ws.send(JSON.stringify({ error: 'Access denied to conversation' }))
      return
    }
    
    connection.conversationIds.add(conversationId)
    connection.ws.send(JSON.stringify({
      type: 'joined_conversation',
      conversationId
    }))
    
    // Notify other participants
    broadcastToConversation(conversationId, {
      type: 'user_joined',
      userId: connection.userId,
      conversationId
    }, connection.userId)
    
  } catch (error) {
    console.error('Join conversation error:', error)
    connection.ws.send(JSON.stringify({ error: 'Failed to join conversation' }))
  }
}

async function handleLeaveConversation(connection: WebSocketConnection, conversationId: string) {
  connection.conversationIds.delete(conversationId)
  connection.ws.send(JSON.stringify({
    type: 'left_conversation',
    conversationId
  }))
  
  // Notify other participants
  broadcastToConversation(conversationId, {
    type: 'user_left',
    userId: connection.userId,
    conversationId
  }, connection.userId)
}

async function handleTypingStart(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) {
    connection.ws.send(JSON.stringify({ error: 'Not in conversation' }))
    return
  }
  
  broadcastToConversation(conversationId, {
    type: 'typing_start',
    userId: connection.userId,
    conversationId
  }, connection.userId)
}

async function handleTypingStop(connection: WebSocketConnection, conversationId: string) {
  if (!connection.conversationIds.has(conversationId)) {
    return
  }
  
  broadcastToConversation(conversationId, {
    type: 'typing_stop',
    userId: connection.userId,
    conversationId
  }, connection.userId)
}

async function handleMessage(connection: WebSocketConnection, conversationId: string, messageData: any) {
  try {
    if (!connection.conversationIds.has(conversationId)) {
      connection.ws.send(JSON.stringify({ error: 'Not in conversation' }))
      return
    }
    
    // Save message to database
    const message = await prisma.message.create({
      data: {
        content: messageData.content,
        conversationId,
        authorId: connection.userId,
        type: messageData.type || 'TEXT',
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
      type: 'new_message',
      message
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
