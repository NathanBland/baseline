import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { app } from '../../index'
import { 
  cleanupTestData, 
  generateTestData, 
  createAuthHeaders,
  delay,
  type TestUser
} from './setup'

describe('Complete User Journey Integration', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Full Application Workflow', () => {
    it('should support complete user journey from registration to messaging', async () => {
      // === PHASE 1: USER REGISTRATION ===
      
      // Given: Two new users want to use the application
      const alice = generateTestData('alice')
      const bob = generateTestData('bob')

      // When: Alice registers for an account
      const aliceRegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: alice.username,
            email: alice.email,
            password: alice.password
          })
        })
      )

      // Then: Alice's registration should succeed
      expect(aliceRegisterResponse.status).toBe(200)
      const aliceData = await aliceRegisterResponse.json()
      const aliceUser: TestUser = { 
        ...aliceData.user, 
        sessionId: aliceData.sessionId 
      }

      // When: Bob registers for an account
      const bobRegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: bob.username,
            email: bob.email,
            password: bob.password
          })
        })
      )

      // Then: Bob's registration should succeed
      expect(bobRegisterResponse.status).toBe(200)
      const bobData = await bobRegisterResponse.json()
      const bobUser: TestUser = { 
        ...bobData.user, 
        sessionId: bobData.sessionId 
      }

      // === PHASE 2: CONVERSATION CREATION ===

      // When: Alice creates a direct conversation with Bob
      const conversationData = {
        title: 'Alice and Bob Chat',
        type: 'DIRECT' as const,
        participantIds: [bobUser.id]
      }

      const createConversationResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${aliceUser.id}`, {
          method: 'POST',
          headers: createAuthHeaders(aliceUser.sessionId!),
          body: JSON.stringify(conversationData)
        })
      )

      // Then: Conversation should be created successfully
      expect(createConversationResponse.status).toBe(200)
      const conversationResult = await createConversationResponse.json()
      const conversationId = conversationResult.conversation.id

      // === PHASE 3: MESSAGE EXCHANGE ===

      // When: Alice sends the first message
      const aliceMessage1 = {
        conversationId,
        content: 'Hi Bob! How are you doing?',
        type: 'TEXT' as const,
        authorId: aliceUser.id
      }

      const aliceMessage1Response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(aliceUser.sessionId!),
          body: JSON.stringify(aliceMessage1)
        })
      )

      // Then: Message should be sent successfully
      expect(aliceMessage1Response.status).toBe(200)
      const aliceMessage1Result = await aliceMessage1Response.json()
      const aliceMessage1Id = aliceMessage1Result.message.id

      await delay(10) // Ensure message ordering

      // When: Bob retrieves messages and sees Alice's message
      const bobGetMessagesResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversationId}&userId=${bobUser.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(bobUser.sessionId!)
        })
      )

      // Then: Bob should see Alice's message
      expect(bobGetMessagesResponse.status).toBe(200)
      const bobMessages = await bobGetMessagesResponse.json()
      expect(bobMessages.messages).toHaveLength(1)
      expect(bobMessages.messages[0].content).toBe('Hi Bob! How are you doing?')
      expect(bobMessages.messages[0].authorId).toBe(aliceUser.id)

      // When: Bob replies to Alice
      const bobReply = {
        conversationId,
        content: 'Hi Alice! I\'m doing great, thanks for asking!',
        type: 'TEXT' as const,
        authorId: bobUser.id,
        replyToId: aliceMessage1Id
      }

      const bobReplyResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(bobUser.sessionId!),
          body: JSON.stringify(bobReply)
        })
      )

      // Then: Bob's reply should be sent successfully
      expect(bobReplyResponse.status).toBe(200)
      const bobReplyResult = await bobReplyResponse.json()
      expect(bobReplyResult.message.replyToId).toBe(aliceMessage1Id)

      await delay(10) // Ensure message ordering

      // === PHASE 4: CONVERSATION MANAGEMENT ===

      // When: Alice retrieves the updated conversation
      const aliceGetConversationResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${aliceUser.id}`, {
          method: 'GET',
          headers: createAuthHeaders(aliceUser.sessionId!)
        })
      )

      // Then: Alice should see the conversation with both participants
      expect(aliceGetConversationResponse.status).toBe(200)
      const conversationDetails = await aliceGetConversationResponse.json()
      expect(conversationDetails.conversation.participants).toHaveLength(2)
      expect(conversationDetails.conversation.participants.some((p: any) => p.userId === aliceUser.id)).toBe(true)
      expect(conversationDetails.conversation.participants.some((p: any) => p.userId === bobUser.id)).toBe(true)

      // When: Alice updates the conversation title
      const updatedTitle = 'Alice and Bob - Updated Chat'
      const updateConversationResponse = await app.handle(
        new Request(`http://localhost/conversations/${conversationId}?userId=${aliceUser.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(aliceUser.sessionId!),
          body: JSON.stringify({ title: updatedTitle })
        })
      )

      // Then: Conversation should be updated
      expect(updateConversationResponse.status).toBe(200)
      const updatedConversation = await updateConversationResponse.json()
      expect(updatedConversation.conversation.title).toBe(updatedTitle)

      // === PHASE 5: MESSAGE SEARCH AND HISTORY ===

      // When: Alice sends another message
      const aliceMessage2 = {
        conversationId,
        content: 'That\'s wonderful to hear! Let\'s catch up soon.',
        type: 'TEXT' as const,
        authorId: aliceUser.id
      }

      const aliceMessage2Response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(aliceUser.sessionId!),
          body: JSON.stringify(aliceMessage2)
        })
      )

      expect(aliceMessage2Response.status).toBe(200)

      await delay(10) // Ensure message ordering

      // When: Alice searches for messages containing "wonderful"
      const searchResponse = await app.handle(
        new Request(`http://localhost/messages/search?conversationId=${conversationId}&userId=${aliceUser.id}&query=wonderful&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(aliceUser.sessionId!)
        })
      )

      // Then: Should find Alice's second message
      expect(searchResponse.status).toBe(200)
      const searchResults = await searchResponse.json()
      expect(searchResults.messages).toHaveLength(1)
      expect(searchResults.messages[0].content).toContain('wonderful')

      // When: Bob retrieves all messages in the conversation
      const allMessagesResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversationId}&userId=${bobUser.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(bobUser.sessionId!)
        })
      )

      // Then: Should see all 3 messages in chronological order
      expect(allMessagesResponse.status).toBe(200)
      const allMessages = await allMessagesResponse.json()
      expect(allMessages.messages).toHaveLength(3)

      // === PHASE 6: USER SESSION MANAGEMENT ===

      // When: Alice checks her profile
      const aliceProfileResponse = await app.handle(
        new Request('http://localhost/auth/me', {
          method: 'GET',
          headers: createAuthHeaders(aliceUser.sessionId!)
        })
      )

      // Then: Should return Alice's profile information
      expect(aliceProfileResponse.status).toBe(200)
      const aliceProfile = await aliceProfileResponse.json()
      expect(aliceProfile.user.username).toBe(alice.username)
      expect(aliceProfile.user.email).toBe(alice.email)

      // When: Alice logs out
      const aliceLogoutResponse = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: createAuthHeaders(aliceUser.sessionId!)
        })
      )

      // Then: Logout should succeed
      expect(aliceLogoutResponse.status).toBe(200)
      const logoutResult = await aliceLogoutResponse.json()
      expect(logoutResult.success).toBe(true)

      // When: Alice tries to access messages after logout
      const unauthorizedAccessResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversationId}&userId=${aliceUser.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(aliceUser.sessionId!)
        })
      )

      // Then: Should be unauthorized
      expect(unauthorizedAccessResponse.status).toBe(401)

      // === PHASE 7: RE-AUTHENTICATION ===

      // When: Alice logs back in
      const aliceLoginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: alice.email,
            password: alice.password
          })
        })
      )

      // Then: Login should succeed
      expect(aliceLoginResponse.status).toBe(200)
      const aliceLoginResult = await aliceLoginResponse.json()
      const newAliceSessionId = aliceLoginResult.sessionId

      // When: Alice accesses her conversations with new session
      const aliceConversationsResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${aliceUser.id}`, {
          method: 'GET',
          headers: createAuthHeaders(newAliceSessionId)
        })
      )

      // Then: Should see her conversation with Bob
      expect(aliceConversationsResponse.status).toBe(200)
      const aliceConversations = await aliceConversationsResponse.json()
      expect(aliceConversations.conversations).toHaveLength(1)
      expect(aliceConversations.conversations[0].id).toBe(conversationId)
      expect(aliceConversations.conversations[0].title).toBe(updatedTitle)

      // === VERIFICATION: Complete workflow succeeded ===
      console.log('✅ Complete user journey test passed - all phases successful')
    })
  })

  describe('Multi-User Group Conversation Workflow', () => {
    it('should support group conversations with multiple participants', async () => {
      // Given: Three users register for the application
      const alice = generateTestData('group_alice')
      const bob = generateTestData('group_bob')
      const charlie = generateTestData('group_charlie')

      const users = []
      
      for (const userData of [alice, bob, charlie]) {
        const registerResponse = await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: userData.username,
              email: userData.email,
              password: userData.password
            })
          })
        )

        expect(registerResponse.status).toBe(200)
        const data = await registerResponse.json()
        users.push({ ...data.user, sessionId: data.sessionId })
      }

      const [aliceUser, bobUser, charlieUser] = users

      // When: Alice creates a group conversation with Bob and Charlie
      const groupConversationData = {
        title: 'Team Discussion',
        type: 'GROUP' as const,
        participantIds: [bobUser.id, charlieUser.id]
      }

      const createGroupResponse = await app.handle(
        new Request(`http://localhost/conversations?userId=${aliceUser.id}`, {
          method: 'POST',
          headers: createAuthHeaders(aliceUser.sessionId),
          body: JSON.stringify(groupConversationData)
        })
      )

      // Then: Group conversation should be created
      expect(createGroupResponse.status).toBe(200)
      const groupConversation = await createGroupResponse.json()
      const groupId = groupConversation.conversation.id

      // When: Each user sends a message to the group
      const messages = [
        { user: aliceUser, content: 'Welcome to our team discussion!' },
        { user: bobUser, content: 'Thanks Alice! Excited to collaborate.' },
        { user: charlieUser, content: 'Great to be part of the team!' }
      ]

      for (const { user, content } of messages) {
        const messageData = {
          conversationId: groupId,
          content,
          type: 'TEXT' as const,
          authorId: user.id
        }

        const sendResponse = await app.handle(
          new Request('http://localhost/messages', {
            method: 'POST',
            headers: createAuthHeaders(user.sessionId),
            body: JSON.stringify(messageData)
          })
        )

        expect(sendResponse.status).toBe(200)
        await delay(10) // Ensure message ordering
      }

      // When: Bob retrieves all messages from the group
      const groupMessagesResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${groupId}&userId=${bobUser.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(bobUser.sessionId)
        })
      )

      // Then: Should see all messages from all participants
      expect(groupMessagesResponse.status).toBe(200)
      const groupMessages = await groupMessagesResponse.json()
      expect(groupMessages.messages).toHaveLength(3)

      // Verify each user's message is present
      const messageAuthors = groupMessages.messages.map((m: any) => m.authorId)
      expect(messageAuthors).toContain(aliceUser.id)
      expect(messageAuthors).toContain(bobUser.id)
      expect(messageAuthors).toContain(charlieUser.id)

      // When: Alice adds a fourth user to the group
      const david = generateTestData('group_david')
      const davidRegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: david.username,
            email: david.email,
            password: david.password
          })
        })
      )

      expect(davidRegisterResponse.status).toBe(200)
      const davidData = await davidRegisterResponse.json()
      const davidUser = { ...davidData.user, sessionId: davidData.sessionId }

      const addParticipantResponse = await app.handle(
        new Request(`http://localhost/conversations/${groupId}/participants?userId=${aliceUser.id}`, {
          method: 'POST',
          headers: createAuthHeaders(aliceUser.sessionId),
          body: JSON.stringify({
            userId: davidUser.id,
            role: 'MEMBER'
          })
        })
      )

      // Then: David should be added to the group
      expect(addParticipantResponse.status).toBe(200)

      // When: David retrieves the conversation
      const davidConversationResponse = await app.handle(
        new Request(`http://localhost/conversations/${groupId}?userId=${davidUser.id}`, {
          method: 'GET',
          headers: createAuthHeaders(davidUser.sessionId)
        })
      )

      // Then: David should have access to the group conversation
      expect(davidConversationResponse.status).toBe(200)
      const davidConversation = await davidConversationResponse.json()
      expect(davidConversation.conversation.participants).toHaveLength(4)

      console.log('✅ Multi-user group conversation workflow test passed')
    })
  })
})
