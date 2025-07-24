import { beforeAll, afterAll, beforeEach } from 'bun:test'
import { mockPrisma, mockUser, mockConversation, mockMessage } from './__mocks__/prisma'

// Mock the prisma import for all tests
// Note: This approach may need adjustment for Bun's module system

// Test setup - no database cleanup needed with mocks
beforeAll(async () => {
  // Mock setup complete
})

afterAll(async () => {
  // No cleanup needed with mocks
})

beforeEach(async () => {
  // No database cleanup needed with mocks - they return consistent data
})

// Test utilities using mocked data
export const createTestUser = async (overrides: any = {}) => {
  return {
    ...mockUser,
    ...overrides
  }
}

export const createTestConversation = async (userId: string, overrides: any = {}) => {
  return {
    ...mockConversation,
    ...overrides
  }
}

export const createTestMessage = async (conversationId: string, authorId: string, overrides: any = {}) => {
  return {
    ...mockMessage,
    conversationId,
    authorId,
    ...overrides
  }
}

// Export mocked prisma for use in tests
export { mockPrisma as prisma }
