import { Elysia, t } from 'elysia'
import { lucia } from '../auth/index.js'
import { prisma } from '../db/index.js'
import { updateUserSchema, paginationSchema } from '../lib/validation.js'

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

export const userRoutes = new Elysia({ prefix: '/users' })
  // Get all users (paginated)
  .get('/', async ({ query, cookie, set }) => {
    await requireAuth({ cookie, set })
    
    const { page, limit } = paginationSchema.parse(query)
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count()
    ])

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }, {
    query: t.Object({
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric())
    }),
    tags: ['Users']
  })

  // Get user by ID
  .get('/:id', async ({ params, cookie, set }) => {
    await requireAuth({ cookie, set })

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
            messages: true
          }
        }
      }
    })

    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    return { user }
  }, {
    params: t.Object({
      id: t.String()
    }),
    tags: ['Users']
  })

  // Update current user
  .put('/me', async ({ body, cookie, set }) => {
    const { user } = await requireAuth({ cookie, set })
    
    const updateData = updateUserSchema.parse(body)

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true
      }
    })

    return {
      message: 'User updated successfully',
      user: updatedUser
    }
  }, {
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      avatar: t.Optional(t.String())
    }),
    tags: ['Users']
  })

  // Search users
  .get('/search', async ({ query, cookie, set }) => {
    await requireAuth({ cookie, set })

    const { q, page = 1, limit = 20 } = query
    if (!q || q.length < 2) {
      set.status = 400
      return { error: 'Search query must be at least 2 characters' }
    }

    const skip = (page - 1) * limit

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    })

    return { users }
  }, {
    query: t.Object({
      q: t.String(),
      page: t.Optional(t.Numeric()),
      limit: t.Optional(t.Numeric())
    }),
    tags: ['Users']
  })
