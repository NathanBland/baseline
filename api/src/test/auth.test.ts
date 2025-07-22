import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '../db/index.js'
import { hashPassword } from '../auth/index.js'
import app from '../index.js'

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clean up users before each test
    await prisma.user.deleteMany()
  })

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      }

      const response = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.message).toBe('User registered successfully')
      expect(result.user.email).toBe(userData.email)
      expect(result.user.username).toBe(userData.username)

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      expect(user).toBeTruthy()
      expect(user?.hashedPassword).toBeTruthy()
    })

    it('should reject registration with duplicate email', async () => {
      // Create existing user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'existinguser',
          hashedPassword: await hashPassword('password123')
        }
      })

      const userData = {
        email: 'test@example.com',
        username: 'newuser',
        password: 'password123'
      }

      const response = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('User already exists')
    })

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'ab', // too short
        password: '123' // too short
      }

      const response = await app.handle(
        new Request('http://localhost/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidData)
        })
      )

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          username: 'testuser',
          hashedPassword: await hashPassword('password123')
        }
      })
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const response = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.message).toBe('Login successful')
      expect(result.user.email).toBe(loginData.email)
    })

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const response = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Invalid credentials')
    })
  })
})
