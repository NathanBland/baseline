import { createPrismaMock } from 'bun-mock-prisma'
import type { PrismaClient } from '@prisma/client'

// Reuse existing behaviorful mock implementations and fixtures
import {
  mockPrisma as legacyMockPrisma,
  resetMockState as legacyReset,
  mockUser,
  mockConversation,
  mockMessage,
} from './__mocks__/prisma'

// Create a typed Prisma mock client using bun-mock-prisma
// We'll wire legacy behavior onto this base, then expose a Proxy that
// provides callable core client methods like $connect/$disconnect/etc.
const base = createPrismaMock<PrismaClient>()
// Internal tracked state to support richer query behavior in tests
const tracked = {
  users: [] as any[]
}

// Wire bun-mock-prisma methods to our existing behaviorful implementations
// Users
base.user.create.mockImplementation((async (args: any) => {
  const inputData = (args?.data ?? {}) as any
  // Preserve provided fields (username/email/etc), only default missing id
  const data = { ...inputData }
  if (!('id' in data) || !data.id) {
    data.id = mockUser.id
  }
  const created = await (legacyMockPrisma.user.create as any)({ data })
  // Track locally for advanced filtering/count
  tracked.users.push(created)
  return created
}) as any)
base.user.findUnique.mockImplementation((async (args?: any) => {
  const where = args?.where
  const noWhere = !where || (Object.keys(where).length === 0)
  if (!args || noWhere) {
    // Return the most recently created user or default mock
    const last = tracked.users[tracked.users.length - 1] ?? mockUser
    return last
  }
  return (legacyMockPrisma.user.findUnique as any)(args)
}) as any)
base.user.findMany.mockImplementation((async (args: any = {}) => {
  const list = tracked.users.length > 0 ? tracked.users.slice() : await (legacyMockPrisma.user.findMany as any)(args)
  const where = args?.where
  if (where?.OR && Array.isArray(where.OR)) {
    const orConds = where.OR
    const matches = list.filter((u: any) => {
      return orConds.some((c: any) => {
        if (c.username?.contains) {
          const mode = c.username.mode
          const needle = String(c.username.contains)
          const hay = String(u.username ?? '')
          return mode === 'insensitive'
            ? hay.toLowerCase().includes(needle.toLowerCase())
            : hay.includes(needle)
        }
        if (c.email?.contains) {
          const mode = c.email.mode
          const needle = String(c.email.contains)
          const hay = String(u.email ?? '')
          return mode === 'insensitive'
            ? hay.toLowerCase().includes(needle.toLowerCase())
            : hay.includes(needle)
        }
        return false
      })
    })
    const skip = args?.skip ?? 0
    const take = args?.take ?? matches.length
    return matches.slice(skip, skip + take)
  }
  const skip = args?.skip ?? 0
  const take = args?.take ?? list.length
  return list.slice(skip, skip + take)
}) as any)
base.user.update.mockImplementation((async (args?: any) => {
  const result = await (async () => {
    if (!args) {
      const last = tracked.users[tracked.users.length - 1] ?? mockUser
      return (legacyMockPrisma.user.update as any)({ where: { id: last.id }, data: {} })
    }
    return (legacyMockPrisma.user.update as any)(args)
  })()
  // Sync tracked state
  const id = (args?.where?.id) ?? result?.id
  if (id) {
    const idx = tracked.users.findIndex(u => u.id === id)
    if (idx >= 0) {
      tracked.users[idx] = { ...tracked.users[idx], ...(args?.data ?? {}), ...result }
    }
  }
  return result
}) as any)
base.user.delete.mockImplementation((async (args?: any) => {
  const payload = (() => {
    if (!args) {
      const last = tracked.users[tracked.users.length - 1] ?? mockUser
      return { where: { id: last.id } }
    }
    return args
  })()
  const deleted = await (legacyMockPrisma.user.delete as any)(payload)
  // Remove from tracked store
  const delId = payload?.where?.id ?? deleted?.id
  if (delId) {
    const idx = tracked.users.findIndex(u => u.id === delId)
    if (idx >= 0) tracked.users.splice(idx, 1)
  }
  return deleted
}) as any)
base.user.deleteMany.mockImplementation((async () => {
  // Clear tracked store and delegate to legacy for compatibility
  const count = tracked.users.length
  tracked.users.length = 0
  const res = await (legacyMockPrisma.user.deleteMany as any)()
  const legacyCount = res?.count ?? 0
  const total = count + legacyCount
  return { count: total > 0 ? total : 1 }
}) as any)
// Support count used by services for pagination
// @ts-ignore - method exists on Prisma client
base.user.count?.mockImplementation?.((async (args: any = {}) => {
  const rows = await base.user.findMany(args as any)
  return rows.length
}) as any)

