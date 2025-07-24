import { t } from 'elysia'

// User validation schemas
export const registerSchema = t.Object({
  email: t.String({ format: 'email', error: 'Invalid email address' }),
  username: t.String({ minLength: 3, maxLength: 20, error: 'Username must be 3-20 characters' }),
  password: t.String({ minLength: 8, error: 'Password must be at least 8 characters' }),
  firstName: t.Optional(t.String()),
  lastName: t.Optional(t.String())
})

export const loginSchema = t.Object({
  email: t.String({ format: 'email', error: 'Invalid email address' }),
  password: t.String({ minLength: 1, error: 'Password is required' })
})

export const updateUserSchema = t.Object({
  firstName: t.Optional(t.String()),
  lastName: t.Optional(t.String()),
  avatar: t.Optional(t.String({ format: 'uri', error: 'Invalid URL format' }))
})

// Conversation validation schemas
export const createConversationSchema = t.Object({
  title: t.String({ minLength: 1, error: 'Title is required' }),
  description: t.Optional(t.String()),
  type: t.Optional(t.Union([t.Literal('DIRECT'), t.Literal('GROUP')])),
  participantIds: t.Optional(t.Array(t.String()))
})

export const updateConversationSchema = t.Object({
  title: t.Optional(t.String()),
  description: t.Optional(t.String())
})

// Message validation schemas
export const createMessageSchema = t.Object({
  content: t.String({ minLength: 1, error: 'Content is required' }),
  conversationId: t.String(),
  type: t.Optional(t.Union([t.Literal('TEXT'), t.Literal('IMAGE'), t.Literal('FILE'), t.Literal('SYSTEM'), t.Literal('REACTION')])),
  replyToId: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Any()))
})

export const updateMessageSchema = t.Object({
  content: t.String({ minLength: 1, error: 'Content is required' })
})

// Pagination schema
export const paginationSchema = t.Object({
  page: t.Optional(t.Integer({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100, default: 20 })),
  sortBy: t.Optional(t.String()),
  sortOrder: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')]))
})

// Type definitions using ElysiaJS TypeBox inference
export type RegisterInput = typeof registerSchema.static
export type LoginInput = typeof loginSchema.static
export type UpdateUserInput = typeof updateUserSchema.static
export type CreateConversationInput = typeof createConversationSchema.static
export type UpdateConversationInput = typeof updateConversationSchema.static
export type CreateMessageInput = typeof createMessageSchema.static
export type UpdateMessageInput = typeof updateMessageSchema.static
export type PaginationInput = typeof paginationSchema.static
