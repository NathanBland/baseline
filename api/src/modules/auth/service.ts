import { status } from 'elysia'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db'
import { lucia } from '../../auth'
import type { AuthModel } from './model'

export abstract class AuthService {
  static async register({ username, email, password }: AuthModel.RegisterBody): Promise<AuthModel.RegisterResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        throw status(409, 'User with this email already exists')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          hashedPassword
        }
      })

      // Create session
      const session = await lucia.createSession(user.id, {})

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        sessionId: session.id
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors (they have code and response properties)
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      // Handle Prisma unique constraint violations
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw status(409, 'User with this email already exists')
      }
      console.error('Registration error:', error)
      throw status(500, 'Internal server error during registration')
    }
  }

  static async login({ email, password }: AuthModel.LoginBody): Promise<AuthModel.LoginResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user || !user.hashedPassword) {
        throw status(401, 'Invalid email or password')
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.hashedPassword)
      if (!isValidPassword) {
        throw status(401, 'Invalid email or password')
      }

      // Create session
      const session = await lucia.createSession(user.id, {})

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        sessionId: session.id
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Login error:', error)
      throw status(500, 'Internal server error during login')
    }
  }

  static async logout(sessionId: string): Promise<{ success: boolean }> {
    try {
      await lucia.invalidateSession(sessionId)
      return { success: true }
    } catch (error) {
      throw status(500, 'Internal server error during logout')
    }
  }

  static async getCurrentUser(sessionId: string): Promise<AuthModel.UserProfile> {
    try {
      const { session, user } = await lucia.validateSession(sessionId)
      
      if (!session || !user) {
        throw status(401, 'Invalid session')
      }

      const fullUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      if (!fullUser) {
        throw status(401, 'User not found')
      }

      return {
        user: {
          id: fullUser.id,
          username: fullUser.username,
          email: fullUser.email,
          createdAt: fullUser.createdAt,
          updatedAt: fullUser.updatedAt
        }
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Get current user error:', error)
      throw status(500, 'Internal server error')
    }
  }

  static async validateSession(sessionId: string): Promise<{ user: any; session: any } | null> {
    try {
      const result = await lucia.validateSession(sessionId)
      return result.session ? result : null
    } catch (error) {
      return null
    }
  }
}
