import { Elysia, t } from 'elysia'
import { lucia } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { createConversationSchema, updateConversationSchema, paginationSchema } from '../lib/validation.js'

// Middleware to validate session
const requireAuth = async ({ cookie, set }: any) => {
  const sessionId = cookie.lucia_session?.value
  if (!sessionId) {
    set.status = 401
    throw new Error('Not authenticated')
  }

  const { session, user } = await lucia.validateSession(sessionId)
  if (!session) {
    set.status = 401
    throw new Error('Invalid session')
  }

  return { user, session }
}

export const conversationRoutes = new Elysia({ prefix: '/conversations' })
  // Get user's conversations
  .get('/', async ({ query, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    const { page, limit } = paginationSchema.parse(query)
    const skip = (page - 1) * limit

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: user.id,
            leftAt: null
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            participants: true
          }
        }
      },
      skip,
      take: limit,
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return { conversations }
  }, {
    query: t.Object({
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric())
    }),
    tags: ['Conversations']
  })

  // Create new conversation
  .post('/', async ({ body, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    const { title, description, type, participantIds } = createConversationSchema.parse(body)

    // Validate participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: { in: participantIds }
      }
    })

    if (participants.length !== participantIds.length) {
      set.status = 400
      return { error: 'One or more participants not found' }
    }

    // Create conversation with participants
    const conversation = await prisma.conversation.create({
      data: {
        title,
        description,
        type,
        participants: {
          create: [
            // Add creator as owner
            {
              userId: user.id,
              role: 'OWNER'
            },
            // Add other participants as members
            ...participantIds
              .filter(id => id !== user.id)
              .map(userId => ({
                userId,
                role: 'MEMBER' as const
              }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    return {
      message: 'Conversation created successfully',
      conversation
    }
  }, {
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      type: t.Optional(t.Union([t.Literal('DIRECT'), t.Literal('GROUP'), t.Literal('CHANNEL')])),
      participantIds: t.Array(t.String())
    }),
    tags: ['Conversations']
  })

  // Get conversation by ID
  .get('/:id', async ({ params, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        participants: {
          some: {
            userId: user.id,
            leftAt: null
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    })

    if (!conversation) {
      set.status = 404
      return { error: 'Conversation not found' }
    }

    return { conversation }
  }, {
    params: t.Object({
      id: t.String()
    }),
    tags: ['Conversations']
  })

  // Update conversation
  .put('/:id', async ({ params, body, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    const updateData = updateConversationSchema.parse(body)

    // Check if user is participant and has permission to update
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: params.id,
        userId: user.id,
        leftAt: null,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!participant) {
      set.status = 403
      return { error: 'Not authorized to update this conversation' }
    }

    const conversation = await prisma.conversation.update({
      where: { id: params.id },
      data: updateData,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    return {
      message: 'Conversation updated successfully',
      conversation
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      title: t.Optional(t.String()),
      description: t.Optional(t.String())
    }),
    tags: ['Conversations']
  })

  // Add participant to conversation
  .post('/:id/participants', async ({ params, body, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })

    // Check if user has permission to add participants
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: params.id,
        userId: user.id,
        leftAt: null,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    })

    if (!participant) {
      set.status = 403
      return { error: 'Not authorized to add participants' }
    }

    const { userId } = body

    // Check if user is already a participant
    const existingParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: params.id,
        userId,
        leftAt: null
      }
    })

    if (existingParticipant) {
      set.status = 400
      return { error: 'User is already a participant' }
    }

    await prisma.conversationParticipant.create({
      data: {
        conversationId: params.id,
        userId,
        role: 'MEMBER'
      }
    })

    return { message: 'Participant added successfully' }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      userId: t.String()
    }),
    tags: ['Conversations']
  })

  // Leave conversation
  .post('/:id/leave', async ({ params, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })

    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: params.id,
        userId: user.id,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    })

    return { message: 'Left conversation successfully' }
  }, {
    params: t.Object({
      id: t.String()
    }),
    tags: ['Conversations']
  })
