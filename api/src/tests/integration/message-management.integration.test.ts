import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { app } from '../../index'
import { 
  cleanupTestData, 
  generateTestData, 
  createAuthHeaders,
  delay,
  type TestUser,
  type TestConversation,
  type TestMessage
} from './setup'

describe('Message Management Integration', () => {
  let user1: TestUser
  let user2: TestUser
  let conversation: TestConversation

  beforeEach(async () => {
    await cleanupTestData()
    
    // Create test users
    const testData1 = generateTestData('msg_user1')
    const testData2 = generateTestData('msg_user2')

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

    // Create a conversation for messaging
    const conversationData = {
      title: 'Test Message Conversation',
      type: 'DIRECT' as const,
      participantIds: [user2.id]
    }

    const createConvResponse = await app.handle(
      new Request(`http://localhost/conversations?userId=${user1.id}`, {
        method: 'POST',
        headers: createAuthHeaders(user1.sessionId!),
        body: JSON.stringify(conversationData)
      })
    )

    const createdConversation = await createConvResponse.json()
    conversation = {
      id: createdConversation.conversation.id,
      title: createdConversation.conversation.title,
      type: createdConversation.conversation.type,
      participants: [user1, user2]
    }
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Complete Message Lifecycle', () => {
    it('should allow users to send, retrieve, update, and delete messages', async () => {
      // Given: User1 wants to send a message to the conversation
      const testData = generateTestData('message_flow')
      const messageData = {
        conversationId: conversation.id,
        content: testData.messageContent,
        type: 'TEXT' as const,
        authorId: user1.id
      }

      // When: User1 sends a message
      const sendMessageResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(messageData)
        })
      )

      // Then: Message should be sent successfully
      expect(sendMessageResponse.status).toBe(200)
      const sentMessage = await sendMessageResponse.json()
      expect(sentMessage.message).toBeDefined()
      expect(sentMessage.message.content).toBe(testData.messageContent)
      expect(sentMessage.message.authorId).toBe(user1.id)
      expect(sentMessage.message.conversationId).toBe(conversation.id)

      const messageId = sentMessage.message.id

      // When: User2 retrieves messages from the conversation
      const getMessagesResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&userId=${user2.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(user2.sessionId!)
        })
      )

      // Then: Should see the sent message
      expect(getMessagesResponse.status).toBe(200)
      const messagesData = await getMessagesResponse.json()
      expect(messagesData.messages).toHaveLength(1)
      expect(messagesData.messages[0].id).toBe(messageId)
      expect(messagesData.messages[0].content).toBe(testData.messageContent)

      // When: User1 updates their message
      const updatedContent = `${testData.messageContent} - Updated`
      const updateMessageResponse = await app.handle(
        new Request(`http://localhost/messages/${messageId}?userId=${user1.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify({ content: updatedContent })
        })
      )

      // Then: Message should be updated
      expect(updateMessageResponse.status).toBe(200)
      const updatedMessage = await updateMessageResponse.json()
      expect(updatedMessage.message.content).toBe(updatedContent)

      // When: User1 deletes their message
      const deleteMessageResponse = await app.handle(
        new Request(`http://localhost/messages/${messageId}?userId=${user1.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Message should be deleted
      expect(deleteMessageResponse.status).toBe(200)
      const deleteResult = await deleteMessageResponse.json()
      expect(deleteResult.success).toBe(true)

      // When: User2 tries to retrieve messages after deletion
      const getMessagesAfterDeleteResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&userId=${user2.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(user2.sessionId!)
        })
      )

      // Then: Should not see the deleted message
      expect(getMessagesAfterDeleteResponse.status).toBe(200)
      const messagesAfterDelete = await getMessagesAfterDeleteResponse.json()
      expect(messagesAfterDelete.messages).toHaveLength(0)
    })

    it('should support message replies and threading', async () => {
      // Given: User1 sends an initial message
      const testData = generateTestData('reply_flow')
      const initialMessageData = {
        conversationId: conversation.id,
        content: testData.messageContent,
        type: 'TEXT' as const,
        authorId: user1.id
      }

      const sendInitialResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(initialMessageData)
        })
      )

      expect(sendInitialResponse.status).toBe(200)
      const initialMessage = await sendInitialResponse.json()
      const initialMessageId = initialMessage.message.id

      // When: User2 replies to the initial message
      const replyData = {
        conversationId: conversation.id,
        content: `Reply to: ${testData.messageContent}`,
        type: 'TEXT' as const,
        authorId: user2.id,
        replyToId: initialMessageId
      }

      const sendReplyResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(user2.sessionId!),
          body: JSON.stringify(replyData)
        })
      )

      // Then: Reply should be sent successfully
      expect(sendReplyResponse.status).toBe(200)
      const replyMessage = await sendReplyResponse.json()
      expect(replyMessage.message.replyToId).toBe(initialMessageId)
      expect(replyMessage.message.authorId).toBe(user2.id)

      // When: User1 retrieves all messages
      const getAllMessagesResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&userId=${user1.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should see both messages with proper threading
      expect(getAllMessagesResponse.status).toBe(200)
      const allMessages = await getAllMessagesResponse.json()
      expect(allMessages.messages).toHaveLength(2)
      
      const reply = allMessages.messages.find((m: any) => m.replyToId === initialMessageId)
      expect(reply).toBeDefined()
      expect(reply.authorId).toBe(user2.id)
    })
  })

  describe('Message Search and Pagination', () => {
    it('should support message search functionality', async () => {
      // Given: Multiple messages with different content
      const testData = generateTestData('search_flow')
      const messages = [
        { content: `${testData.messageContent} - searchable keyword`, authorId: user1.id },
        { content: `${testData.messageContent} - different content`, authorId: user2.id },
        { content: `Another message with searchable keyword`, authorId: user1.id }
      ]

      // Send all messages
      for (const msgData of messages) {
        const messagePayload = {
          conversationId: conversation.id,
          content: msgData.content,
          type: 'TEXT' as const,
          authorId: msgData.authorId
        }

        const sendResponse = await app.handle(
          new Request('http://localhost/messages', {
            method: 'POST',
            headers: createAuthHeaders(msgData.authorId === user1.id ? user1.sessionId! : user2.sessionId!),
            body: JSON.stringify(messagePayload)
          })
        )
        expect(sendResponse.status).toBe(200)
        
        // Small delay to ensure message ordering
        await delay(10)
      }

      // When: User searches for messages with specific keyword
      const searchResponse = await app.handle(
        new Request(`http://localhost/messages/search?conversationId=${conversation.id}&userId=${user1.id}&query=searchable&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should return only messages containing the keyword
      expect(searchResponse.status).toBe(200)
      const searchResults = await searchResponse.json()
      expect(searchResults.messages).toHaveLength(2)
      expect(searchResults.messages.every((m: any) => m.content.includes('searchable'))).toBe(true)
    })

    it('should support message pagination', async () => {
      // Given: Multiple messages in the conversation
      const testData = generateTestData('pagination_flow')
      const messageCount = 15
      const messageIds: string[] = []

      // Send multiple messages
      for (let i = 0; i < messageCount; i++) {
        const messageData = {
          conversationId: conversation.id,
          content: `${testData.messageContent} - Message ${i + 1}`,
          type: 'TEXT' as const,
          authorId: i % 2 === 0 ? user1.id : user2.id
        }

        const sendResponse = await app.handle(
          new Request('http://localhost/messages', {
            method: 'POST',
            headers: createAuthHeaders(i % 2 === 0 ? user1.sessionId! : user2.sessionId!),
            body: JSON.stringify(messageData)
          })
        )
        
        expect(sendResponse.status).toBe(200)
        const sentMessage = await sendResponse.json()
        messageIds.push(sentMessage.message.id)
        
        // Small delay to ensure message ordering
        await delay(5)
      }

      // When: User requests first page of messages
      const firstPageResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&userId=${user1.id}&limit=5&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should return first 5 messages
      expect(firstPageResponse.status).toBe(200)
      const firstPage = await firstPageResponse.json()
      expect(firstPage.messages).toHaveLength(5)

      // When: User requests second page of messages
      const secondPageResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&userId=${user1.id}&limit=5&offset=5`, {
          method: 'GET',
          headers: createAuthHeaders(user1.sessionId!)
        })
      )

      // Then: Should return next 5 messages
      expect(secondPageResponse.status).toBe(200)
      const secondPage = await secondPageResponse.json()
      expect(secondPage.messages).toHaveLength(5)

      // Verify no overlap between pages
      const firstPageIds = firstPage.messages.map((m: any) => m.id)
      const secondPageIds = secondPage.messages.map((m: any) => m.id)
      const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id))
      expect(overlap).toHaveLength(0)
    })
  })

  describe('Message Access Control', () => {
    it('should enforce conversation participant access to messages', async () => {
      // Given: User1 sends a message in the conversation
      const testData = generateTestData('access_control')
      const messageData = {
        conversationId: conversation.id,
        content: testData.messageContent,
        type: 'TEXT' as const,
        authorId: user1.id
      }

      const sendResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(messageData)
        })
      )

      expect(sendResponse.status).toBe(200)
      const sentMessage = await sendResponse.json()
      const messageId = sentMessage.message.id

      // Create a third user who is not part of the conversation
      const testData3 = generateTestData('outsider_user')
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
      const user3 = { ...user3Data.user, sessionId: user3Data.sessionId }

      // When: User3 (not a participant) tries to access messages
      const unauthorizedAccessResponse = await app.handle(
        new Request(`http://localhost/messages?conversationId=${conversation.id}&userId=${user3.id}&limit=10&offset=0`, {
          method: 'GET',
          headers: createAuthHeaders(user3.sessionId)
        })
      )

      // Then: Should be denied access
      expect([403, 404]).toContain(unauthorizedAccessResponse.status)

      // When: User3 tries to send a message to the conversation
      const unauthorizedSendResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(user3.sessionId),
          body: JSON.stringify({
            conversationId: conversation.id,
            content: 'Unauthorized message',
            type: 'TEXT',
            authorId: user3.id
          })
        })
      )

      // Then: Should be denied access
      expect([403, 404]).toContain(unauthorizedSendResponse.status)
    })

    it('should allow only message authors to update and delete their messages', async () => {
      // Given: User1 sends a message
      const testData = generateTestData('author_control')
      const messageData = {
        conversationId: conversation.id,
        content: testData.messageContent,
        type: 'TEXT' as const,
        authorId: user1.id
      }

      const sendResponse = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify(messageData)
        })
      )

      expect(sendResponse.status).toBe(200)
      const sentMessage = await sendResponse.json()
      const messageId = sentMessage.message.id

      // When: User2 tries to update User1's message
      const unauthorizedUpdateResponse = await app.handle(
        new Request(`http://localhost/messages/${messageId}?userId=${user2.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(user2.sessionId!),
          body: JSON.stringify({ content: 'Hacked content' })
        })
      )

      // Then: Should be denied access
      expect(unauthorizedUpdateResponse.status).toBe(403)

      // When: User2 tries to delete User1's message
      const unauthorizedDeleteResponse = await app.handle(
        new Request(`http://localhost/messages/${messageId}?userId=${user2.id}`, {
          method: 'DELETE',
          headers: createAuthHeaders(user2.sessionId!)
        })
      )

      // Then: Should be denied access
      expect([403]).toContain(unauthorizedDeleteResponse.status)

      // When: User1 (the author) updates their own message
      const authorizedUpdateResponse = await app.handle(
        new Request(`http://localhost/messages/${messageId}?userId=${user1.id}`, {
          method: 'PUT',
          headers: createAuthHeaders(user1.sessionId!),
          body: JSON.stringify({ content: 'Updated by author' })
        })
      )

      // Then: Should succeed
      expect(authorizedUpdateResponse.status).toBe(200)
      const updatedMessage = await authorizedUpdateResponse.json()
      expect(updatedMessage.message.content).toBe('Updated by author')
    })
  })
})
