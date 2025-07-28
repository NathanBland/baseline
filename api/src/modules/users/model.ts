import { t } from 'elysia'

export namespace UserModel {
  // Base user model
  export const user = t.Object({
    id: t.String(),
    username: t.String(),
    email: t.String(),
    firstName: t.Optional(t.Nullable(t.String())),
    lastName: t.Optional(t.Nullable(t.String())),
    avatar: t.Optional(t.Nullable(t.String())),
    createdAt: t.Date()
  })

  // Search query parameters
  export const searchQuery = t.Object({
    query: t.String({ minLength: 1 }),
    limit: t.Optional(t.String()),
    offset: t.Optional(t.String())
  })

  // Search response
  export const searchResponse = t.Object({
    users: t.Array(user),
    total: t.Number(),
    query: t.String()
  })

  // Single user response
  export const userResponse = t.Object({
    user: user
  })

  // Error responses
  export const unauthorizedError = t.Literal('Authentication required')
  export const notFoundError = t.Literal('User not found')
  export const validationError = t.Literal('Invalid input parameters')

  // Type exports
  export type SearchQuery = typeof searchQuery.static
  export type SearchResponse = typeof searchResponse.static
  export type UserResponse = typeof userResponse.static
}
