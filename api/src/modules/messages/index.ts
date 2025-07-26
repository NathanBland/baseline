import { Elysia, t, status } from 'elysia'
import { MessageService } from './service'
import { MessageModel } from './model'
import { AuthService } from '../auth/service'

export const messageModule = new Elysia({ prefix: '/messages' })
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

      const { conversationId, limit = '50', offset = '0', before, after } = query
      
      if (!conversationId) {
        throw new Error('Conversation ID is required')
      }

      return await MessageService.getMessages(
        conversationId,
        sessionValidation.user.id,
        parseInt(limit),
        parseInt(offset),
        before,
        after
      )
    },
    {
      query: MessageModel.messageQuery,
      response: {
        200: MessageModel.messageListResponse,
        403: MessageModel.forbiddenError,
        422: MessageModel.validationError
      },
      detail: {
        tags: ['Messages'],
        summary: 'Get messages',
        description: 'Retrieve messages from a conversation with pagination'
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
      
      return await MessageService.getMessageById(id, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: MessageModel.messageResponse,
        404: MessageModel.notFoundError,
        403: MessageModel.forbiddenError
      },
      detail: {
        tags: ['Messages'],
        summary: 'Get message by ID',
        description: 'Retrieve a specific message by its ID'
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
      
      return await MessageService.createMessage(body, sessionValidation.user.id)
    },
    {
      body: MessageModel.createMessageBody,
      response: {
        200: MessageModel.messageResponse,
        400: MessageModel.messageError,
        403: MessageModel.forbiddenError,
        422: MessageModel.validationError
      },
      detail: {
        tags: ['Messages'],
        summary: 'Create new message',
        description: 'Create a new message in a conversation'
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
      
      return await MessageService.updateMessage(id, body, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
      body: MessageModel.updateMessageBody,
      response: {
        200: MessageModel.messageResponse,
        404: MessageModel.notFoundError,
        403: MessageModel.forbiddenError
      },
      detail: {
        tags: ['Messages'],
        summary: 'Update message',
        description: 'Update message content (author only)'
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
      
      return await MessageService.deleteMessage(id, sessionValidation.user.id)
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        404: MessageModel.notFoundError,
        403: MessageModel.forbiddenError
      },
      detail: {
        tags: ['Messages'],
        summary: 'Delete message',
        description: 'Delete a message (author or admin only)'
      }
    }
  )
  .get(
    '/search',
    async ({ query, cookie: { session } }) => {
      if (!session.value) {
        throw status(401, 'Authentication required')
      }

      // Validate session and get user
      const sessionValidation = await AuthService.validateSession(session.value)
      if (!sessionValidation) {
        throw status(401, 'Invalid session')
      }

      const { conversationId, query: searchQuery, limit = '50', offset = '0' } = query
      
      return await MessageService.searchMessages(
        conversationId,
        searchQuery,
        sessionValidation.user.id,
        parseInt(limit),
        parseInt(offset)
      )
    },
    {
      query: MessageModel.searchQuery,
      response: {
        200: MessageModel.searchResponse,
        403: MessageModel.forbiddenError,
        422: MessageModel.validationError
      },
      detail: {
        tags: ['Messages'],
        summary: 'Search messages',
        description: 'Search for messages within a conversation'
      }
    }
  )
