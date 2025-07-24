import { describe, it, expect } from 'bun:test'
import { app } from '../index'

describe('Request Validation', () => {
  describe('When validating conversation requests', () => {
    it('should reject conversation creation given missing request body', async () => {
      // Given: A conversation creation request without body
      // When: The conversation endpoint is called without body
      const response = await app.handle(
        new Request('http://localhost/conversations?userId=test-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
          // No body provided
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject conversation creation given invalid JSON', async () => {
      // Given: A conversation creation request with malformed JSON
      // When: The conversation endpoint is called with invalid JSON
      const response = await app.handle(
        new Request('http://localhost/conversations?userId=test-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid json }'
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject conversation creation given missing required fields', async () => {
      // Given: A conversation creation request with missing required fields
      const incompleteData = {
        title: 'Test Conversation'
        // Missing type and participantIds
      }

      // When: The conversation endpoint is called with incomplete data
      const response = await app.handle(
        new Request('http://localhost/conversations?userId=test-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteData)
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject conversation access given missing userId parameter', async () => {
      // Given: A conversation request without required userId parameter
      // When: The conversation endpoint is called without userId
      const response = await app.handle(
        new Request('http://localhost/conversations', {
          method: 'GET'
          // Missing userId query parameter
        })
      )

      // Then: Should reject the request
      expect([400, 422]).toContain(response.status)
    })
  })

  describe('When validating message requests', () => {
    it('should reject message creation given missing request body', async () => {
      // Given: A message creation request without body
      // When: The message endpoint is called without body
      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
          // No body provided
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject message creation given invalid message content', async () => {
      // Given: A message creation request with invalid content
      const invalidMessageData = {
        conversationId: 'test-conversation',
        content: '', // Empty content
        authorId: 'test-user'
      }

      // When: The message endpoint is called with invalid content
      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidMessageData)
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject message retrieval given missing conversationId', async () => {
      // Given: A message retrieval request without conversationId
      // When: The messages endpoint is called without conversationId
      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'GET'
          // Missing conversationId query parameter
        })
      )

      // Then: Should reject the request
      expect([400, 422]).toContain(response.status)
    })
  })

  describe('When validating authentication requests', () => {
    it('should reject registration given missing required fields', async () => {
      // Given: A registration request with missing fields
      const incompleteData = {
        username: 'testuser'
        // Missing email and password
      }

      // When: The registration endpoint is called with incomplete data
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteData)
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject registration given invalid email format', async () => {
      // Given: A registration request with invalid email format
      const invalidEmailData = {
        username: 'testuser',
        email: 'not-an-email',
        password: 'validPassword123'
      }

      // When: The registration endpoint is called with invalid email
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidEmailData)
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })

    it('should reject registration given password too short', async () => {
      // Given: A registration request with password too short
      const shortPasswordData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Too short
      }

      // When: The registration endpoint is called with short password
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shortPasswordData)
        })
      )

      // Then: Should reject the request with validation error
      expect([400, 422]).toContain(response.status)
    })
  })

  describe('When validating HTTP methods', () => {
    it('should reject unsupported HTTP methods given invalid method', async () => {
      // Given: A request with unsupported HTTP method
      // When: An endpoint is called with unsupported method (e.g., PATCH on root)
      const response = await app.handle(
        new Request('http://localhost/', {
          method: 'PATCH'
        })
      )

      // Then: Should reject the request
      expect([405, 404]).toContain(response.status)
    })

    it('should reject DELETE on read-only endpoints given DELETE method', async () => {
      // Given: A DELETE request to a read-only endpoint
      // When: The health endpoint is called with DELETE method
      const response = await app.handle(
        new Request('http://localhost/health', {
          method: 'DELETE'
        })
      )

      // Then: Should reject the request
      expect([405, 404]).toContain(response.status)
    })
  })
})
