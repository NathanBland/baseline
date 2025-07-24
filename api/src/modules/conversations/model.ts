import { t } from 'elysia'

export namespace ConversationModel {
  // Base conversation model
  export const conversation = t.Object({
    id: t.String(),
    title: t.String(),
    type: t.Union([t.Literal('DIRECT'), t.Literal('GROUP'), t.Literal('CHANNEL')]),
    createdAt: t.Date(),
    updatedAt: t.Date()
  })
  export type Conversation = typeof conversation.static

  // Participant model
  export const participant = t.Object({
    id: t.String(),
    userId: t.String(),
    conversationId: t.String(),
    role: t.Union([t.Literal('ADMIN'), t.Literal('MODERATOR'), t.Literal('MEMBER')]),
    joinedAt: t.Date(),
    user: t.Object({
      id: t.String(),
      username: t.String()
    })
  })
  export type Participant = typeof participant.static

  // Conversation with participants and latest message
  export const conversationWithDetails = t.Object({
    id: t.String(),
    title: t.String(),
    type: t.Union([t.Literal('DIRECT'), t.Literal('GROUP'), t.Literal('CHANNEL')]),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    participants: t.Array(participant),
    messages: t.Array(t.Object({
      id: t.String(),
      content: t.String(),
      createdAt: t.Date(),
      author: t.Object({
        id: t.String(),
        username: t.String()
      })
    })),
    _count: t.Object({
      messages: t.Number()
    })
  })
  export type ConversationWithDetails = typeof conversationWithDetails.static

  // Create conversation request
  export const createConversationBody = t.Object({
    title: t.String({ minLength: 1, maxLength: 100 }),
    type: t.Union([t.Literal('DIRECT'), t.Literal('GROUP'), t.Literal('CHANNEL')]),
    participantIds: t.Array(t.String())
  })
  export type CreateConversationBody = typeof createConversationBody.static

  // Update conversation request
  export const updateConversationBody = t.Object({
    title: t.Optional(t.String({ minLength: 1, maxLength: 100 }))
  })
  export type UpdateConversationBody = typeof updateConversationBody.static

  // Add participant request
  export const addParticipantBody = t.Object({
    userId: t.String(),
    role: t.Union([t.Literal('ADMIN'), t.Literal('MODERATOR'), t.Literal('MEMBER')])
  })
  export type AddParticipantBody = typeof addParticipantBody.static

  // Query parameters
  export const conversationQuery = t.Object({
    userId: t.String(),
    limit: t.Optional(t.String()),
    offset: t.Optional(t.String())
  })
  export type ConversationQuery = typeof conversationQuery.static

  // Response models
  export const conversationListResponse = t.Object({
    conversations: t.Array(conversationWithDetails),
    total: t.Number()
  })
  export type ConversationListResponse = typeof conversationListResponse.static

  export const conversationResponse = t.Object({
    conversation: conversationWithDetails
  })
  export type ConversationResponse = typeof conversationResponse.static

  export const participantResponse = t.Object({
    participant: participant
  })
  export type ParticipantResponse = typeof participantResponse.static

  // Error responses
  export const conversationError = t.Object({
    error: t.String(),
    message: t.String()
  })
  export type ConversationError = typeof conversationError.static

  export const notFoundError = t.Literal('Conversation not found')
  export type NotFoundError = typeof notFoundError.static

  export const forbiddenError = t.Literal('Access denied')
  export type ForbiddenError = typeof forbiddenError.static
}
