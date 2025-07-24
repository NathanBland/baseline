import { status } from 'elysia'
import { prisma } from '../../db'
import type { MessageModel } from './model'

export abstract class MessageService {
  static async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0,
    before?: string,
    after?: string
  ): Promise<MessageModel.MessageListResponse> {
    try {
      // Verify user has access to conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      })

      if (!participant) {
        throw status(403, 'Access denied to this conversation')
      }

      // Build where clause for pagination
      const whereClause: any = { conversationId }
      if (before) {
        whereClause.createdAt = { lt: new Date(before) }
      }
      if (after) {
        whereClause.createdAt = { gt: new Date(after) }
      }

      const messages = await prisma.message.findMany({
        where: whereClause,
        include: {
          author: {
            select: { id: true, username: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset
      })

      return {
        messages,
        total: messages.length,
        hasMore: messages.length === limit
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Message service error:', error)
      throw status(500, 'Failed to fetch messages')
    }
  }

  static async getMessageById(
    messageId: string,
    userId: string
  ): Promise<MessageModel.MessageResponse> {
    try {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          author: {
            select: { id: true, username: true }
          },
          conversation: {
            include: {
              participants: {
                where: { userId },
                select: { userId: true }
              }
            }
          }
        }
      })

      if (!message) {
        throw status(404, 'Message not found')
      }

      // Check if user has access to the conversation
      if (message.conversation.participants.length === 0) {
        throw status(403, 'Access denied to this message')
      }

      // Remove conversation from response
      const { conversation, ...messageData } = message

      return { message: messageData }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Message service error:', error)
      throw status(500, 'Failed to fetch message')
    }
  }

  static async createMessage(
    { content, conversationId, replyToId, type = 'TEXT' }: MessageModel.CreateMessageBody,
    authorId: string
  ): Promise<MessageModel.MessageResponse> {
    try {
      // Verify user has access to conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: authorId
        }
      })

      if (!participant) {
        throw status(403, 'Access denied to this conversation')
      }

      // Verify reply message exists and belongs to same conversation
      if (replyToId) {
        const replyMessage = await prisma.message.findUnique({
          where: { id: replyToId }
        })

        if (!replyMessage || replyMessage.conversationId !== conversationId) {
          throw status(400, 'Invalid reply message')
        }
      }

      const message = await prisma.message.create({
        data: {
          content,
          conversationId,
          authorId,
          replyToId,
          type
        },
        include: {
          author: {
            select: { id: true, username: true }
          }
        }
      })

      // Update conversation's updatedAt timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      })

      return { message }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Message service error:', error)
      throw status(500, 'Failed to create message')
    }
  }

  static async updateMessage(
    messageId: string,
    { content }: MessageModel.UpdateMessageBody,
    userId: string
  ): Promise<MessageModel.MessageResponse> {
    try {
      // Verify message exists and user is the author
      const existingMessage = await prisma.message.findUnique({
        where: { id: messageId }
      })

      if (!existingMessage) {
        throw status(404, 'Message not found')
      }

      if (existingMessage.authorId !== userId) {
        throw status(403, 'Only the author can edit this message')
      }

      const message = await prisma.message.update({
        where: { id: messageId },
        data: { content },
        include: {
          author: {
            select: { id: true, username: true }
          }
        }
      })

      return { message }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Message service error:', error)
      throw status(500, 'Failed to update message')
    }
  }

  static async deleteMessage(messageId: string, userId: string): Promise<{ success: boolean }> {
    try {
      // Verify message exists and user is the author or admin
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              participants: {
                where: { userId },
                select: { role: true }
              }
            }
          }
        }
      })

      if (!message) {
        throw status(404, 'Message not found')
      }

      const userParticipant = message.conversation.participants[0]
      const canDelete = 
        message.authorId === userId || 
        (userParticipant && ['ADMIN', 'MODERATOR'].includes(userParticipant.role))

      if (!canDelete) {
        throw status(403, 'Insufficient permissions to delete this message')
      }

      await prisma.message.delete({
        where: { id: messageId }
      })

      return { success: true }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Message service error:', error)
      throw status(500, 'Failed to delete message')
    }
  }

  static async searchMessages(
    conversationId: string,
    query: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageModel.SearchResponse> {
    try {
      // Verify user has access to conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId
        }
      })

      if (!participant) {
        throw status(403, 'Access denied to this conversation')
      }

      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          content: {
            contains: query,
            mode: 'insensitive'
          }
        },
        include: {
          author: {
            select: { id: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })

      return {
        messages,
        total: messages.length,
        query
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Message service error:', error)
      throw status(500, 'Failed to search messages')
    }
  }
}
