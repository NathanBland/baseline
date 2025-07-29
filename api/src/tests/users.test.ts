import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { app } from '../index.js'
import { prisma } from '../db/index.js'

describe('Users API', () => {
  let sessionCookie: string
  let testUser: any

  beforeEach(async () => {
    // Clean up database
    await prisma.message.deleteMany()
    await prisma.conversationParticipant.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    // Create test user and session
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        hashedPassword: 'hashedpassword123'
      }
    })
    testUser = user

    // Create session
    const session = await prisma.session.create({
      data: {
        id: 'test-session-id',
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours from now
      }
    })

    sessionCookie = `session=${session.id}`
  })

  afterEach(async () => {
    await prisma.message.deleteMany()
    await prisma.conversationParticipant.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('GET /users/search', () => {
    test('should search users by username', async () => {
      // Create test users
      await prisma.user.create({
        data: {
          username: 'alice',
          email: 'alice@example.com',
          hashedPassword: 'hashedpassword123'
        }
      })

      await prisma.user.create({
        data: {
          username: 'bob',
          email: 'bob@example.com',
          hashedPassword: 'hashedpassword123'
        }
      })

      const response = await app.handle(
        new Request('http://localhost:3000/users/search?query=ali', {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.users).toHaveLength(1)
      expect(data.users[0].username).toBe('alice')
      expect(data.total).toBe(1)
      expect(data.query).toBe('ali')
    })

    test('should search users by email', async () => {
      await prisma.user.create({
        data: {
          username: 'charlie',
          email: 'charlie@example.com',
          hashedPassword: 'hashedpassword123'
        }
      })

      const response = await app.handle(
        new Request('http://localhost:3000/users/search?query=charlie@example.com', {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.users).toHaveLength(1)
      expect(data.users[0].email).toBe('charlie@example.com')
    })

    test('should return empty array when no users found', async () => {
      const response = await app.handle(
        new Request('http://localhost:3000/users/search?query=nonexistent', {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.users).toHaveLength(0)
      expect(data.total).toBe(0)
    })

    test('should require authentication', async () => {
      const response = await app.handle(
        new Request('http://localhost:3000/users/search?query=test')
      )

      expect(response.status).toBe(401)
    })

    test('should validate query parameter', async () => {
      const response = await app.handle(
        new Request('http://localhost:3000/users/search?query=', {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(422)
    })

    test('should respect limit and offset parameters', async () => {
      // Create multiple users
      for (let i = 1; i <= 5; i++) {
        await prisma.user.create({
          data: {
            username: `user${i}`,
            email: `user${i}@example.com`,
            hashedPassword: 'hashedpassword123'
          }
        })
      }

      const response = await app.handle(
        new Request('http://localhost:3000/users/search?query=user&limit=2&offset=1', {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.users).toHaveLength(2)
      expect(data.total).toBe(6)
    })
  })

  describe('GET /users/:id', () => {
    test('should get user by ID', async () => {
      const response = await app.handle(
        new Request(`http://localhost:3000/users/${testUser.id}`, {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.user.id).toBe(testUser.id)
      expect(data.user.username).toBe(testUser.username)
      expect(data.user.email).toBe(testUser.email)
    })

    test('should return 404 for non-existent user', async () => {
      const response = await app.handle(
        new Request('http://localhost:3000/users/nonexistent-id', {
          headers: {
            'Cookie': sessionCookie
          }
        })
      )

      expect(response.status).toBe(404)
    })

    test('should require authentication', async () => {
      const response = await app.handle(
        new Request(`http://localhost:3000/users/${testUser.id}`)
      )

      expect(response.status).toBe(401)
    })
  })
})