// Conversations
base.conversation.create.mockImplementation(legacyMockPrisma.conversation.create as any)
base.conversation.findUnique.mockImplementation(legacyMockPrisma.conversation.findUnique as any)
base.conversation.findFirst.mockImplementation((async (args: any) => {
  // Delegate to legacy findMany which applies participants.some.userId and includes
  const list = await (legacyMockPrisma.conversation.findMany as any)(args)
  const id = args?.where?.id
  if (id) {
    return list.find((c: any) => c.id === id) ?? null
  }
  return list[0] ?? null
}) as any)
base.conversation.findMany.mockImplementation(legacyMockPrisma.conversation.findMany as any)
base.conversation.delete.mockImplementation(legacyMockPrisma.conversation.delete as any)
base.conversation.deleteMany.mockImplementation(legacyMockPrisma.conversation.deleteMany as any)
base.conversation.update.mockImplementation(legacyMockPrisma.conversation.update as any)

// ConversationParticipant
base.conversationParticipant.create.mockImplementation(
  legacyMockPrisma.conversationParticipant.create as any
)
base.conversationParticipant.findUnique.mockImplementation(
  legacyMockPrisma.conversationParticipant.findUnique as any
)
base.conversationParticipant.findFirst.mockImplementation(
  legacyMockPrisma.conversationParticipant.findFirst as any
)
base.conversationParticipant.findMany.mockImplementation(
  legacyMockPrisma.conversationParticipant.findMany as any
)
base.conversationParticipant.update.mockImplementation(
  legacyMockPrisma.conversationParticipant.update as any
)
base.conversationParticipant.delete.mockImplementation(
  legacyMockPrisma.conversationParticipant.delete as any
)
base.conversationParticipant.deleteMany.mockImplementation(
  legacyMockPrisma.conversationParticipant.deleteMany as any
)
base.conversationParticipant.createMany.mockImplementation(
  legacyMockPrisma.conversationParticipant.createMany as any
)

// Messages
base.message.create.mockImplementation(legacyMockPrisma.message.create as any)
base.message.findUnique.mockImplementation(legacyMockPrisma.message.findUnique as any)
base.message.findMany.mockImplementation(legacyMockPrisma.message.findMany as any)
base.message.update.mockImplementation(legacyMockPrisma.message.update as any)
base.message.delete.mockImplementation(legacyMockPrisma.message.delete as any)
base.message.deleteMany.mockImplementation(legacyMockPrisma.message.deleteMany as any)

// Sessions
// Some tests interact with sessions; wire those too for compatibility
// If your schema differs, adjust these mappings accordingly
// @ts-ignore - relax types for wiring legacy behavior
base.session.create?.mockImplementation?.(legacyMockPrisma.session.create as any)
// @ts-ignore
base.session.findUnique?.mockImplementation?.(legacyMockPrisma.session.findUnique as any)
// @ts-ignore
base.session.delete?.mockImplementation?.(legacyMockPrisma.session.delete as any)
// @ts-ignore
base.session.deleteMany?.mockImplementation?.(legacyMockPrisma.session.deleteMany as any)

// Expose a Proxy that provides callable core client methods
export const prismaMock = new Proxy(base as any, {
  get(target, prop, receiver) {
    if (prop === '$connect') {
      return async () => undefined
    }
    if (prop === '$disconnect') {
      return async () => undefined
    }
    if (prop === '$queryRaw') {
      return async () => [{ test: 1, connected: 1 }]
    }
    if (prop === '$transaction') {
      return async (fn: any) => fn(base)
    }
    return Reflect.get(target, prop, receiver)
  }
})

// Reset helper that also clears our legacy tracked state
export function resetPrismaMock() {
  // bun-mock-prisma mocks are standard Bun mocks and can be cleared per test if needed
  // We rely on our legacyReset for stateful behavior cleanup
  legacyReset()
  // Also clear our tracked state to avoid test leakage
  tracked.users.length = 0
}

export { mockUser, mockConversation, mockMessage }
