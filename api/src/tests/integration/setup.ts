import { prisma } from '../../db'

export interface TestUser {
  id: string
  username: string
  email: string
  sessionId?: string
}

export interface TestConversation {
  id: string
  title: string
  type: 'DIRECT' | 'GROUP' | 'CHANNEL'
  participants: TestUser[]
}

export interface TestMessage {
  id: string
  content: string
  conversationId: string
  authorId: string
  replyToId?: string
}

/**
 * Clean up all test data from the database
 * This ensures each integration test starts with a clean slate
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Comprehensive global state reset for complete Given-When-Then BDD test isolation
    const { resetAllGlobalState } = await import('../__mocks__/prisma')
    resetAllGlobalState()
    
    // Delete in correct order to respect foreign key constraints
    await prisma.message.deleteMany({
      where: {
        author: {
          email: {
            endsWith: '@integration-test.com'
          }
        }
      }
    })

    await prisma.conversationParticipant.deleteMany({
      where: {
        user: {
          email: {
            endsWith: '@integration-test.com'
          }
        }
      }
    })

    await prisma.conversation.deleteMany({
      where: {
        participants: {
          some: {
            user: {
              email: {
                endsWith: '@integration-test.com'
              }
            }
          }
        }
      }
    })

    await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            endsWith: '@integration-test.com'
          }
        }
      }
    })

    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@integration-test.com'
        }
      }
    })
  } catch (error) {
    console.warn('Warning: Failed to cleanup test data:', error)
    // Don't throw - we want tests to continue even if cleanup fails
  }
}

/**
 * Create a test user directly in the database
 * This bypasses the API for setup purposes
 */
export async function createTestUserDirect(userData: {
  username: string
  email: string
  hashedPassword: string
}): Promise<TestUser> {
  const user = await prisma.user.create({
    data: userData
  })

  return {
    id: user.id,
    username: user.username,
    email: user.email
  }
}

/**
 * Generate unique test data to avoid conflicts
 */
export function generateTestData(prefix: string) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  
  return {
    username: `${prefix}_${timestamp}_${random}`,
    email: `${prefix}_${timestamp}_${random}@integration-test.com`,
    password: 'TestPassword123!',
    conversationTitle: `Test Conversation ${timestamp}`,
    messageContent: `Test message content ${timestamp}`
  }
}

/**
 * Wait for a specified amount of time
 * Useful for testing time-sensitive operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extract session ID from Set-Cookie header
 */
export function extractSessionFromResponse(response: Response): string | null {
  const setCookieHeader = response.headers.get('set-cookie')
  if (!setCookieHeader) return null
  
  const sessionMatch = setCookieHeader.match(/session=([^;]+)/)
  return sessionMatch ? sessionMatch[1] : null
}

/**
 * Create authorization headers for authenticated requests
 */
export function createAuthHeaders(sessionId: string): Record<string, string> {
  return {
    'Cookie': `session=${sessionId}`,
    'Content-Type': 'application/json'
  }
}
