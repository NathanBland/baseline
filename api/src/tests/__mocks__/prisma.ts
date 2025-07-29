// Bun-compatible mock for Prisma Client
// Simple mock functions that return predictable data for unit testing

export const mockUser = {
  id: 'user1', // Updated to match lucia mock
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
    userId: 'mock-user-with-conversations', // Static fallback for GET tests
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
  authorId: 'user1', // Updated to match consistent user ID
  replyToId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  author: {
    id: 'user1', // Updated to match consistent user ID
    username: 'testuser'
  },
  // Add conversation relationship with participants for authorization check
  conversation: {
    id: 'mock-conversation-id',
    participants: [{
      id: 'mock-participant-id',
      userId: 'mock-user-with-conversations',
      conversationId: 'mock-conversation-id',
      role: 'ADMIN' as const,
      joinedAt: new Date('2024-01-01'),
      user: mockUser
    }]
  }
}

export const mockSession = {
  id: 'mock-session-id',
  userId: 'mock-user-id',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

// Arrays to track created entities for BDD test isolation
let createdUsers: any[] = []
let createdConversations: any[] = []
let createdMessages: any[] = []
let createdParticipants: any[] = []

// Reset function to clear tracked state between tests (critical for BDD test isolation)
export const resetMockState = () => {
  createdConversations.length = 0
  createdMessages.length = 0
  createdUsers.length = 0
  createdParticipants.length = 0
}

// Comprehensive global state reset for complete Given-When-Then BDD test isolation
// This addresses cross-test state pollution that causes integration tests to fail in full suite
export const resetAllGlobalState = () => {
  // Reset all mock arrays
  resetMockState()
  
  // Clear any potential global state that might cause 403 auth errors
  // This ensures each test starts with a clean slate for true BDD isolation
  if (typeof global !== 'undefined') {
    // Clear any global session or auth state that might persist between tests
    delete (global as any).__testSessions
    delete (global as any).__testAuth
    delete (global as any).__testUsers
    delete (global as any).__testState
  }
  
  // Force garbage collection if available to clear any lingering references
  if (typeof global?.gc === 'function') {
    global.gc()
  }
}

// Mock Prisma Client
export const mockPrisma = {
  user: {
    create: async ({ data }: { data: any }) => {
      // Use input data to create a realistic user response
      const newUser = {
        ...mockUser,
        id: data.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        username: data.username || mockUser.username,
        email: data.email || mockUser.email,
        hashedPassword: data.hashedPassword || mockUser.hashedPassword
      }
      
      // Track the created user for realistic behavior
      createdUsers.push(newUser)
      
      return newUser
    },
    findUnique: async ({ where }: { where: any }) => {
      // Check tracked users first for input-driven behavior
      if (where.email) {
        const foundUser = createdUsers.find(user => user.email === where.email)
        if (foundUser) {
          return foundUser
        }
      }
      if (where.id) {
        const foundUser = createdUsers.find(user => user.id === where.id)
        if (foundUser) {
          return foundUser
        }
      }
      if (where.username) {
        const foundUser = createdUsers.find(user => user.username === where.username)
        if (foundUser) {
          return foundUser
        }
      }
      
      // Return null for non-existent users (enables proper BDD testing)
      return null
    },
    findMany: async () => createdUsers.length > 0 ? createdUsers : [mockUser],
    update: async ({ where, data }: { where: any, data: any }) => {
      // Find user to update
      let userToUpdate = createdUsers.find(user => 
        user.id === where.id || user.email === where.email
      )
      
      if (!userToUpdate) {
        userToUpdate = mockUser
      }
      
      // Update with input data
      const updatedUser = {
        ...userToUpdate,
        ...data
      }
      
      // Update in tracked users
      const index = createdUsers.findIndex(user => user.id === updatedUser.id)
      if (index >= 0) {
        createdUsers[index] = updatedUser
      }
      
      return updatedUser
    },
    delete: async ({ where }: { where: any }) => {
      const userToDelete = createdUsers.find(user => 
        user.id === where.id || user.email === where.email
      )
      
      if (userToDelete) {
        const index = createdUsers.findIndex(user => user.id === userToDelete.id)
        if (index >= 0) {
          createdUsers.splice(index, 1)
        }
        return userToDelete
      }
      
      return mockUser
    },
    deleteMany: async () => {
      const count = createdUsers.length
      createdUsers.length = 0
      return { count }
    }
  },
  conversation: {
    create: async ({ data }: { data: any }) => {
      // Use input data to create a realistic conversation response
      const newConversation = {
        ...mockConversation,
        id: data.id || mockConversation.id,
        title: data.title || mockConversation.title,
        type: data.type || mockConversation.type,
        participants: data.participants || mockConversation.participants
      }
      
      // Track the created conversation for realistic behavior
      createdConversations.push(newConversation)
      
      // ALSO track participants for authorization checks
      if (data.participants) {
        data.participants.forEach((participant: any) => {
          createdParticipants.push({
            ...participant,
            conversationId: newConversation.id
          })
        })
      }
      
      return newConversation
    },
    findUnique: async (query: any) => {
      const { where, include } = query || {}
      
      // Check tracked conversations first (for POST conversation BDD compliance)
      if (where && where.id) {
        const trackedConversation = createdConversations.find(conv => conv.id === where.id)
        if (trackedConversation) {
          // Include related messages if requested
          const relatedMessages = createdMessages.filter(msg => msg.conversationId === where.id)
          return {
            ...trackedConversation,
            messages: include?.messages ? relatedMessages.slice(0, 1) : undefined,
            _count: include?._count ? { messages: relatedMessages.length } : undefined
          }
        }
        
        // Return null for non-existent IDs to enable 404 testing
        if (where.id !== mockConversation.id) {
          return null
        }
      }
      
      // Fallback to static mock
      return mockConversation
    },
    findMany: async (query: any) => {
      // For conversation queries, check if we should return empty results
      const { where, take, skip } = query || {}
      // Check if this is the standard query: { participants: { some: { userId } } }
      if (where && where.participants && where.participants.some && where.participants.some.userId) {
        const userId = where.participants.some.userId
        
        // Return tracked conversations for the user (input-driven behavior)
        let userConversations = createdConversations.filter(conv => 
          conv.participants.some((p: any) => p.userId === userId)
        ).map(conv => {
          // Include related messages for each conversation
          const relatedMessages = createdMessages.filter(msg => msg.conversationId === conv.id)
          return {
            ...conv,
            messages: relatedMessages.slice(0, 1), // Take 1 as per service query
            _count: { messages: relatedMessages.length }
          }
        })
        
        // Apply pagination parameters if provided
        if (skip !== undefined) {
          userConversations = userConversations.slice(skip)
        }
        if (take !== undefined) {
          userConversations = userConversations.slice(0, take)
        }
        
        // If user has tracked conversations, return them
        if (userConversations.length > 0) {
          return userConversations
        }
        
        // Fallback: check if user matches static mock participant
        if (mockConversation.participants.some(p => p.userId === userId)) {
          let fallbackConversations = [mockConversation]
          
          // Apply pagination to fallback as well
          if (skip !== undefined) {
            fallbackConversations = fallbackConversations.slice(skip)
          }
          if (take !== undefined) {
            fallbackConversations = fallbackConversations.slice(0, take)
          }
          
          return fallbackConversations
        }
        
        return [] // Empty array for users not in any conversations
      }
      
      // Default behavior for other queries - return tracked conversations or fallback with pagination
      let allConversations = createdConversations.length > 0 ? createdConversations : [mockConversation]
      
      // Apply pagination parameters if provided
      if (skip !== undefined) {
        allConversations = allConversations.slice(skip)
      }
      if (take !== undefined) {
        allConversations = allConversations.slice(0, take)
      }
      
      return allConversations
    },
    delete: async () => mockConversation,
    deleteMany: async () => ({ count: 1 }),
    update: async ({ where, data, include }: any) => {
      // Update input-driven conversation for BDD compliance
      const updatedConversation = {
        ...mockConversation,
        id: where.id,
        ...data,
        updatedAt: new Date(),
        participants: include?.participants ? mockConversation.participants : undefined,
        messages: include?.messages ? mockConversation.messages : undefined,
        _count: include?._count ? { messages: mockConversation.messages.length } : undefined
      }
      createdConversations = createdConversations.map(c => 
        c.id === where.id ? updatedConversation : c
      )
      return updatedConversation
    }
  },
  conversationParticipant: {
    create: async ({ data, include }: { data: any, include?: any }) => {
      // Track created participants for BDD test isolation
      const participant = {
        id: `participant-${Date.now()}`,
        ...data,
        joinedAt: new Date(),
        user: include?.user ? mockUser : undefined
      }
      createdParticipants.push(participant)
      return participant
    },
    findUnique: async () => mockConversation.participants[0],
    findFirst: async (query: any) => {
      const { where } = query || {}
      if (where && where.conversationId && where.userId) {
        // Check createdParticipants array first
        const participant = createdParticipants.find(p => 
          p.conversationId === where.conversationId && 
          p.userId === where.userId &&
          (!where.role || (where.role.in ? where.role.in.includes(p.role) : p.role === where.role))
        )
        if (participant) return participant

        // Check participants inside createdConversations
        for (const conversation of createdConversations) {
          if (conversation.id === where.conversationId) {
            const participant = conversation.participants?.find(p => 
              p.userId === where.userId &&
              (!where.role || (where.role.in ? where.role.in.includes(p.role) : p.role === where.role))
            )
            if (participant) return participant
          }
        }

        // Check fallback static mockConversation participants
        if (mockConversation.id === where.conversationId) {
          const participant = mockConversation.participants?.find(p => 
            p.userId === where.userId &&
            (!where.role || (where.role.in ? where.role.in.includes(p.role) : p.role === where.role))
          )
          if (participant) return participant
        }
      }
      
      // Handle other query patterns for backward compatibility
      return createdParticipants[0] || mockConversation.participants[0] || null
    },
    findMany: async () => mockConversation.participants,
    update: async () => mockConversation.participants[0],
    delete: async () => mockConversation.participants[0],
    deleteMany: async () => ({ count: 1 }),
    createMany: async ({ data }: { data: any[] }) => {
      // Track created participants for BDD compliance
      const participants = data.map((participantData, index) => ({
        id: `participant-${Date.now()}-${index}`,
        ...participantData,
        joinedAt: new Date()
      }))
      createdParticipants.push(...participants)
      return { count: participants.length }
    }
  },
  message: {
    create: async ({ data }: { data: any }) => {
      // Use input data to create a realistic message response
      const newMessage = {
        ...mockMessage,
        content: data.content,
        conversationId: data.conversationId,
        authorId: data.authorId,
        replyToId: data.replyToId || null,
        type: data.type || 'TEXT'
      }
      
      // Track the created message for realistic behavior
      createdMessages.push(newMessage)
      
      return newMessage
    },
    findUnique: async (query: any) => {
      // Return null for non-existent IDs to enable 404 testing
      const { where } = query || {}
      if (where && where.id && where.id !== mockMessage.id) {
        return null
      }
      return mockMessage
    },
    findMany: async (query: any) => {
      // For search queries, return messages that match the search term
      const { where } = query || {}
      if (where && where.content && where.content.contains) {
        const searchTerm = where.content.contains
        // Return mock message with search term if it matches
        if (searchTerm === 'Hello') {
          return [{
            ...mockMessage,
            content: 'Hello world'
          }]
        }
        // Return empty array for non-matching search terms
        return []
      }
      // Default behavior for other queries
      return [mockMessage]
    },
    update: async ({ data }: { data: any }) => {
      // Use input data to create a realistic updated message response
      return {
        ...mockMessage,
        content: data.content || mockMessage.content,
        updatedAt: new Date() // Update timestamp
      }
    },
    delete: async () => mockMessage,
    deleteMany: async () => ({ count: 1 })
  },
  session: {
    create: async () => mockSession,
    findUnique: async ({ where }: any) => {
      // Return mock session if looking for our test session ID
      if (where?.id === 'mock-session-id') {
        return {
          ...mockSession,
          user: mockUser
        }
      }
      return null
    },
    delete: async () => mockSession,
    deleteMany: async () => ({ count: 1 })
  },
  $connect: async () => undefined,
  $disconnect: async () => undefined,
  $queryRaw: async () => [{ test: 1, connected: 1 }],
  $transaction: async (fn: any) => fn(mockPrisma)
}
