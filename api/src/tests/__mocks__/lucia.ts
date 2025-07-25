// Mock for Lucia authentication library
// Provides predictable behavior for unit tests without database dependencies

import { mockUser, mockSession } from './prisma'

// Mock lucia instance that returns predictable test data
export const lucia = {
  validateSession: async (sessionId: string) => {
    // Return valid session for our test session ID
    if (sessionId === 'mock-session-id') {
      return {
        session: {
          ...mockSession,
          fresh: false
        },
        user: mockUser
      }
    }
    
    // Return null for invalid sessions
    return {
      session: null,
      user: null
    }
  },
  
  createSession: async (userId: string, attributes: any = {}) => {
    return {
      ...mockSession,
      userId,
      ...attributes
    }
  },
  
  invalidateSession: async (sessionId: string) => {
    return undefined
  },
  
  deleteExpiredSessions: async () => {
    return undefined
  },
  
  readSessionCookie: (cookieHeader: string) => {
    // Extract session ID from cookie header
    const match = cookieHeader.match(/session=([^;]+)/)
    return match ? match[1] : null
  },
  
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
}

// Export mock password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return `$2b$10$mock.hash.for.${password}`
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return hashedPassword === `$2b$10$mock.hash.for.${password}`
}
