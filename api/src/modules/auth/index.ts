import { Elysia, t } from 'elysia'
import { status } from 'elysia'
import { decodeJwt } from 'jose'
import { AuthService } from './service'
import { AuthModel } from './model'
import { providersModule } from './providers'
import { oidc, lucia } from '../../auth/index.js'

type OIDCClaims = {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
};

export const authModule = new Elysia({ prefix: '/auth' })
  .post(
    '/register',
    async ({ body, cookie: { session } }) => {
      const response = await AuthService.register(body)
      
      // Set session cookie
      session.value = response.sessionId
      session.httpOnly = true
      session.secure = process.env.NODE_ENV === 'production'
      // Use 'lax' for localhost development, 'strict' for production
      session.sameSite = process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
      session.maxAge = 60 * 60 * 24 * 30 // 30 days

      // For now, return sessionId as token for WebSocket auth
      // TODO: Implement proper JWT token generation
      return {
        ...response,
        token: response.sessionId
      }
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
      session.maxAge = 60 * 60 * 24 * 30
      
      // For now, return sessionId as token for WebSocket auth
      // TODO: Implement proper JWT token generation
      return {
        ...response,
        token: response.sessionId
      }
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
        description: 'Get current authenticated user information'
      }
    }
  )
  .get(
    '/token',
    async ({ cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'No session found')
      }

      // Validate session and get user
      const { user } = await lucia.validateSession(session.value)
      if (!user) {
        throw status(401, 'Invalid session')
      }

      // Return session ID as token for WebSocket authentication
      // TODO: Consider implementing proper JWT tokens for enhanced security
      return {
        token: session.value,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }
    },
    {
      response: {
        200: t.Object({
          token: t.String(),
          user: t.Object({
            id: t.String(),
            username: t.String(),
            email: t.String()
          })
        }),
        401: AuthModel.authError
      },
      detail: {
        tags: ['Authentication'],
        summary: 'Get WebSocket Token',
        description: 'Exchange session cookie for WebSocket authentication token'
      }
    }
  )
  .use(providersModule)
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
  .get(
    '/oidc',
    async ({ redirect }) => {
      if (!oidc) {
        throw status(404, 'OIDC provider not configured')
      }
      
      // Generate state parameter for security
      const state = crypto.randomUUID()
      
      // Build authorization URL
      const params = new URLSearchParams({
        client_id: oidc.clientId,
        redirect_uri: oidc.redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        state: state
      })
      
      const authorizationUrl = `${oidc.authorizationEndpoint}?${params.toString()}`
      return redirect(authorizationUrl)
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'OIDC OAuth',
        description: 'Initiate OIDC OAuth flow'
      }
    }
  )
  .get(
    '/oidc/callback',
    async ({ query, cookie: { session }, redirect }) => {
      if (!oidc) {
        throw status(404, 'OIDC provider not configured')
      }
      
      const { code, state, error } = query
      
      if (error) {
        throw status(400, `OIDC error: ${error}`)
      }
      
      if (!code) {
        throw status(400, 'Missing authorization code')
      }
      
      try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch(oidc.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: oidc.clientId,
            client_secret: oidc.clientSecret,
            redirect_uri: oidc.redirectUri,
            code: code
          })
        })

        if (!tokenResponse.ok) {
          throw status(400, 'Failed to exchange code for tokens')
        }

        const tokenData = await tokenResponse.json()
        const { access_token, id_token } = tokenData

        if (!access_token || !id_token) {
          throw status(400, 'Invalid token response')
        }

        // Decode ID token to get user claims
        let userClaims: OIDCClaims
        try {
          const decoded = decodeJwt(id_token)
          userClaims = decoded as OIDCClaims
        } catch (error) {
          console.error('Failed to decode ID token:', error)
          throw status(400, 'Invalid ID token')
        }

        // Validate required claims
        if (!userClaims.sub || !userClaims.email) {
          throw status(400, 'ID token missing required claims (sub, email)')
        }

        const userInfo = {
          sub: userClaims.sub,
          email: userClaims.email,
          name: userClaims.name,
          preferred_username: userClaims.preferred_username,
          given_name: userClaims.given_name,
          family_name: userClaims.family_name,
          picture: userClaims.picture
        }

        // Create or update user based on OIDC user info
        const user = await AuthService.createOrUpdateUserFromOIDC(userInfo)

        // Create session
        const sessionId = await AuthService.createSession(user.id)

        // Set session cookie
        session.value = sessionId
        session.httpOnly = true
        session.secure = process.env.NODE_ENV === 'production'
        session.sameSite = process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        session.maxAge = 60 * 60 * 24 * 30 // 30 days

        // Redirect to UI - session cookie is already set
        const uiUrl = process.env.UI_URL || 'http://localhost:5173'
        return redirect(`${uiUrl}/chat`)
        
      } catch (error) {
        console.error('OIDC callback error:', error)
        throw status(400, 'OIDC authentication failed')
      }
    },
    {
      detail: {
        tags: ['Authentication'],
        summary: 'OIDC OAuth Callback',
        description: 'Handle OIDC OAuth callback and create user session'
      }
    }
  )
