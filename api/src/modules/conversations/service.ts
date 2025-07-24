import { status } from 'elysia'
import { prisma } from '../../db'
import type { ConversationModel } from './model'
import type { ConversationType } from '@prisma/client'

export abstract class ConversationService {
  static async getConversations(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ConversationModel.ConversationListResponse> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: { 
            some: { userId } 
          }
        },
        include: {
          participants: { 
            include: { 
              user: { 
                select: { id: true, username: true } 
              } 
            } 
          },
          messages: { 
            orderBy: { createdAt: 'desc' }, 
            take: 1, 
            include: { 
              author: { 
                select: { id: true, username: true } 
              } 
            } 
          },
          _count: { 
            select: { messages: true } 
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset
      })

      return {
        conversations,
        total: conversations.length
      }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Fetch conversations error:', error)
      throw status(500, 'Failed to fetch conversations')
    }
  }

  static async getConversationById(
    conversationId: string, 
    userId: string
  ): Promise<ConversationModel.ConversationResponse> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: { 
            some: { userId } 
          }
        },
        include: {
          participants: { 
            include: { 
              user: { 
                select: { id: true, username: true } 
              } 
            } 
          },
          messages: { 
            orderBy: { createdAt: 'desc' }, 
            take: 10, 
            include: { 
              author: { 
                select: { id: true, username: true } 
              } 
            } 
          },
          _count: { 
            select: { messages: true } 
          }
        }
      })

      if (!conversation) {
        throw status(404, 'Conversation not found')
      }

      return { conversation }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Fetch conversation error:', error)
      throw status(500, 'Failed to fetch conversation')
    }
  }

  static async createConversation(
    { title, type, participantIds }: ConversationModel.CreateConversationBody,
    creatorId: string
  ): Promise<ConversationModel.ConversationResponse> {
    try {
      // Ensure creator is included in participants
      const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]))

      const conversation = await prisma.$transaction(async (tx) => {
        // Create conversation
        const newConversation = await tx.conversation.create({
          data: {
            title,
            type: type as ConversationType
          }
        })

        // Add participants
        await tx.conversationParticipant.createMany({
          data: allParticipantIds.map((userId, index) => ({
            conversationId: newConversation.id,
            userId,
            role: userId === creatorId ? 'ADMIN' : 'MEMBER'
          }))
        })

        // Fetch with includes
        return await tx.conversation.findUnique({
          where: { id: newConversation.id },
          include: {
            participants: { 
              include: { 
                user: { 
                  select: { id: true, username: true } 
                } 
              } 
            },
            messages: { 
              orderBy: { createdAt: 'desc' }, 
              take: 1, 
              include: { 
                author: { 
                  select: { id: true, username: true } 
                } 
              } 
            },
            _count: { 
              select: { messages: true } 
            }
          }
        })
      })

      if (!conversation) {
        throw status(500, 'Failed to create conversation')
      }

      return { conversation }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Create conversation error:', error)
      throw status(500, 'Failed to create conversation')
    }
  }

  static async updateConversation(
    conversationId: string,
    { title }: ConversationModel.UpdateConversationBody,
    userId: string
  ): Promise<ConversationModel.ConversationResponse> {
    try {
      // Check if user is admin of the conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          role: 'ADMIN'
        }
      })

      if (!participant) {
        throw status(403, 'Only admins can update conversations')
      }

      const conversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: { title },
        include: {
          participants: { 
            include: { 
              user: { 
                select: { id: true, username: true } 
              } 
            } 
          },
          messages: { 
            orderBy: { createdAt: 'desc' }, 
            take: 1, 
            include: { 
              author: { 
                select: { id: true, username: true } 
              } 
            } 
          },
          _count: { 
            select: { messages: true } 
          }
        }
      })

      return { conversation }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Conversation service error:', error)
      throw status(500, 'Failed to update conversation')
    }
  }

  static async deleteConversation(conversationId: string, userId: string): Promise<{ success: true }> {
    try {
      // Check if user is admin of the conversation
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          role: 'ADMIN'
        }
      })

      if (!participant) {
        throw status(403, 'Only admins can delete conversations')
      }

      await prisma.$transaction(async (tx) => {
        // Delete all messages first
        await tx.message.deleteMany({
          where: { conversationId }
        })

        // Delete all participants
        await tx.conversationParticipant.deleteMany({
          where: { conversationId }
        })

        // Delete conversation
        await tx.conversation.delete({
          where: { id: conversationId }
        })
      })

      return { success: true }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Conversation service error:', error)
      throw status(500, 'Failed to delete conversation')
    }
  }

  static async addParticipant(
    conversationId: string,
    { userId: newUserId, role }: ConversationModel.AddParticipantBody,
    requesterId: string
  ): Promise<ConversationModel.ParticipantResponse> {
    try {
      // Check if requester is admin or moderator
      const requesterParticipant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: requesterId,
          role: { in: ['ADMIN', 'MODERATOR'] }
        }
      })

      if (!requesterParticipant) {
        throw status(403, 'Only admins and moderators can add participants')
      }

      // Check if user is already a participant
      const existingParticipant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: newUserId
        }
      })

      if (existingParticipant) {
        throw status(400, 'User is already a participant in this conversation')
      }

      const participant = await prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: newUserId,
          role
        },
        include: {
          user: {
            select: { id: true, username: true }
          }
        }
      })

      return { participant }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Conversation service error:', error)
      throw status(500, 'Failed to add participant')
    }
  }

  static async removeParticipant(
    conversationId: string,
    participantUserId: string,
    requesterId: string
  ): Promise<{ success: true }> {
    try {
      // Check if requester is admin or moderator, or removing themselves
      const requesterParticipant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId: requesterId
        }
      })

      if (!requesterParticipant) {
        throw status(404, 'Requester is not a participant in this conversation')
      }

      const canRemove = 
        requesterParticipant.role === 'ADMIN' || 
        requesterParticipant.role === 'MODERATOR' || 
        requesterId === participantUserId

      if (!canRemove) {
        throw status(403, 'Insufficient permissions to remove participant')
      }

      const deletedParticipant = await prisma.conversationParticipant.deleteMany({
        where: {
          conversationId,
          userId: participantUserId
        }
      })

      if (deletedParticipant.count === 0) {
        throw status(404, 'Participant not found')
      }

      return { success: true }
    } catch (error) {
      // Re-throw ElysiaJS status errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw error
      }
      console.error('Conversation service error:', error)
      throw status(500, 'Failed to remove participant')
    }
  }
}
