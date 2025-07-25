import { describe, it, expect } from 'bun:test'
import { app } from '../../index'

describe('Endpoint Validation', () => {
  describe('Conversations Validation', () => {
    it('should handle missing query parameters', async () => {
      const response = await app.handle(
        new Request('http://localhost/conversations')
      )
      
      // Should return validation error (422) not server error (500)
      expect(response.status).toBe(422)
    })

    it('should handle missing body in POST requests', async () => {
      const response = await app.handle(
        new Request('http://localhost/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      expect(response.status).toBe(400)
    })

    it('should handle invalid JSON in POST requests', async () => {
      const response = await app.handle(
        new Request('http://localhost/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json'
        })
      )
      
      expect(response.status).toBe(400)
    })
  })

  describe('Messages Validation', () => {
    it('should handle missing query parameters', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages')
      )
      
      expect(response.status).toBe(422)
    })

    it('should handle missing body in POST requests', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
      
      expect(response.status).toBe(400)
    })

    it('should handle invalid message content', async () => {
      const response = await app.handle(
        new Request('http://localhost/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '', // Empty content should be invalid
            conversationId: 'test-id'
          })
        })
      )
      
      expect(response.status).toBe(422)
    })
  })

  describe('Auth Validation', () => {
    it('should handle missing registration fields', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'test'
            // Missing email and password
          })
        })
      )
      
      expect(response.status).toBe(422)
    })

    it('should handle invalid email format', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'test',
            email: 'invalid-email',
            password: 'password123'
          })
        })
      )
      
      expect(response.status).toBe(422)
    })

    it('should handle short password', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'test',
            email: 'test@example.com',
            password: '123' // Too short
          })
        })
      )
      
      expect(response.status).toBe(422)
    })
  })
})
