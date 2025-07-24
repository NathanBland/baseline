// Bun-compatible mock for Prisma Client
// Simple mock functions that return predictable data for unit testing

export const mockUser = {
  id: 'mock-user-id',
  username: 'testuser',
  email: 'test@example.com',
  hashedPassword: '$2b$10$mock.hash',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

export const mockConversation = {
  id: 'mock-conversation-id',
  title: 'Test Conversation',
  type: 'GROUP' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  participants: [{
    id: 'mock-participant-id',
    userId: 'mock-user-id',
    conversationId: 'mock-conversation-id',
    role: 'ADMIN' as const,
    joinedAt: new Date('2024-01-01'),
    user: mockUser
  }],
  messages: [],
  _count: { messages: 0 }
}

export const mockMessage = {
  id: 'mock-message-id',
  content: 'Test message',
  type: 'TEXT' as const,
  conversationId: 'mock-conversation-id',
  authorId: 'mock-user-id',
  replyToId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  author: {
    id: 'mock-user-id',
    username: 'testuser'
  }
}

// Mock Prisma Client
export const mockPrisma = {
  user: {
    create: async () => mockUser,
    findUnique: async () => mockUser,
    findMany: async () => [mockUser],
    update: async () => mockUser,
    delete: async () => mockUser,
    deleteMany: async () => ({ count: 1 })
  },
  conversation: {
    create: async () => mockConversation,
    findUnique: async () => mockConversation,
    findMany: async () => [mockConversation],
    update: async () => mockConversation,
    delete: async () => mockConversation,
    deleteMany: async () => ({ count: 1 })
  },
  conversationParticipant: {
    create: async () => mockConversation.participants[0],
    findUnique: async () => mockConversation.participants[0],
    findMany: async () => mockConversation.participants,
    update: async () => mockConversation.participants[0],
    delete: async () => mockConversation.participants[0],
    deleteMany: async () => ({ count: 1 })
  },
  message: {
    create: async () => mockMessage,
    findUnique: async () => mockMessage,
    findMany: async () => [mockMessage],
    update: async () => mockMessage,
    delete: async () => mockMessage,
    deleteMany: async () => ({ count: 1 })
  },
  session: {
    create: async () => ({ id: 'mock-session-id', userId: 'mock-user-id', expiresAt: new Date() }),
    findUnique: async () => ({ id: 'mock-session-id', userId: 'mock-user-id', expiresAt: new Date() }),
    delete: async () => ({ id: 'mock-session-id', userId: 'mock-user-id', expiresAt: new Date() }),
    deleteMany: async () => ({ count: 1 })
  },
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  $queryRaw: async () => [{ test: 1, connected: 1 }],
  $transaction: async (fn: any) => fn(mockPrisma)
}
