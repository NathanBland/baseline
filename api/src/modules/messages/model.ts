import { t } from 'elysia'

export namespace MessageModel {
  // Base message model
  export const message = t.Object({
    id: t.String(),
    content: t.String(),
    conversationId: t.String(),
    authorId: t.String(),
    replyToId: t.Optional(t.Nullable(t.String())),
    type: t.Union([t.Literal('TEXT'), t.Literal('IMAGE'), t.Literal('FILE'), t.Literal('SYSTEM'), t.Literal('REACTION')]),
    createdAt: t.Date(),
    updatedAt: t.Date()
  })
  export type Message = typeof message.static

  // Message with author details
  export const messageWithAuthor = t.Object({
    id: t.String(),
    content: t.String(),
    conversationId: t.String(),
    authorId: t.String(),
    replyToId: t.Optional(t.Nullable(t.String())),
    type: t.Union([t.Literal('TEXT'), t.Literal('IMAGE'), t.Literal('FILE'), t.Literal('SYSTEM'), t.Literal('REACTION')]),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    author: t.Object({
      id: t.String(),
      username: t.String()
    })
  })
  export type MessageWithAuthor = typeof messageWithAuthor.static

  // Create message request
  export const createMessageBody = t.Object({
    content: t.String({ minLength: 1, maxLength: 2000 }),
    conversationId: t.String(),
    // authorId removed - inferred from session for security
    replyToId: t.Optional(t.String()),
    type: t.Optional(t.Union([t.Literal('TEXT'), t.Literal('IMAGE'), t.Literal('FILE'), t.Literal('SYSTEM'), t.Literal('REACTION')]))
  })
  export type CreateMessageBody = typeof createMessageBody.static

  // Update message request
  export const updateMessageBody = t.Object({
    content: t.String({ minLength: 1, maxLength: 2000 })
  })
  export type UpdateMessageBody = typeof updateMessageBody.static

  // Query parameters
  export const messageQuery = t.Object({
    conversationId: t.String(),
    // userId removed - inferred from session for security
    limit: t.Optional(t.String()),
    offset: t.Optional(t.String()),
    before: t.Optional(t.String()),
    after: t.Optional(t.String())
  })
  export type MessageQuery = typeof messageQuery.static

  export const searchQuery = t.Object({
    conversationId: t.String(),
    // userId removed - inferred from session for security
    query: t.String({ minLength: 1 }),
    limit: t.Optional(t.String()),
    offset: t.Optional(t.String())
  })
  export type SearchQuery = typeof searchQuery.static

  // Response models
  export const messageListResponse = t.Object({
    messages: t.Array(messageWithAuthor),
    total: t.Optional(t.Number()),
    hasMore: t.Optional(t.Boolean())
  })
  export type MessageListResponse = typeof messageListResponse.static

  export const messageResponse = t.Object({
    message: messageWithAuthor
  })
  export type MessageResponse = typeof messageResponse.static

  export const searchResponse = t.Object({
    messages: t.Array(messageWithAuthor),
    total: t.Number(),
    query: t.String()
  })
  export type SearchResponse = typeof searchResponse.static

  // Error responses
  export const messageError = t.Object({
    error: t.String(),
    message: t.String()
  })
  export type MessageError = typeof messageError.static

  export const notFoundError = t.Literal('Message not found')
  export type NotFoundError = typeof notFoundError.static

  export const forbiddenError = t.Literal('Access denied')
  export type ForbiddenError = typeof forbiddenError.static

  export const validationError = t.Literal('Validation failed')
  export type ValidationError = typeof validationError.static
}
