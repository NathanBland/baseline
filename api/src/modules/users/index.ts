import { Elysia, t, status } from 'elysia'
import { UserService } from './service.js'
import { UserModel } from './model.js'
import { AuthService } from '../auth/service'

export const userModule = new Elysia({ prefix: '/users' })
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

      const { query: searchQuery, limit = '20', offset = '0' } = query
      
      return await UserService.searchUsers(
        searchQuery,
        parseInt(limit),
        parseInt(offset)
      )
    },
    {
      query: UserModel.searchQuery,
      response: {
        200: UserModel.searchResponse,
        401: UserModel.unauthorizedError,
        422: UserModel.validationError
      },
      detail: {
        tags: ['Users'],
        summary: 'Search users',
        description: 'Search for users by username or email'
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

      return await UserService.getUserById(id)
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: UserModel.userResponse,
        404: UserModel.notFoundError,
        401: UserModel.unauthorizedError
      },
      detail: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Retrieve a specific user profile'
      }
    }
  )
