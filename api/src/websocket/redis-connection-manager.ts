import Redis from 'ioredis'

export interface WebSocketConnection {
  wsId: string
  userId: string
  conversationIds: Set<string>
}

class RedisConnectionManager {
  private redis: Redis
  private localConnections = new Map<string, WebSocketConnection>()

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!,{
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000
    })

    this.redis.on('error', (error: Error) => {
      console.error('Redis connection error:', error)
    })

    this.redis.on('connect', () => {
      console.log('✅ Redis connected for WebSocket management')
    })
  }

  async addConnection(wsId: string, userId: string, conversationIds: Set<string> = new Set()): Promise<void> {
    const connection: WebSocketConnection = {
      wsId,
      userId,
      conversationIds
    }

    // Store locally for fast access
    this.localConnections.set(wsId, connection)

    // Store in Redis for cross-server communication
    await this.redis.hset(`ws:user:${userId}`, wsId, JSON.stringify({
      wsId,
      conversationIds: Array.from(conversationIds),
      timestamp: Date.now()
    }))

    // Add to user -> wsId mapping
    await this.redis.sadd(`ws:connections:${userId}`, wsId)

    console.log(`✅ WebSocket connection mapped: user ${userId} -> ws ${wsId}`)
  }

  async removeConnection(wsId: string): Promise<void> {
    const connection = this.localConnections.get(wsId)
    if (!connection) return

    // Remove from local storage
    this.localConnections.delete(wsId)

    // Remove from Redis
    await this.redis.hdel(`ws:user:${connection.userId}`, wsId)
    await this.redis.srem(`ws:connections:${connection.userId}`, wsId)

    // Clean up empty user mappings
    const remainingConnections = await this.redis.scard(`ws:connections:${connection.userId}`)
    if (remainingConnections === 0) {
      await this.redis.del(`ws:connections:${connection.userId}`)
    }

    console.log(`✅ WebSocket connection removed: user ${connection.userId} -> ws ${wsId}`)
  }

  async joinConversation(wsId: string, conversationId: string): Promise<void> {
    const connection = this.localConnections.get(wsId)
    if (!connection) return

    // Update local connection
    connection.conversationIds.add(conversationId)

    // Update Redis
    await this.redis.hset(`ws:user:${connection.userId}`, wsId, JSON.stringify({
      wsId,
      conversationIds: Array.from(connection.conversationIds),
      timestamp: Date.now()
    }))

    console.log(`✅ User ${connection.userId} joined conversation ${conversationId}`)
  }

  async leaveConversation(wsId: string, conversationId: string): Promise<void> {
    const connection = this.localConnections.get(wsId)
    if (!connection) return

    // Update local connection
    connection.conversationIds.delete(conversationId)

    // Update Redis
    await this.redis.hset(`ws:user:${connection.userId}`, wsId, JSON.stringify({
      wsId,
      conversationIds: Array.from(connection.conversationIds),
      timestamp: Date.now()
    }))

    console.log(`✅ User ${connection.userId} left conversation ${conversationId}`)
  }

  getLocalConnection(wsId: string): WebSocketConnection | undefined {
    return this.localConnections.get(wsId)
  }

  getAllLocalConnections(): Map<string, WebSocketConnection> {
    return this.localConnections
  }

  async getUserConnections(userId: string): Promise<string[]> {
    return await this.redis.smembers(`ws:connections:${userId}`)
  }

  async getActiveUserIds(): Promise<string[]> {
    const keys = await this.redis.keys('ws:connections:*')
    return keys.map((key: string) => key.replace('ws:connections:', ''))
  }

  async cleanup(): Promise<void> {
    await this.redis.quit()
  }
}

export const redisConnectionManager = new RedisConnectionManager()
