import { Elysia, t } from 'elysia'
import { status } from 'elysia'
import { AuthService } from './service'
import { AuthModel } from './model'

export const authModule = new Elysia({ prefix: '/auth' })
  .post(
    '/register',
    async ({ body, cookie: { session } }) => {
      const response = await AuthService.register(body)
      
      // Set session cookie
      session.value = response.sessionId
      session.httpOnly = true
      session.secure = process.env.NODE_ENV === 'production'
      session.sameSite = 'lax'
      session.maxAge = 60 * 60 * 24 * 30 // 30 days

      return response
    },
    {
      body: AuthModel.registerBody,
      response: {
        200: AuthModel.registerResponse,
        400: AuthModel.authError,
        422: AuthModel.validationError
      },
      detail: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create a new user account and return session'
      }
    }
  )
  .post(
    '/login',
    async ({ body, cookie: { session } }) => {
      const response = await AuthService.login(body)
      
      // Set session cookie
      session.value = response.sessionId
      session.httpOnly = true
      session.secure = process.env.NODE_ENV === 'production'
      session.sameSite = 'lax'
      session.maxAge = 60 * 60 * 24 * 30 // 30 days

      return response
    },
    {
      body: AuthModel.loginBody,
      response: {
        200: AuthModel.loginResponse,
        401: AuthModel.unauthorizedError,
        422: AuthModel.validationError
      },
      detail: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user and return session'
      }
    }
  )
  .post(
    '/logout',
    async ({ cookie: { session } }) => {
      if (session.value) {
        await AuthService.logout(session.value)
        session.remove()
      }
      
      return { success: true }
    },
    {
      response: {
        200: t.Object({ success: t.Literal(true) }),
        401: AuthModel.unauthorizedError
      },
      detail: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Invalidate user session'
      }
    }
  )
  .get(
    '/me',
    async ({ cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'No session found')
      }

      return await AuthService.getCurrentUser(session.value)
    },
    {
      response: {
        200: AuthModel.userProfile,
        401: AuthModel.unauthorizedError
      },
      detail: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Get current authenticated user profile'
      }
    }
  )
  .get(
    '/google',
    async ({ redirect }) => {
      // OAuth implementation would go here
      return redirect('/auth/oauth/google')
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'Google OAuth',
        description: 'Initiate Google OAuth flow'
      }
    }
  )
  .get(
    '/google/callback',
    async ({ query }) => {
      // OAuth callback implementation would go here
      const { code, state } = query
      return { message: 'OAuth callback received', code, state }
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'Google OAuth Callback',
        description: 'Handle Google OAuth callback'
      }
    }
  )
  .get(
    '/github',
    async ({ redirect }) => {
      // OAuth implementation would go here
      return redirect('/auth/oauth/github')
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'GitHub OAuth',
        description: 'Initiate GitHub OAuth flow'
      }
    }
  )
  .get(
    '/github/callback',
    async ({ query }) => {
      // OAuth callback implementation would go here
      const { code, state } = query
      return { message: 'OAuth callback received', code, state }
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'GitHub OAuth Callback',
        description: 'Handle GitHub OAuth callback'
      }
    }
  )
