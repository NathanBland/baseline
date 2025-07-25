import { beforeEach, describe, it, expect } from 'bun:test'
import { setupUnitTestMocks } from './setup.test'
import { app } from '../index'
import { createTestUser, createTestConversation, createTestMessage, createAuthenticatedRequest, createAuthHeaders } from './setup.test'

// Apply unit test mocking isolation for Given-When-Then BDD compliance
setupUnitTestMocks()

describe('Message Management', () => {
  describe('When retrieving messages from a conversation', () => {
    it('should return all messages when conversation contains messages', async () => {
      // Given: An authenticated user with a conversation containing messages
      const user = await createTestUser({ id: 'user1' }) // Match lucia mock user ID
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      const message = await createTestMessage(conversation.id, user.id, { content: 'Test message' })

      // When: The user requests messages for the conversation
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages?conversationId=${conversation.id}&userId=${user.id}`)
      )
      
      // Then: The messages are returned successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(1)
      expect(data.messages[0].content).toBe('Test message')
      expect(data.messages[0].author.username).toBe('testuser')
    })

    it('should handle pagination when limit and offset are provided', async () => {
      // Given: An authenticated user with a conversation containing multiple messages
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      await createTestMessage(conversation.id, user.id, { content: 'Message 1' })
      await createTestMessage(conversation.id, user.id, { content: 'Message 2' })

      // When: The user requests messages with pagination parameters
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages?conversationId=${conversation.id}&userId=${user.id}&limit=1&offset=1`)
      )
      
      // Then: The paginated messages are returned successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(1)
    })

    it('should return error when conversationId is missing', async () => {
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/messages')
      )
      
      expect(response.status).toBe(422)
    })
  })

  describe('GET /messages/:id', () => {
    it('should return message by id when user has access', async () => {
      // Given: An authenticated user with a message in an accessible conversation
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      const message = await createTestMessage(conversation.id, user.id)

      // When: The user requests the specific message
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages/${message.id}?userId=${user.id}`)
      )
      
      // Then: The message is returned successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message.id).toBe(message.id)
      expect(data.message.author.username).toBe('testuser')
    })

    it('should return 404 for non-existent message when message does not exist', async () => {
      // Given: An authenticated user requesting a non-existent message
      const user = await createTestUser({ id: 'user1' })
      
      // When: The user requests a non-existent message
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages/non-existent-id?userId=${user.id}`)
      )
      
      // Then: A 404 error is returned
      expect(response.status).toBe(404)
    })
  })

  describe('POST /messages', () => {
    it('should create new message when valid data is provided', async () => {
      // Given: An authenticated user with access to a conversation
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      const messageData = {
        content: 'New message content',
        conversationId: conversation.id,
        authorId: user.id, // Required field that was missing
        type: 'TEXT'
      }

      // When: The user creates a new message
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify(messageData)
        })
      )
      
      // Then: The message is created successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message.content).toBe('New message content') // Should return the input data
      expect(data.message.type).toBe('TEXT')
      expect(data.message.author.username).toBe('testuser')
    })

    it('should create reply message when replying to existing message', async () => {
      // Given: An authenticated user with access to a conversation and an existing message
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      const originalMessage = await createTestMessage(conversation.id, user.id)
      
      const replyData = {
        content: 'Reply message',
        conversationId: conversation.id,
        authorId: user.id, // Required field that was missing
        type: 'TEXT',
        replyToId: originalMessage.id
      }

      // When: The user creates a reply message
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify(replyData)
        })
      )
      
      // Then: The reply message is created successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message.content).toBe('Reply message')
      expect(data.message.replyToId).toBe(originalMessage.id)
      expect(data.message.type).toBe('TEXT')
    })

    it('should handle missing required fields', async () => {
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(422)
    })
  })

  describe('PUT /messages/:id', () => {
    it('should update message content when user is the author', async () => {
      // Given: An authenticated user with an existing message they authored
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      const message = await createTestMessage(conversation.id, user.id)

      // When: The user updates the message content
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages/${message.id}?userId=${user.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(),
          body: JSON.stringify({ content: 'Updated content' })
        })
      )
      
      // Then: The message is updated successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message.content).toBe('Updated content') // Should return the updated input data
      expect(data.message.id).toBe(message.id)
    })
  })

  describe('DELETE /messages/:id', () => {
    it('should delete message when user is the author', async () => {
      // Given: An authenticated user with an existing message they authored
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      const message = await createTestMessage(conversation.id, user.id)

      // When: The user deletes the message
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages/${message.id}?userId=${user.id}`, {
          method: 'DELETE'
        })
      )
      
      // Then: The message is deleted successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('GET /messages/search', () => {
    it('should search messages by content when user has access', async () => {
      // Given: An authenticated user with access to a conversation containing messages
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      await createTestMessage(conversation.id, user.id, { content: 'Hello world' })
      await createTestMessage(conversation.id, user.id, { content: 'Goodbye world' })

      // When: The user searches for messages containing 'Hello'
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages/search?conversationId=${conversation.id}&userId=${user.id}&query=Hello`)
      )
      
      // Then: The matching messages are returned
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(1)
      expect(data.messages[0].content).toBe('Hello world')
    })

    it('should return empty results for no matches when search term not found', async () => {
      // Given: An authenticated user with access to a conversation containing messages
      const user = await createTestUser({ id: 'user1' })
      const conversation = await createTestConversation(user.id, { 
        id: 'mock-conversation-id',
        participants: [{
          id: 'mock-participant-id',
          userId: user.id,
          conversationId: 'mock-conversation-id',
          role: 'ADMIN',
          joinedAt: new Date(),
          user: user
        }]
      })
      await createTestMessage(conversation.id, user.id, { content: 'Hello world' })

      // When: The user searches for a term that doesn't exist
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/messages/search?conversationId=${conversation.id}&userId=${user.id}&query=nonexistent`)
      )
      
      // Then: No results are returned
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(0)
    })

    it('should require conversationId and query', async () => {
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/messages/search')
      )
      
      expect(response.status).toBe(422)
    })
  })
})
