import { beforeEach, describe, it, expect } from 'bun:test'
import { setupUnitTestMocks } from './setup.test'
import { app } from '../index'
import { resetMockState } from './__mocks__/prisma'
import { createTestUser, createTestConversation, createTestMessage, createAuthenticatedRequest, createAuthHeaders } from './setup.test'

// Apply unit test mocking isolation for Given-When-Then BDD compliance
setupUnitTestMocks()

describe('Conversation Routes', () => {
  describe('GET /conversations', () => {
    it('should return empty array when no conversations exist', async () => {
      // Given: An authenticated user with no conversations
      const user = await createTestUser({ id: 'user1' })
      
      // When: The user requests their conversations
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations?userId=${user.id}`)
      )
      
      // Then: An empty list is returned
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversations).toEqual([])
      expect(data.total).toBe(0)
    })

    it('should return conversations with participants and latest message when user has conversations', async () => {
      // Given: An authenticated user with conversations
      const user = await createTestUser({ id: 'mock-user-with-conversations' })
      const conversation = await createTestConversation(user.id, {
        title: 'Test Chat'
      })
      const message = await createTestMessage(conversation.id, user.id)
      console.log('🔍 TEST: Created message:', message)
      
      const requestUrl = `http://localhost/conversations?userId=${user.id}`
      console.log('🔍 TEST: Making request to:', requestUrl)

      // When: The user requests their conversations
      const response = await app.handle(
        createAuthenticatedRequest(requestUrl)
      )
      
      console.log('🔍 TEST: Response status:', response.status)
      if (response.status !== 200) {
        const errorData = await response.text()
        console.log('🔍 TEST: Error response:', errorData)
      }
      
      // Then: The conversations are returned with full details
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversations).toHaveLength(1)
      expect(data.conversations[0].title).toBe('Test Chat')
      expect(data.conversations[0].participants).toHaveLength(1)
      expect(data.conversations[0].messages).toHaveLength(1)
      expect(data.conversations[0]._count.messages).toBe(1)
    })

    it('should handle pagination when user has multiple conversations', async () => {
      // Given: An authenticated user with multiple conversations
      const user = await createTestUser({ id: 'mock-user-with-conversations' }) // Match mock participant
      await createTestConversation(user.id, { title: 'Chat 1' })
      await createTestConversation(user.id, { title: 'Chat 2' })

      // When: The user requests conversations with pagination
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations?userId=${user.id}&limit=1&offset=1`)
      )
      
      // Then: Paginated conversations are returned
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversations).toHaveLength(1)
    })

    it('should return error when user is not authenticated', async () => {
      // Given: A request with required parameters but no authentication
      // When: The user requests conversations without authentication
      const response = await app.handle(
        new Request('http://localhost/conversations?userId=test-user-id')
      )
      
      // Then: An authentication error is returned
      expect(response.status).toBe(401)
    })
  })

  describe('GET /conversations/:id', () => {
    it('should return conversation by id', async () => {
      // Given: An authenticated user with a conversation
      const user = await createTestUser({ id: 'mock-user-with-conversations' })
      const conversation = await createTestConversation(user.id)

      // When: The user requests a specific conversation by ID
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}?userId=${user.id}`)
      )
      
      // Then: The conversation is returned successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversation.id).toBe(conversation.id)
      expect(data.conversation.participants).toHaveLength(1)
    })

    it('should return 404 for non-existent conversation', async () => {
      // Given: An authenticated user requesting a non-existent conversation
      // When: The user requests a conversation that doesn't exist
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/conversations/non-existent-id?userId=test-user-id')
      )
      
      // Then: A 404 not found error is returned
      expect(response.status).toBe(404)
    })
  })

  describe('POST /conversations', () => {
    it('should create new conversation', async () => {
      // Given: An authenticated user with conversation data
      const user = await createTestUser({ id: 'mock-user-with-conversations' })
      const conversationData = {
        title: 'New Conversation',
        type: 'GROUP',
        participantIds: [user.id]
      }

      // When: The user creates a new conversation
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations?userId=${user.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify(conversationData)
        })
      )
      
      // Then: The conversation is created successfully
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversation.title).toBe('New Conversation')
      expect(data.conversation.type).toBe('GROUP')
      expect(data.conversation.participants).toHaveLength(1)
      expect(data.conversation.participants[0].role).toBe('ADMIN')
    })

    it('should handle missing required fields', async () => {
      const response = await app.handle(
        createAuthenticatedRequest('http://localhost/conversations', {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({})
        })
      )
      
      expect(response.status).toBe(422)
    })
  })

  describe('PUT /conversations/:id', () => {
    it('should update conversation', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)

      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}?userId=${user.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(),
          body: JSON.stringify({ title: 'Updated Title' })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conversation.title).toBe('Updated Title')
    })
  })

  describe('DELETE /conversations/:id', () => {
    it('should delete conversation', async () => {
      const user = await createTestUser()
      const conversation = await createTestConversation(user.id)

      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}?userId=${user.id}`, {
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
      // Given: Two users and a conversation owned by user1
      const user1 = await createTestUser({ id: 'user1', username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ id: 'user2', username: 'user2', email: 'user2@test.com' })
      const conversation = await createTestConversation(user1.id)

      // When: User1 adds user2 as a participant
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.participant).toBeDefined()
      expect(data.participant.userId).toBe(user2.id)
      expect(data.participant.role).toBe('MEMBER')
    })

    it('should prevent non-admin users from adding participants', async () => {
      // Given: Three users and a conversation
      const user1 = await createTestUser({ id: 'user1', username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ id: 'user2', username: 'user2', email: 'user2@test.com' })
      const user3 = await createTestUser({ id: 'user3', username: 'user3', email: 'user3@test.com' })
      const conversation = await createTestConversation(user1.id)

      // Add user2 as regular member
      await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )

      // When: User2 (non-admin) tries to add user3
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user2.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user3.id, role: 'MEMBER' })
        })
      )

      expect(response.status).toBe(403)
    })

    it('should prevent adding duplicate participants', async () => {
      // Given: Two users and a conversation
      const user1 = await createTestUser({ id: 'user1', username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ id: 'user2', username: 'user2', email: 'user2@test.com' })
      const conversation = await createTestConversation(user1.id)

      // Add user2 once
      await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )

      // When: Try to add user2 again
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )

      expect(response.status).toBe(400)
    })

    it('should allow admin to add participants with different roles', async () => {
      // Given: Three users and a conversation
      const user1 = await createTestUser({ id: 'user1', username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ id: 'user2', username: 'user2', email: 'user2@test.com' })
      const user3 = await createTestUser({ id: 'user3', username: 'user3', email: 'user3@test.com' })
      const conversation = await createTestConversation(user1.id)

      // When: Add user2 as moderator and user3 as member
      const response1 = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user2.id, role: 'MODERATOR' })
        })
      )

      const response2 = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user3.id, role: 'MEMBER' })
        })
      )

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      const data1 = await response1.json()
      const data2 = await response2.json()
      
      expect(data1.participant.role).toBe('MODERATOR')
      expect(data2.participant.role).toBe('MEMBER')
    })
  })

  describe('DELETE /conversations/:id/participants/:userId', () => {
    it('should remove participant from conversation', async () => {
      // Given: Two users, a conversation, and user2 added as participant
      const user1 = await createTestUser({ id: 'user1', username: 'user1', email: 'user1@test.com' })
      const user2 = await createTestUser({ id: 'user2', username: 'user2', email: 'user2@test.com' })
      const conversation = await createTestConversation(user1.id)
      
      // Add second participant first
      await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(),
          body: JSON.stringify({ userId: user2.id, role: 'MEMBER' })
        })
      )

      // When: User1 removes user2 as a participant
      const response = await app.handle(
        createAuthenticatedRequest(`http://localhost/conversations/${conversation.id}/participants/${user2.id}?userId=${user1.id}`, {
          method: 'DELETE'
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})
