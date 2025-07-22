import { prisma } from './index.js'
import { hashPassword } from '../auth/index.js'

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users
  const hashedPassword = await hashPassword('password123')
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Johnson',
        hashedPassword,
        emailVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        username: 'bob',
        firstName: 'Bob',
        lastName: 'Smith',
        hashedPassword,
        emailVerified: true
      }
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: {},
      create: {
        email: 'charlie@example.com',
        username: 'charlie',
        firstName: 'Charlie',
        lastName: 'Brown',
        hashedPassword,
        emailVerified: true
      }
    })
  ])

  console.log(`✅ Created ${users.length} users`)

  // Create test conversations
  const directConversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: users[0].id, role: 'MEMBER' },
          { userId: users[1].id, role: 'MEMBER' }
        ]
      }
    }
  })

  const groupConversation = await prisma.conversation.create({
    data: {
      title: 'Team Discussion',
      description: 'General team chat',
      type: 'GROUP',
      participants: {
        create: [
          { userId: users[0].id, role: 'OWNER' },
          { userId: users[1].id, role: 'MEMBER' },
          { userId: users[2].id, role: 'MEMBER' }
        ]
      }
    }
  })

  console.log('✅ Created conversations')

  // Create test messages
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        content: 'Hey Bob! How are you doing?',
        conversationId: directConversation.id,
        userId: users[0].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Hi Alice! I\'m doing great, thanks for asking!',
        conversationId: directConversation.id,
        userId: users[1].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Welcome to the team chat everyone! 👋',
        conversationId: groupConversation.id,
        userId: users[0].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Thanks Alice! Excited to be here!',
        conversationId: groupConversation.id,
        userId: users[1].id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Hello team! Looking forward to working together.',
        conversationId: groupConversation.id,
        userId: users[2].id
      }
    })
  ])

  console.log(`✅ Created ${messages.length} messages`)

  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
