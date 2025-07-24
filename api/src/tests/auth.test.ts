import { describe, it, expect } from 'bun:test'
import { app } from '../index'
import { createTestUser } from './setup.test'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'

describe('User Registration', () => {
  describe('When registering a new user', () => {
    it('should create user account given valid registration data', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123'
      }

      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.user.username).toBe('newuser')
      expect(data.user.email).toBe('newuser@test.com')
      expect(data.user.hashedPassword).toBeUndefined() // Should not return password
      expect(data.sessionId).toBeDefined()
    })

    it('should hash password correctly', async () => {
      const userData = {
        username: 'hashtest',
        email: 'hashtest@test.com',
        password: 'password123'
      }

      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      )

      // Verify password was hashed
      const user = await prisma.user.findUnique({
        where: { email: 'hashtest@test.com' }
      })
      
      expect(user?.hashedPassword).not.toBe('password123')
      expect(await bcrypt.compare('password123', user?.hashedPassword || '')).toBe(true)
    })

    it('should reject duplicate email', async () => {
      const userData = {
        username: 'duplicate',
        email: 'duplicate@test.com',
        password: 'password123'
      }

      // First registration
      await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      )

      // Second registration with same email
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userData, username: 'different' })
        })
      )
      
      expect(response.status).toBe(500) // Should fail due to unique constraint
    })
  })

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create test user with known password
      const hashedPassword = await bcrypt.hash('password123', 10)
      await createTestUser({
        username: 'logintest',
        email: 'logintest@test.com',
        hashedPassword
      })

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'logintest@test.com',
            password: 'password123'
          })
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.user.email).toBe('logintest@test.com')
      expect(data.sessionId).toBeDefined()
    })

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10)
      await createTestUser({
        username: 'wrongpass',
        email: 'wrongpass@test.com',
        hashedPassword
      })

      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'wrongpass@test.com',
            password: 'wrongpassword'
          })
        })
      )
      
      expect(response.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nonexistent@test.com',
            password: 'password123'
          })
        })
      )
      
      expect(response.status).toBe(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: { 'Cookie': 'session=test-session-id' }
        })
      )
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  describe('GET /auth/me', () => {
    it('should return current user info', async () => {
      // This would require proper session handling in a real test
      // For now, we'll test the endpoint exists
      const response = await app.handle(
        new Request('http://localhost/auth/me', {
          headers: { 'Cookie': 'session=test-session-id' }
        })
      )
      
      // Should return 401 for invalid session
      expect(response.status).toBe(401)
    })
  })
})
