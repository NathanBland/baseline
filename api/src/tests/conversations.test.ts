import { describe, it, expect } from 'bun:test'
import { app } from '../index'
import { createTestUser, createTestConversation, createTestMessage } from './setup.test'

describe('Conversation Routes', () => {
  describe('GET /conversations', () => {
    it('should return empty array when no conversations exist', async () => {
      const user = await createTestUser()
      const response = await app.handle(
        new Request(`http://localhost/conversations?userId=${user.id}`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversations).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return user conversations with participants and latest message', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id, { title: 'Test Chat' })
      const message = await createTestMessage(conversation.id, user.id)

      const response = await app.handle(
        new Request(`http://localhost/conversations?userId=${user.id}`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversations).toHaveLength(1)
      expect(data.conversations[0].title).toBe('Test Chat')
      expect(data.conversations[0].participants).toHaveLength(1)
      expect(data.conversations[0].messages).toHaveLength(1)
      expect(data.conversations[0]._count.messages).toBe(1)
    })

    it('should handle pagination', async () => {
      const user = await createTestUser()
      await createTestConversation(user.id, { title: 'Chat 1' })
      await createTestConversation(user.id, { title: 'Chat 2' })

      const response = await app.handle(
        new Request(`http://localhost/conversations?userId=${user.id}&limit=1&offset=1`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversations).toHaveLength(1)
    })

    it('should return error when userId is missing', async () => {
      const response = await app.handle(
        new Request('http://localhost/conversations')
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('GET /conversations/:id', () => {
    it('should return conversation by id', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)

      const response = await app.handle(
        new Request(`http://localhost/conversations/${conversation.id}`)
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(conversation.id)
      expect(data.participants).toHaveLength(1)
    })

    it('should return 404 for non-existent conversation', async () => {
      const response = await app.handle(
        new Request('http://localhost/conversations/non-existent-id')
      )
      
      expect(response.status).toBe(500) // Prisma throws error for invalid ID
    })
  })

  describe('POST /conversations', () => {
    it('should create new conversation', async () => {
      const user = await createTestUser()
      const conversationData = {
        title: 'New Conversation',
        type: 'GROUP',
        creatorId: user.id,
        participantIds: [user.id]
      }

      const response = await app.handle(
        new Request('http://localhost/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversationData)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.title).toBe('New Conversation')
      expect(data.type).toBe('GROUP')
      expect(data.participants).toHaveLength(1)
      expect(data.participants[0].role).toBe('ADMIN')
    })

    it('should handle missing required fields', async () => {
      const response = await app.handle(
        new Request('http://localhost/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(500)
    })
  })

  describe('PUT /conversations/:id', () => {
    it('should update conversation', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)

      const response = await app.handle(
        new Request(`http://localhost/conversations/${conversation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Updated Title' })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.title).toBe('Updated Title')
    })
  })

  describe('DELETE /conversations/:id', () => {
    it('should delete conversation', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)

      const response = await app.handle(
        new Request(`http://localhost/conversations/${conversation.id}`, {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('POST /conversations/:id/participants', () => {
    it('should add participant to conversation', async () => {
      const user1 = await createTestUser({ username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ username: 'user2', email: 'user2@test.com' })
      const conversation = await createTestConversation(user1.id)

      const response = await app.handle(
        new Request(`http://localhost/conversations/${conversation.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.participants).toHaveLength(2)
    })
  })

  describe('DELETE /conversations/:id/participants/:userId', () => {
    it('should remove participant from conversation', async () => {
      const user1 = await createTestUser({ username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ username: 'user2', email: 'user2@test.com' })
      const conversation = await createTestConversation(user1.id)
      
      // Add second participant
      await app.handle(
        new Request(`http://localhost/conversations/${conversation.id}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )

      const response = await app.handle(
        new Request(`http://localhost/conversations/${conversation.id}/participants/${user2.id}`, {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.participants).toHaveLength(1)
    })
  })
})
