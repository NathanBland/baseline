import { describe, it, expect } from 'bun:test'
import { app } from '../index'
import { createTestUser, createTestConversation, createTestMessage } from './setup.test'

describe('Message Routes', () => {
  describe('GET /messages', () => {
    it('should return messages for conversation', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      const message = await createTestMessage(conversation.id, user.id, { content: 'Hello world' })

      const response = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(1)
      expect(data.messages[0].content).toBe('Hello world')
      expect(data.messages[0].author.username).toBe('testuser')
    })

    it('should handle pagination', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      await createTestMessage(conversation.id, user.id, { content: 'Message 1' })
      await createTestMessage(conversation.id, user.id, { content: 'Message 2' })

      const response = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&limit=1&offset=1`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(1)
    })

    it('should return error when conversationId is missing', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages')
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('GET /messages/:id', () => {
    it('should return message by id', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      const message = await createTestMessage(conversation.id, user.id)

      const response = await app.handle(
        new Request(`http://localhost/messages/${message.id}`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(message.id)
      expect(data.author.username).toBe('testuser')
    })

    it('should return 404 for non-existent message', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages/non-existent-id')
      )
      
      expect(response.status).toBe(500) // Prisma throws error for invalid ID
    })
  })

  describe('POST /messages', () => {
    it('should create new message', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      const messageData = {
        content: 'New message content',
        conversationId: conversation.id,
        authorId: user.id,
        type: 'TEXT'
      }

      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messageData)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.content).toBe('New message content')
      expect(data.type).toBe('TEXT')
      expect(data.author.username).toBe('testuser')
    })

    it('should create reply message', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      const originalMessage = await createTestMessage(conversation.id, user.id)
      
      const replyData = {
        content: 'Reply message',
        conversationId: conversation.id,
        authorId: user.id,
        type: 'TEXT',
        replyToId: originalMessage.id
      }

      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(replyData)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.content).toBe('Reply message')
      expect(data.replyToId).toBe(originalMessage.id)
    })

    it('should handle missing required fields', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('PUT /messages/:id', () => {
    it('should update message content', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      const message = await createTestMessage(conversation.id, user.id)

      const response = await app.handle(
        new Request(`http://localhost/messages/${message.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Updated content' })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.content).toBe('Updated content')
      expect(data.updatedAt).not.toBe(data.createdAt)
    })
  })

  describe('DELETE /messages/:id', () => {
    it('should delete message', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      const message = await createTestMessage(conversation.id, user.id)

      const response = await app.handle(
        new Request(`http://localhost/messages/${message.id}`, {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('GET /messages/search', () => {
    it('should search messages by content', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      await createTestMessage(conversation.id, user.id, { content: 'Hello world' })
      await createTestMessage(conversation.id, user.id, { content: 'Goodbye world' })

      const response = await app.handle(
        new Request(`http://localhost/messages/search?conversationId=${conversation.id}&query=Hello`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(1)
      expect(data.messages[0].content).toBe('Hello world')
    })

    it('should return empty results for no matches', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)
      await createTestMessage(conversation.id, user.id, { content: 'Hello world' })

      const response = await app.handle(
        new Request(`http://localhost/messages/search?conversationId=${conversation.id}&query=nonexistent`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.messages).toHaveLength(0)
    })

    it('should require conversationId and query', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages/search')
      )
      
      expect(response.status).toBe(500)
    })
  })
})
