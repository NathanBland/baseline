import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'

// Prisma client with logging in development
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// Redis client
export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
})

// Initialize connections
export async function initializeDatabase() {
  try {
    // Test Prisma connection
    await prisma.$connect()
    console.log('✅ Connected to PostgreSQL')

    // Connect to Redis
    await redis.connect()
    console.log('✅ Connected to Redis')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Graceful shutdown
export async function closeDatabaseConnections() {
  await prisma.$disconnect()
  await redis.quit()
  console.log('🔌 Database connections closed')
}

// Handle process termination
process.on('SIGINT', closeDatabaseConnections)
process.on('SIGTERM', closeDatabaseConnections)
