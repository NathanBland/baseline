import { Elysia, t } from 'elysia'
import { ConversationService } from './service'
import { ConversationModel } from './model'

export const conversationModule = new Elysia({ prefix: '/conversations' })
  .get(
    '/',
    async ({ query }) => {
      const { userId, limit = '50', offset = '0' } = query
      return await ConversationService.getConversations(
        userId,
        parseInt(limit),
        parseInt(offset)
      )
    },
    {
      query: ConversationModel.conversationQuery,
      response: {
        200: ConversationModel.conversationListResponse,
        422: ConversationModel.conversationError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Get user conversations',
        description: 'Retrieve conversations for a specific user with pagination'
      }
    }
  )
  .get(
    '/:id',
    async ({ params: { id }, query: { userId } }) => {
      return await ConversationService.getConversationById(id, userId)
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ userId: t.String() }),
      response: {
        200: ConversationModel.conversationResponse,
        404: ConversationModel.notFoundError,
        403: ConversationModel.forbiddenError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Get conversation by ID',
        description: 'Retrieve a specific conversation with messages and participants'
      }
    }
  )
  .post(
    '/',
    async ({ body, query: { userId } }) => {
      return await ConversationService.createConversation(body, userId)
    },
    {
      body: ConversationModel.createConversationBody,
      query: t.Object({ userId: t.String() }),
      response: {
        200: ConversationModel.conversationResponse,
        400: ConversationModel.conversationError,
        422: ConversationModel.conversationError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Create new conversation',
        description: 'Create a new conversation with participants'
      }
    }
  )
  .put(
    '/:id',
    async ({ params: { id }, body, query: { userId } }) => {
      return await ConversationService.updateConversation(id, body, userId)
    },
    {
      params: t.Object({ id: t.String() }),
      body: ConversationModel.updateConversationBody,
      query: t.Object({ userId: t.String() }),
      response: {
        200: ConversationModel.conversationResponse,
        403: ConversationModel.forbiddenError,
        404: ConversationModel.notFoundError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Update conversation',
        description: 'Update conversation details (admin only)'
      }
    }
  )
  .delete(
    '/:id',
    async ({ params: { id }, query: { userId } }) => {
      return await ConversationService.deleteConversation(id, userId)
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ userId: t.String() }),
      response: {
        200: t.Object({ success: t.Literal(true) }),
        403: ConversationModel.forbiddenError,
        404: ConversationModel.notFoundError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Delete conversation',
        description: 'Delete conversation and all related data (admin only)'
      }
    }
  )
  .post(
    '/:id/participants',
    async ({ params: { id }, body, query: { userId } }) => {
      return await ConversationService.addParticipant(id, body, userId)
    },
    {
      params: t.Object({ id: t.String() }),
      body: ConversationModel.addParticipantBody,
      query: t.Object({ userId: t.String() }),
      response: {
        200: ConversationModel.participantResponse,
        400: ConversationModel.conversationError,
        403: ConversationModel.forbiddenError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Add participant',
        description: 'Add a new participant to the conversation'
      }
    }
  )
  .delete(
    '/:id/participants/:userId',
    async ({ params: { id, userId: participantUserId }, query: { userId } }) => {
      return await ConversationService.removeParticipant(id, participantUserId, userId)
    },
    {
      params: t.Object({ id: t.String(), userId: t.String() }),
      query: t.Object({ userId: t.String() }),
      response: {
        200: t.Object({ success: t.Literal(true) }),
        403: ConversationModel.forbiddenError,
        404: ConversationModel.notFoundError
      },
      detail: {
        tags: ['Conversations'],
        summary: 'Remove participant',
        description: 'Remove a participant from the conversation'
      }
    }
  )
