import { Elysia, t, status } from 'elysia'
import { ConversationService } from './service'
import { ConversationModel } from './model'
import { AuthService } from '../auth/service'

export const conversationModule = new Elysia({ prefix: '/conversations' })
  .get(
    '/',
    async ({ query, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      const { limit = '50', offset = '0' } = query
      return await ConversationService.getConversations(
        sessionValidation.user.id,
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
    async ({ params: { id }, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      return await ConversationService.getConversationById(id, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
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
    async ({ body, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      return await ConversationService.createConversation(body, sessionValidation.user.id)
    },
    {
      body: ConversationModel.createConversationBody,
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
    async ({ params: { id }, body, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      return await ConversationService.updateConversation(id, body, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
      body: ConversationModel.updateConversationBody,
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
    async ({ params: { id }, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      return await ConversationService.deleteConversation(id, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
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
    async ({ params: { id }, body, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      return await ConversationService.addParticipant(id, body, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
      body: ConversationModel.addParticipantBody,
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
    async ({ params: { id, userId: participantUserId }, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      return await ConversationService.removeParticipant(id, participantUserId, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String(), userId: t.String() }),
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
