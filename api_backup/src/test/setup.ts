import { beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '../db/index.js'

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect()
})

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Clean up database before each test
  await prisma.message.deleteMany()
  await prisma.conversationParticipant.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
})
