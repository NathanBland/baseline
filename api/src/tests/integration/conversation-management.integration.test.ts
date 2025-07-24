import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { app } from '../../index'
import { 
  cleanupTestData, 
  generateTestData, 
  createAuthHeaders,
  type TestUser,
  type TestConversation
} from './setup'

describe('Conversation Management Integration', () => {
  let user1: TestUser
  let user2: TestUser
  let user3: TestUser

  beforeEach(async () => {
    await cleanupTestData()
    
    // Create test users for conversation scenarios
    const testData1 = generateTestData('conv_user1')
    const testData2 = generateTestData('conv_user2')
    const testData3 = generateTestData('conv_user3')

    // Register users
    const registerUser1 = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testData1.username,
          email: testData1.email,
          password: testData1.password
        })
      })
    )
    const user1Data = await registerUser1.json()
    user1 = { ...user1Data.user, sessionId: user1Data.sessionId }

    const registerUser2 = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testData2.username,
          email: testData2.email,
          password: testData2.password
        })
      })
    )
    const user2Data = await registerUser2.json()
    user2 = { ...user2Data.user, sessionId: user2Data.sessionId }

    const registerUser3 = await app.handle(
      new Request('http://localhost/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testData3.username,
          email: testData3.email,
          password: testData3.password
        })
      })
    )
    const user3Data = await registerUser3.json()
    user3 = { ...user3Data.user, sessionId: user3Data.sessionId }
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Complete Conversation Lifecycle', () => {
    it('should allow user to create, update, and manage conversation participants', async () => {
      // Given: User1 wants to create a group conversation with User2 and User3
      const testData = generateTestData('group_conv')
      const conversationData = {
        title: testData.conversationTitle,
        type: 'GROUP' as const,
        participantIds: [user2.id, user3.id]
      }

      // When: User1 creates a group conversation
      const createResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(conversationData)
        })
      )

      // Then: Conversation should be created successfully
      expect(createResponse.status).toBe(200)
      const createdConversation = await createResponse.json()
      expect(createdConversation.conversation).toBeDefined()
      expect(createdConversation.conversation.title).toBe(testData.conversationTitle)
      expect(createdConversation.conversation.type).toBe('GROUP')
      expect(createdConversation.conversation.participants).toHaveLength(3) // Creator + 2 participants

      const conversationId = createdConversation.conversation.id

      // When: User1 retrieves their conversations
      const getConversationsResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${user1.id}`, {
          method: 'GET',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should see the created conversation
      expect(getConversationsResponse.status).toBe(200)
      const conversationsData = await getConversationsResponse.json()
      expect(conversationsData.conversations).toHaveLength(1)
      expect(conversationsData.conversations[0].id).toBe(conversationId)

      // When: User1 updates the conversation title
      const updatedTitle = `${testData.conversationTitle} - Updated`
      const updateResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user1.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify({ title: updatedTitle })
        })
      )

      // Then: Conversation should be updated
      expect(updateResponse.status).toBe(200)
      const updatedConversation = await updateResponse.json()
      expect(updatedConversation.conversation.title).toBe(updatedTitle)

      // When: User2 retrieves the conversation (as a participant)
      const getConversationResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user2.id}`, {
          method: 'GET',
          headers: createAuthHeaders(user2.sessionId!)
        })
      )

      // Then: User2 should be able to access the conversation
      expect(getConversationResponse.status).toBe(200)
      const conversationDetails = await getConversationResponse.json()
      expect(conversationDetails.conversation.title).toBe(updatedTitle)
      expect(conversationDetails.conversation.participants.some((p: any) => p.userId === user2.id)).toBe(true)
    })

    it('should allow conversation admin to add and remove participants', async () => {
      // Given: User1 creates a direct conversation with User2
      const testData = generateTestData('direct_conv')
      const conversationData = {
        title: testData.conversationTitle,
        type: 'DIRECT' as const,
        participantIds: [user2.id]
      }

      const createResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(conversationData)
        })
      )

      expect(createResponse.status).toBe(200)
      const createdConversation = await createResponse.json()
      const conversationId = createdConversation.conversation.id

      // When: User1 (admin) adds User3 to the conversation
      const addParticipantData = {
        userId: user3.id,
        role: 'MEMBER' as const
      }

      const addParticipantResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}/participants?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(addParticipantData)
        })
      )

      // Then: Participant should be added successfully
      expect(addParticipantResponse.status).toBe(200)
      const addedParticipant = await addParticipantResponse.json()
      expect(addedParticipant.participant.userId).toBe(user3.id)

      // When: User1 removes User2 from the conversation
      const removeParticipantResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}/participants/${user2.id}?userId=${user1.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Participant should be removed successfully
      expect(removeParticipantResponse.status).toBe(200)
      const removeResult = await removeParticipantResponse.json()
      expect(removeResult.success).toBe(true)

      // When: User2 tries to access the conversation after being removed
      const accessAfterRemovalResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user2.id}`, {
          method: 'GET',
          headers: createAuthHeaders(user2.sessionId!)
        })
      )

      // Then: Should be denied access
      expect([403, 404]).toContain(accessAfterRemovalResponse.status)
    })
  })

  describe('Conversation Access Control', () => {
    it('should enforce participant-only access to conversations', async () => {
      // Given: User1 creates a private conversation with User2
      const testData = generateTestData('private_conv')
      const conversationData = {
        title: testData.conversationTitle,
        type: 'DIRECT' as const,
        participantIds: [user2.id]
      }

      const createResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(conversationData)
        })
      )

      expect(createResponse.status).toBe(200)
      const createdConversation = await createResponse.json()
      const conversationId = createdConversation.conversation.id

      // When: User3 (not a participant) tries to access the conversation
      const unauthorizedAccessResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user3.id}`, {
          method: 'GET',
          headers: createAuthHeaders(user3.sessionId!)
        })
      )

      // Then: Should be denied access
      expect([403, 404]).toContain(unauthorizedAccessResponse.status)

      // When: User3 tries to update the conversation
      const unauthorizedUpdateResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user3.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(user3.sessionId!),
          body: JSON.stringify({ title: 'Hacked Title' })
        })
      )

      // Then: Should be denied access
      expect([403, 404]).toContain(unauthorizedUpdateResponse.status)
    })

    it('should allow conversation deletion only by admin', async () => {
      // Given: User1 creates a conversation with User2
      const testData = generateTestData('delete_conv')
      const conversationData = {
        title: testData.conversationTitle,
        type: 'GROUP' as const,
        participantIds: [user2.id]
      }

      const createResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${user1.id}`, {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(conversationData)
        })
      )

      expect(createResponse.status).toBe(200)
      const createdConversation = await createResponse.json()
      const conversationId = createdConversation.conversation.id

      // When: User2 (non-admin participant) tries to delete the conversation
      const unauthorizedDeleteResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user2.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(user2.sessionId!)
        })
      )

      // Then: Should be denied access
      expect(unauthorizedDeleteResponse.status).toBe(403)

      // When: User1 (admin) deletes the conversation
      const authorizedDeleteResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user1.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should succeed
      expect(authorizedDeleteResponse.status).toBe(200)
      const deleteResult = await authorizedDeleteResponse.json()
      expect(deleteResult.success).toBe(true)

      // When: Anyone tries to access the deleted conversation
      const accessDeletedResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${user1.id}`, {
          method: 'GET',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should not be found
      expect([404]).toContain(accessDeletedResponse.status)
    })
  })
})
