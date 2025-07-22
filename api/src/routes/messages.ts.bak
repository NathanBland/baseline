import { Elysia, t } from 'elysia'
import { lucia } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { createMessageSchema, updateMessageSchema, paginationSchema } from '../lib/validation.js'

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

export const messageRoutes = new Elysia({ prefix: '/messages' })
  // Get messages for a conversation
  .get('/conversation/:conversationId', async ({ params, query, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    const { page, limit } = paginationSchema.parse(query)
    const skip = (page - 1) * limit

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: params.conversationId,
        userId: user.id,
        leftAt: null
      }
    })

    if (!participant) {
      set.status = 403
      return { error: 'Not authorized to view messages in this conversation' }
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversationId: params.conversationId,
          deletedAt: null
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          replyTo: {
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
              replies: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.message.count({
        where: {
          conversationId: params.conversationId,
          deletedAt: null
        }
      })
    ])

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }, {
    params: t.Object({
      conversationId: t.String()
    }),
    query: t.Object({
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric())
    }),
    tags: ['Messages']
  })

  // Create new message
  .post('/', async ({ body, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    const { content, type, conversationId, replyToId, metadata } = createMessageSchema.parse({
      ...body,
      conversationId: body.conversationId
    })

    // Verify user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: user.id,
        leftAt: null
      }
    })

    if (!participant) {
      set.status = 403
      return { error: 'Not authorized to send messages in this conversation' }
    }

    // If replying, verify the message exists and is in the same conversation
    if (replyToId) {
      const replyToMessage = await prisma.message.findFirst({
        where: {
          id: replyToId,
          conversationId,
          deletedAt: null
        }
      })

      if (!replyToMessage) {
        set.status = 400
        return { error: 'Reply target message not found' }
      }
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        conversationId,
        userId: user.id,
        replyToId,
        metadata
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        replyTo: {
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
        }
      }
    })

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    return {
      message: 'Message sent successfully',
      data: message
    }
  }, {
    body: t.Object({
      content: t.String(),
      type: t.Optional(t.Union([
        t.Literal('TEXT'),
        t.Literal('IMAGE'),
        t.Literal('FILE'),
        t.Literal('SYSTEM'),
        t.Literal('REACTION')
      ])),
      conversationId: t.String(),
      replyToId: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any()))
    }),
    tags: ['Messages']
  })

  // Update message
  .put('/:id', async ({ params, body, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    const { content } = updateMessageSchema.parse(body)

    // Find message and verify ownership
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        deletedAt: null
      }
    })

    if (!existingMessage) {
      set.status = 404
      return { error: 'Message not found or not authorized' }
    }

    const message = await prisma.message.update({
      where: { id: params.id },
      data: {
        content,
        editedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        replyTo: {
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
        }
      }
    })

    return {
      message: 'Message updated successfully',
      data: message
    }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      content: t.String()
    }),
    tags: ['Messages']
  })

  // Delete message (soft delete)
  .delete('/:id', async ({ params, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })

    // Find message and verify ownership
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        deletedAt: null
      }
    })

    if (!existingMessage) {
      set.status = 404
      return { error: 'Message not found or not authorized' }
    }

    await prisma.message.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date()
      }
    })

    return { message: 'Message deleted successfully' }
  }, {
    params: t.Object({
      id: t.String()
    }),
    tags: ['Messages']
  })

  // Get message by ID
  .get('/:id', async ({ params, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })

    const message = await prisma.message.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
        conversation: {
          participants: {
            some: {
              userId: user.id,
              leftAt: null
            }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        replyTo: {
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
        replies: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          },
          where: {
            deletedAt: null
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!message) {
      set.status = 404
      return { error: 'Message not found' }
    }

    return { message }
  }, {
    params: t.Object({
      id: t.String()
    }),
    tags: ['Messages']
  })
