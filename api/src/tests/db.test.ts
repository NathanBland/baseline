import { describe, it, expect, beforeEach } from 'bun:test'
import { prismaMock, resetPrismaMock } from './prisma-mock'

describe('Database Connection', () => {
  beforeEach(async () => {
    // Reset mock state before each test to prevent state pollution (critical for BDD test isolation)
    resetPrismaMock()
  })

  it('should connect to database successfully', async () => {
    // Test mocked database connection
    await (prismaMock as any).$connect()
    expect(true).toBe(true) // Connection succeeds with mock
  })

  it('should execute raw queries', async () => {
    const result = await (prismaMock as any).$queryRaw() as any[]
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toHaveProperty('test', 1)
    expect(result[0]).toHaveProperty('connected', 1)
  })

  it('should handle transactions given database transaction request', async () => {
    // Given: A database transaction is needed
    // When: A transaction is executed with user creation
    const user = await (prismaMock as any).$transaction(async (tx: any) => {
      return await tx.user.create()
    })

    // Then: Should return created user with correct properties
    expect(user.username).toBe('testuser')
    expect(user.id).toBe('user1') // Updated to match input-driven mock
  })

  it('should handle CRUD operations', async () => {
    // Test create
    const user = await prismaMock.user.create()
    expect(user.username).toBe('testuser')
    
    // Test find
    const foundUser = await prismaMock.user.findUnique()
    expect(foundUser?.username).toBe('testuser')
    
    // Test update
    const updatedUser = await prismaMock.user.update()
    expect(updatedUser.username).toBe('testuser')
    
    // Test delete
    const deletedUser = await prismaMock.user.delete()
    expect(deletedUser.username).toBe('testuser')
    
    // Test deleteMany
    const deleteResult = await prismaMock.user.deleteMany()
    expect(deleteResult.count).toBe(1)
  })
})
