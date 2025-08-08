import { t } from 'elysia'

export namespace AuthModel {
  // Registration models
  export const registerBody = t.Object({
    username: t.String({ minLength: 3, maxLength: 50 }),
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 6 })
  })
  export type RegisterBody = typeof registerBody.static

  export const registerResponse = t.Object({
    user: t.Object({
      id: t.String(),
      username: t.String(),
      email: t.String(),
      createdAt: t.Date()
    }),
    sessionId: t.String(),
    token: t.String(),
    refreshToken: t.String()
  })
  export type RegisterResponse = typeof registerResponse.static

  // Login models
  export const loginBody = t.Object({
    email: t.String({ format: 'email' }),
    password: t.String()
  })
  export type LoginBody = typeof loginBody.static

  export const loginResponse = t.Object({
    user: t.Object({
      id: t.String(),
      username: t.String(),
      email: t.String()
    }),
    sessionId: t.String(),
    token: t.String(),
    refreshToken: t.String()
  })
  export type LoginResponse = typeof loginResponse.static

  // User profile model
  export const userProfile = t.Object({
    id: t.String(),
    username: t.String(),
    email: t.String(),
    firstName: t.Optional(t.Union([t.String(), t.Null()])),
    lastName: t.Optional(t.Union([t.String(), t.Null()])),
    avatar: t.Optional(t.Union([t.String(), t.Null()])),
    emailVerified: t.Boolean(),
    createdAt: t.Date()
  })
  export type UserProfile = typeof userProfile.static

  // Error responses
  export const authError = t.Object({
    error: t.String(),
    message: t.String()
  })
  export type AuthError = typeof authError.static

  export const validationError = t.Literal('Validation failed')
  export type ValidationError = typeof validationError.static

  export const unauthorizedError = t.Literal('Unauthorized')
  export type UnauthorizedError = typeof unauthorizedError.static
}
