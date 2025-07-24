import { prisma } from './index.js'
import { ConversationType, ParticipantRole, MessageType } from '@prisma/client'
import { hashPassword } from '../auth/index.js'

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data in correct order (respecting foreign key constraints)
    console.log('🧹 Cleaning existing data...')
    await prisma.message.deleteMany()
    await prisma.conversationParticipant.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.session.deleteMany()
    await prisma.user.deleteMany()

    // Create test users
    console.log('👥 Creating test users...')
    const hashedPassword = await hashPassword('password123')

    const users = await Promise.all([
      prisma.user.create({
        data: {
          id: 'user_alice',
          email: 'alice@example.com',
          username: 'alice',
          firstName: 'Alice',
          lastName: 'Johnson',
          hashedPassword,
          emailVerified: true,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice'
        }
      }),
      prisma.user.create({
        data: {
          id: 'user_bob',
          email: 'bob@example.com',
          username: 'bob',
          firstName: 'Bob',
          lastName: 'Smith',
          hashedPassword,
          emailVerified: true,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob'
        }
      }),
      prisma.user.create({
        data: {
          id: 'user_charlie',
          email: 'charlie@example.com',
          username: 'charlie',
          firstName: 'Charlie',
          lastName: 'Brown',
          hashedPassword,
          emailVerified: true,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie'
        }
      }),
      prisma.user.create({
        data: {
          id: 'user_diana',
          email: 'diana@example.com',
          username: 'diana',
          firstName: 'Diana',
          lastName: 'Wilson',
          hashedPassword,
          emailVerified: true,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana'
        }
      }),
      prisma.user.create({
        data: {
          id: 'user_eve',
          email: 'eve@example.com',
          username: 'eve',
          firstName: 'Eve',
          lastName: 'Davis',
          hashedPassword,
          emailVerified: true,
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve'
        }
      })
    ])

    console.log(`✅ Created ${users.length} test users`)

    // Create conversations
    console.log('💬 Creating conversations...')
    
    // Direct conversation between Alice and Bob
    const directConversation = await prisma.conversation.create({
      data: {
        id: 'conv_alice_bob',
        title: 'Alice & Bob',
        description: 'Direct conversation between Alice and Bob',
        type: ConversationType.DIRECT
      }
    })

    // Group conversation for project discussion
    const projectConversation = await prisma.conversation.create({
      data: {
        id: 'conv_project_team',
        title: 'Project Team Discussion',
        description: 'Main channel for project coordination and updates',
        type: ConversationType.GROUP
      }
    })

    // Another group conversation for general chat
    const generalConversation = await prisma.conversation.create({
      data: {
        id: 'conv_general',
        title: 'General Chat',
        description: 'Casual conversation and team bonding',
        type: ConversationType.GROUP
      }
    })

    // Tech discussion group
    const techConversation = await prisma.conversation.create({
      data: {
        id: 'conv_tech_talk',
        title: 'Tech Talk',
        description: 'Technical discussions and knowledge sharing',
        type: ConversationType.GROUP
      }
    })

    console.log('✅ Created 4 conversations')

    // Add participants to conversations
    console.log('👥 Adding participants to conversations...')
    
    // Direct conversation participants
    await Promise.all([
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_alice',
          conversationId: 'conv_alice_bob',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_bob',
          conversationId: 'conv_alice_bob',
          role: ParticipantRole.MEMBER
        }
      })
    ])

    // Project team participants (Alice as admin)
    await Promise.all([
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_alice',
          conversationId: 'conv_project_team',
          role: ParticipantRole.ADMIN
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_bob',
          conversationId: 'conv_project_team',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_charlie',
          conversationId: 'conv_project_team',
          role: ParticipantRole.MODERATOR
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_diana',
          conversationId: 'conv_project_team',
          role: ParticipantRole.MEMBER
        }
      })
    ])

    // General chat participants (all users)
    await Promise.all([
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_alice',
          conversationId: 'conv_general',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_bob',
          conversationId: 'conv_general',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_charlie',
          conversationId: 'conv_general',
          role: ParticipantRole.ADMIN
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_diana',
          conversationId: 'conv_general',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_eve',
          conversationId: 'conv_general',
          role: ParticipantRole.MEMBER
        }
      })
    ])

    // Tech talk participants
    await Promise.all([
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_alice',
          conversationId: 'conv_tech_talk',
          role: ParticipantRole.MODERATOR
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_bob',
          conversationId: 'conv_tech_talk',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_charlie',
          conversationId: 'conv_tech_talk',
          role: ParticipantRole.MEMBER
        }
      }),
      prisma.conversationParticipant.create({
        data: {
          userId: 'user_eve',
          conversationId: 'conv_tech_talk',
          role: ParticipantRole.ADMIN
        }
      })
    ])

    console.log('✅ Added participants to all conversations')

    // Create messages with realistic timestamps
    console.log('📝 Creating messages...')
    
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    // Messages in direct conversation
    const directMessages = await Promise.all([
      prisma.message.create({
        data: {
          id: 'msg_alice_1',
          content: 'Hey Bob! How are you doing?',
          conversationId: 'conv_alice_bob',
          authorId: 'user_alice',
          type: MessageType.TEXT,
          createdAt: twoDaysAgo
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_bob_1',
          content: 'Hi Alice! I\'m doing great, thanks for asking. How about you?',
          conversationId: 'conv_alice_bob',
          authorId: 'user_bob',
          type: MessageType.TEXT,
          createdAt: new Date(twoDaysAgo.getTime() + 5 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_alice_2',
          content: 'I\'m good too! Are you ready for the project kickoff tomorrow?',
          conversationId: 'conv_alice_bob',
          authorId: 'user_alice',
          type: MessageType.TEXT,
          createdAt: new Date(twoDaysAgo.getTime() + 10 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_bob_2',
          content: 'Absolutely! I\'ve been preparing the technical specifications. Should be exciting!',
          conversationId: 'conv_alice_bob',
          authorId: 'user_bob',
          type: MessageType.TEXT,
          createdAt: new Date(twoDaysAgo.getTime() + 15 * 60 * 1000)
        }
      })
    ])

    // Messages in project team conversation
    const projectMessages = await Promise.all([
      prisma.message.create({
        data: {
          id: 'msg_alice_project_1',
          content: 'Welcome everyone to the project team! Let\'s make this a great collaboration.',
          conversationId: 'conv_project_team',
          authorId: 'user_alice',
          type: MessageType.TEXT,
          createdAt: oneDayAgo
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_charlie_project_1',
          content: 'Thanks Alice! Excited to work with everyone. I\'ll be helping coordinate the development tasks.',
          conversationId: 'conv_project_team',
          authorId: 'user_charlie',
          type: MessageType.TEXT,
          createdAt: new Date(oneDayAgo.getTime() + 10 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_bob_project_1',
          content: 'Looking forward to it! I\'ve uploaded the initial technical requirements to our shared drive.',
          conversationId: 'conv_project_team',
          authorId: 'user_bob',
          type: MessageType.TEXT,
          createdAt: new Date(oneDayAgo.getTime() + 20 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_diana_project_1',
          content: 'Great! I\'ll review them and prepare the UI mockups by end of week.',
          conversationId: 'conv_project_team',
          authorId: 'user_diana',
          type: MessageType.TEXT,
          createdAt: new Date(oneDayAgo.getTime() + 25 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_alice_project_2',
          content: 'Perfect! Let\'s schedule a sync meeting for Friday to review progress.',
          conversationId: 'conv_project_team',
          authorId: 'user_alice',
          type: MessageType.TEXT,
          createdAt: twoHoursAgo
        }
      })
    ])

    // Messages in general conversation
    const generalMessages = await Promise.all([
      prisma.message.create({
        data: {
          id: 'msg_charlie_general_1',
          content: 'Good morning everyone! ☀️ Hope you all have a great day!',
          conversationId: 'conv_general',
          authorId: 'user_charlie',
          type: MessageType.TEXT,
          createdAt: twoHoursAgo
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_eve_general_1',
          content: 'Morning Charlie! Coffee is definitely needed today ☕',
          conversationId: 'conv_general',
          authorId: 'user_eve',
          type: MessageType.TEXT,
          createdAt: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_diana_general_1',
          content: 'Same here! Anyone tried that new coffee shop downtown?',
          conversationId: 'conv_general',
          authorId: 'user_diana',
          type: MessageType.TEXT,
          createdAt: new Date(twoHoursAgo.getTime() + 8 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_bob_general_1',
          content: 'Yes! Their espresso is amazing. Highly recommend the caramel latte.',
          conversationId: 'conv_general',
          authorId: 'user_bob',
          type: MessageType.TEXT,
          createdAt: oneHourAgo
        }
      })
    ])

    // Messages in tech talk conversation with some replies
    const techMessage1 = await prisma.message.create({
      data: {
        id: 'msg_eve_tech_1',
        content: 'Has anyone tried the new TypeScript 5.3 features? The import attributes look really useful.',
        conversationId: 'conv_tech_talk',
        authorId: 'user_eve',
        type: MessageType.TEXT,
        createdAt: oneHourAgo
      }
    })

    const techMessages = await Promise.all([
      prisma.message.create({
        data: {
          id: 'msg_alice_tech_1',
          content: 'Yes! I\'ve been using them in our latest project. The JSON import assertions are game-changing.',
          conversationId: 'conv_tech_talk',
          authorId: 'user_alice',
          type: MessageType.TEXT,
          replyToId: 'msg_eve_tech_1',
          createdAt: new Date(oneHourAgo.getTime() + 10 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_charlie_tech_1',
          content: 'I need to catch up on the latest TS features. Any good resources you\'d recommend?',
          conversationId: 'conv_tech_talk',
          authorId: 'user_charlie',
          type: MessageType.TEXT,
          createdAt: new Date(oneHourAgo.getTime() + 15 * 60 * 1000)
        }
      }),
      prisma.message.create({
        data: {
          id: 'msg_bob_tech_1',
          content: 'The official TypeScript handbook is always up-to-date. Also check out Matt Pocock\'s content!',
          conversationId: 'conv_tech_talk',
          authorId: 'user_bob',
          type: MessageType.TEXT,
          createdAt: new Date(oneHourAgo.getTime() + 20 * 60 * 1000)
        }
      })
    ])

    const totalMessages = directMessages.length + projectMessages.length + generalMessages.length + techMessages.length + 1 // +1 for the parent tech message
    console.log(`✅ Created ${totalMessages} messages across all conversations`)

    // Update conversation timestamps to reflect latest activity
    await Promise.all([
      prisma.conversation.update({
        where: { id: 'conv_alice_bob' },
        data: { updatedAt: new Date(twoDaysAgo.getTime() + 15 * 60 * 1000) }
      }),
      prisma.conversation.update({
        where: { id: 'conv_project_team' },
        data: { updatedAt: twoHoursAgo }
      }),
      prisma.conversation.update({
        where: { id: 'conv_general' },
        data: { updatedAt: oneHourAgo }
      }),
      prisma.conversation.update({
        where: { id: 'conv_tech_talk' },
        data: { updatedAt: new Date(oneHourAgo.getTime() + 20 * 60 * 1000) }
      })
    ])

    console.log('✅ Updated conversation timestamps')

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   • ${users.length} users created`)
    console.log(`   • 4 conversations created`)
    console.log(`   • 13 participants added`)
    console.log(`   • ${totalMessages} messages created`)
    console.log('\n🔑 Test credentials:')
    console.log('   Email: alice@example.com, bob@example.com, charlie@example.com, diana@example.com, eve@example.com')
    console.log('   Password: password123 (for all users)')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
