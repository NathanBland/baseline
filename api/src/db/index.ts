import { PrismaClient } from '@prisma/client'

// Prisma client with logging in development
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
})

// Initialize database connection
export async function initializeDatabase() {
  try {
    // Test Prisma connection
    await prisma.$connect()
    console.log('✅ Connected to PostgreSQL database')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Graceful shutdown
export async function closeDatabaseConnection() {
  await prisma.$disconnect()
  console.log('🔌 Database connection closed')
}

// Handle process termination
process.on('SIGINT', closeDatabaseConnection)
process.on('SIGTERM', closeDatabaseConnection)
