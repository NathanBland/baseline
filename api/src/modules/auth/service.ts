import { status } from 'elysia'
import bcrypt from 'bcryptjs'
import { prisma } from '../../db'
import { lucia } from '../../auth'
import { JwtService } from '../../auth/jwt'
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

      // Generate JWT tokens
      const [accessToken, refreshToken] = await Promise.all([
        JwtService.generateToken(user.id, session.id, 'access'),
        JwtService.generateToken(user.id, session.id, 'refresh')
      ])

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        sessionId: session.id,
        token: accessToken,
        refreshToken
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

      // Generate JWT tokens
      const [accessToken, refreshToken] = await Promise.all([
        JwtService.generateToken(user.id, session.id, 'access'),
        JwtService.generateToken(user.id, session.id, 'refresh')
      ])

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        sessionId: session.id,
        token: accessToken,
        refreshToken
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

  static async logout(sessionId: string): Promise<void> {
    await lucia.invalidateSession(sessionId)
  }

  static async getCurrentUser(sessionId: string): Promise<AuthModel.UserProfile> {
    try {
      const { user } = await lucia.validateSession(sessionId)
      
      if (!user) {
        throw status(401, 'Invalid session')
      }

      // Fetch full user details from database
      const fullUser = await prisma.user.findUnique({
        where: { id: user.id }
      })

      if (!fullUser) {
        throw status(401, 'User not found')
      }

      return {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        avatar: fullUser.avatar,
        emailVerified: fullUser.emailVerified,
        createdAt: fullUser.createdAt
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

  static async createOrUpdateUserFromOIDC(userInfo: any): Promise<AuthModel.UserProfile> {
    const { sub, email, name, preferred_username, given_name, family_name, picture } = userInfo

    if (!email) {
      throw status(400, 'Email is required from OIDC provider')
    }

    // Generate username from email or preferred username
    const username = preferred_username || email.split('@')[0]
    
    // Split full name into first and last names if no given_name/family_name provided
    const fullName = name || ''
    const [derivedFirstName = '', ...rest] = fullName.split(' ')
    const derivedLastName = rest.join(' ') || null

    // Use OIDC claims for names, fallback to parsed full name
    const finalFirstName = given_name || derivedFirstName
    const finalLastName = family_name || derivedLastName

    // Check if user already exists to preserve their password
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    // Create or update user based on OIDC email
    const user = await prisma.user.upsert({
      where: { 
        email 
      },
      update: {
        username,
        firstName: finalFirstName,
        lastName: finalLastName,
        avatar: picture,
        emailVerified: true,
        updatedAt: new Date()
        // Note: We deliberately do NOT update hashedPassword for existing users
        // This preserves their existing password when linking OIDC accounts
      },
      create: {
        username,
        email,
        firstName: finalFirstName,
        lastName: finalLastName,
        avatar: picture,
        emailVerified: true,
        // Set a random password since this is OIDC auth for new users
        hashedPassword: await bcrypt.hash(globalThis.crypto.randomUUID(), 10)
      }
    })

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    }
  }

  static async createSession(userId: string): Promise<string> {
    const session = await lucia.createSession(userId, {})
    return session.id
  }
}
