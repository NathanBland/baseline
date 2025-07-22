import { Elysia, t } from 'elysia'
import { lucia, hashPassword, verifyPassword, github, google } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { registerSchema, loginSchema } from '../lib/validation.js'
import { generateId } from 'lucia'

export const authRoutes = new Elysia({ prefix: '/auth' })
  // Register endpoint
  .post('/register', async ({ body, set, cookie }) => {
    try {
      const { email, username, password, firstName, lastName } = registerSchema.parse(body)

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
        return {
          error: 'User already exists',
          message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
        }
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password)
      const userId = generateId(15)

      const user = await prisma.user.create({
        data: {
          id: userId,
          email,
          username,
          hashedPassword,
          firstName,
          lastName
        }
      })

      // Create session
      const session = await lucia.createSession(userId, {})
      const sessionCookie = lucia.createSessionCookie(session.id)

      cookie[sessionCookie.name].set({
        value: sessionCookie.value,
        ...sessionCookie.attributes
      })

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
      set.status = 500
      return {
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, {
    body: t.Object({
      email: t.String(),
      username: t.String(),
      password: t.String(),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String())
    }),
    tags: ['Auth']
  })

  // Login endpoint
  .post('/login', async ({ body, set, cookie }) => {
    try {
      const { email, password } = loginSchema.parse(body)

      const user = await prisma.user.findUnique({
        where: { email }
      })

      if (!user || !user.hashedPassword) {
        set.status = 400
        return {
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        }
      }

      const validPassword = await verifyPassword(password, user.hashedPassword)
      if (!validPassword) {
        set.status = 400
        return {
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        }
      }

      // Create session
      const session = await lucia.createSession(user.id, {})
      const sessionCookie = lucia.createSessionCookie(session.id)

      cookie[sessionCookie.name].set({
        value: sessionCookie.value,
        ...sessionCookie.attributes
      })

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
      set.status = 500
      return {
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String()
    }),
    tags: ['Auth']
  })

  // Logout endpoint
  .post('/logout', async ({ cookie, set }) => {
    const sessionId = cookie.lucia_session?.value
    if (!sessionId) {
      set.status = 401
      return { error: 'No active session' }
    }

    await lucia.invalidateSession(sessionId)
    const sessionCookie = lucia.createBlankSessionCookie()
    
    cookie[sessionCookie.name].set({
      value: sessionCookie.value,
      ...sessionCookie.attributes
    })

    return { message: 'Logged out successfully' }
  }, {
    tags: ['Auth']
  })

  // Get current user
  .get('/me', async ({ cookie, set }) => {
    const sessionId = cookie.lucia_session?.value
    if (!sessionId) {
      set.status = 401
      return { error: 'Not authenticated' }
    }

    const { session, user } = await lucia.validateSession(sessionId)
    if (!session) {
      set.status = 401
      return { error: 'Invalid session' }
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        emailVerified: user.emailVerified
      }
    }
  }, {
    tags: ['Auth']
  })

  // GitHub OAuth (if configured)
  .get('/github', async ({ set }) => {
    if (!github) {
      set.status = 400
      return { error: 'GitHub OAuth not configured' }
    }

    const state = generateId(40)
    const url = await github.createAuthorizationURL(state)

    set.redirect = url.toString()
    return { url: url.toString() }
  }, {
    tags: ['Auth']
  })

  // Google OAuth (if configured)
  .get('/google', async ({ set }) => {
    if (!google) {
      set.status = 400
      return { error: 'Google OAuth not configured' }
    }

    const state = generateId(40)
    const codeVerifier = generateId(40)
    const url = await google.createAuthorizationURL(state, codeVerifier, {
      scopes: ['profile', 'email']
    })

    set.redirect = url.toString()
    return { url: url.toString() }
  }, {
    tags: ['Auth']
  })
