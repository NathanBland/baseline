// Mock for the entire auth module
// Replaces lucia with test-friendly implementations

import { mockUser, mockSession } from './prisma'

// Mock lucia that behaves predictably for tests
const mockLucia = {
  validateSession: async (sessionId: string) => {
    if (sessionId === 'mock-session-id') {
      return {
        session: {
          ...mockSession,
          fresh: false
        },
        user: mockUser
      }
    }
    
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
  
  invalidateSession: async () => undefined,
  deleteExpiredSessions: async () => undefined,
  
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

// Export the mocked lucia instance
export const lucia = mockLucia

// Mock password utilities
export const hashPassword = async (password: string): Promise<string> => {
  return `$2b$10$mock.hash.for.${password}`
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return hashedPassword === `$2b$10$mock.hash.for.${password}`
}

// Mock OIDC providers (return null since we don't need them for unit tests)
export const github = null
export const google = null
