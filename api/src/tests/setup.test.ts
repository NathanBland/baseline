import { beforeAll, afterAll, beforeEach } from 'bun:test'
import { mockPrisma, mockUser, mockConversation, mockMessage, resetMockState } from './__mocks__/prisma'
import { app } from '../index'

// Mock the prisma import for all tests
// Note: This approach may need adjustment for Bun's module system

// Mock lucia and Prisma using Bun's module system
// This ensures the auth and db modules import our mocks instead of the real implementations
import { mock } from 'bun:test'

// IMPORTANT: Global mocking removed to prevent interference with integration tests
// Unit tests now use setupUnitTestMocks() to apply mocking only when needed
// Integration tests use the real database and auth implementations for true end-to-end testing

// Unit test mocking setup function - call this only in unit test files
export function setupUnitTestMocks() {
  // Mock the db module to use our test-friendly Prisma implementation
  mock.module('../db/index.ts', () => {
    const { mockPrisma } = require('./__mocks__/prisma')
    return {
      prisma: mockPrisma,
      initializeDatabase: async () => {
        console.log('✅ Connected to PostgreSQL database')
      },
      closeDatabaseConnection: async () => undefined
    }
  })

  // Mock the auth module to use our test-friendly lucia implementation
  mock.module('../auth/index.ts', () => {
    return {
      lucia: {
        validateSession: async (sessionId: string) => {
          if (sessionId === 'mock-session-id') {
            return {
              session: {
                id: 'mock-session-id',
                userId: 'user1',
                fresh: false,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
              },
              user: {
                id: 'user1',
                username: 'testuser',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                avatar: null,
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          }
          return { session: null, user: null }
        },
        createSession: async (userId: string) => ({
          id: 'mock-session-id',
          userId,
          fresh: true,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
        }),
        invalidateSession: async () => undefined,
        createSessionCookie: (sessionId: string) => ({
          name: 'session',
          value: sessionId,
          attributes: {
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: false,
            path: '/'
          }
        }),
        createBlankSessionCookie: () => ({
          name: 'session',
          value: '',
          attributes: {
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: false,
            path: '/',
            maxAge: 0
          }
        })
      },
      hashPassword: async (password: string) => `$2b$10$mock.hash.for.${password}`,
      verifyPassword: async (password: string, hashedPassword: string) => 
        hashedPassword === `$2b$10$mock.hash.for.${password}`,
      github: null,
      google: null
    }
  })
}

// Test setup - no database cleanup needed with mocks
beforeAll(async () => {
  // Mock setup complete
})

afterAll(async () => {
  // No cleanup needed with mocks
})

beforeEach(async () => {
  // Reset mock state before each test to prevent state pollution
  resetMockState()
})

// Mock session data for authentication
export const mockSession = {
  id: 'mock-session-id',
  userId: 'mock-user-id',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
  createdAt: new Date(),
  updatedAt: new Date()
}

// Test utilities using mocked data
export const createTestUser = async (overrides: any = {}) => {
  // Call the Prisma mock's create method to ensure user tracking works
  // Generate unique user ID per test to prevent ID collision
  const uniqueUserId = overrides.id || `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const userData = {
    ...mockUser,
    id: uniqueUserId,
    ...overrides
  }
  
  // Actually create the user in the mock database for proper BDD testing
  return await mockPrisma.user.create({ data: userData })
}

export const createTestConversation = async (userId: string, overrides: any = {}) => {
  // Call the Prisma mock's create method to ensure conversation tracking works
  // Generate unique conversation ID per test to prevent ID collision
  const uniqueConversationId = overrides.id || `test-conversation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const conversationData = {
    ...overrides,
    id: uniqueConversationId,
    // Set up participants as an array to match our mock structure
    participants: [{
      id: `participant-${userId}`,
      userId,
      conversationId: uniqueConversationId,
      role: 'ADMIN',
      joinedAt: new Date(),
      user: await createTestUser({ id: userId })
    }]
  }
  
  return await mockPrisma.conversation.create({ data: conversationData })
}

export const createTestMessage = async (conversationId: string, authorId: string, overrides: any = {}) => {
  // Call the Prisma mock's create method to ensure message tracking works
  const messageData = {
    conversationId,
    authorId,
    content: 'Test message content', // Provide default content for validation
    ...overrides
  }
  
  return await mockPrisma.message.create({ data: messageData })
}

// Authentication utilities for unit tests
export const createAuthenticatedRequest = (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers)
  headers.set('Cookie', `session=${mockSession.id}`)
  
  return new Request(url, {
    ...options,
    headers
  })
}

export const loginAndGetSessionCookie = async (): Promise<string> => {
  // Mock login that returns session cookie for testing
  const response = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: mockUser.email,
        password: 'password123'
      })
    })
  )
  
  const setCookie = response.headers.get('Set-Cookie')
  if (setCookie) {
    const match = setCookie.match(/session=([^;]+)/)
    return match ? match[1] : 'mock-session-id'
  }
  return 'mock-session-id'
}

export const createAuthHeaders = (sessionId: string = mockSession.id): Record<string, string> => {
  return {
    'Cookie': `session=${sessionId}`,
    'Content-Type': 'application/json'
  }
}

// Export mocked prisma for use in tests
export { mockPrisma as prisma }
