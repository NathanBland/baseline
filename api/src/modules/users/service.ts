import { status } from 'elysia'
import { prisma } from '../../db'
import type { UserModel } from './model.js'

export abstract class UserService {
  static async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<UserModel.SearchResponse> {
    try {
      // Search users by username or email
      const users = await prisma.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              email: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          createdAt: true
        },
        orderBy: [
          { username: 'asc' }
        ],
        take: limit,
        skip: offset
      })

      // Get total count for pagination
      const total = await prisma.user.count({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              email: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        }
      })

      return {
        users,
        total,
        query
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('User service error:', error)
      throw status(500, 'Failed to search users')
    }
  }

  static async getUserById(
    userId: string
  ): Promise<UserModel.UserResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          createdAt: true
        }
      })

      if (!user) {
        throw status(404, 'User not found')
      }

      return { user }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('User service error:', error)
      throw status(500, 'Failed to fetch user')
    }
  }
}
