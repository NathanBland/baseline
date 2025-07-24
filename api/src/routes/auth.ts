import { Elysia, t } from 'elysia'
import { lucia, hashPassword, verifyPassword } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { registerSchema, loginSchema } from '../lib/validation.js'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/register', async ({ body, set }) => {
    try {
      const { email, username, password, firstName, lastName } = body
      
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })
      
      if (existingUser) {
        set.status = 400
        return { error: 'User with this email or username already exists' }
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password)
      const user = await prisma.user.create({
        data: {
          email,
          username,
          hashedPassword,
          firstName,
          lastName
        }
      })
      
      // Create session
      const session = await lucia.createSession(user.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      
      set.headers['Set-Cookie'] = sessionCookie.serialize()
      
      return {
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      set.status = 500
      return { error: 'Internal server error' }
    }
  }, {
    body: registerSchema,
    detail: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Create a new user account with email and password'
    }
  })
  
  .post('/login', async ({ body, set }) => {
    try {
      const { email, password } = body
      
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (!user || !user.hashedPassword) {
        set.status = 400
        return { error: 'Invalid email or password' }
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(password, user.hashedPassword)
      if (!isValidPassword) {
        set.status = 400
        return { error: 'Invalid email or password' }
      }
      
      // Create session
      const session = await lucia.createSession(user.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)
      
      set.headers['Set-Cookie'] = sessionCookie.serialize()
      
      return {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      set.status = 500
      return { error: 'Internal server error' }
    }
  }, {
    body: loginSchema,
    detail: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticate user with email and password'
    }
  })
  
  .post('/logout', async ({ cookie, set }) => {
    try {
      const sessionId = cookie.lucia_session?.value
      
      if (sessionId) {
        await lucia.invalidateSession(sessionId)
      }
      
      const sessionCookie = lucia.createBlankSessionCookie()
      set.headers['Set-Cookie'] = sessionCookie.serialize()
      
      return { message: 'Logout successful' }
    } catch (error) {
      console.error('Logout error:', error)
      set.status = 500
      return { error: 'Internal server error' }
    }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Invalidate user session and clear cookies'
    }
  })
