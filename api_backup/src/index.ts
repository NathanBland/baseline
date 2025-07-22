import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'
import { staticPlugin } from '@elysiajs/static'
import { websocket } from '@elysiajs/websocket'
import { initializeDatabase } from './db/index.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { conversationRoutes } from './routes/conversations.js'
import { messageRoutes } from './routes/messages.js'
import { websocketHandler } from './websocket/index.js'

// Initialize database connections
await initializeDatabase()

const app = new Elysia()
  .use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.UI_URL || 'http://localhost:3000']
      : true,
    credentials: true
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Baseline API',
        version: '1.0.0',
        description: 'A modular baseline API built with ElysiaJS'
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management endpoints' },
        { name: 'Conversations', description: 'Conversation management endpoints' },
        { name: 'Messages', description: 'Message endpoints' }
      ]
    }
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .use(cookie())
  .use(staticPlugin({
    assets: 'public',
    prefix: '/static'
  }))
  .use(websocket())
  
  // Health check endpoint
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    tags: ['Health']
  })
  
  // API routes
  .group('/api/v1', (app) =>
    app
      .use(authRoutes)
      .use(userRoutes)
      .use(conversationRoutes)
      .use(messageRoutes)
  )
  
  // WebSocket endpoint
  .ws('/ws', websocketHandler)
  
  // Global error handler
  .onError(({ code, error, set }) => {
    console.error('API Error:', error)
    
    switch (code) {
      case 'VALIDATION':
        set.status = 400
        return {
          error: 'Validation Error',
          message: error.message
        }
      case 'NOT_FOUND':
        set.status = 404
        return {
          error: 'Not Found',
          message: 'The requested resource was not found'
        }
      default:
        set.status = 500
        return {
          error: 'Internal Server Error',
          message: process.env.NODE_ENV === 'production' 
            ? 'Something went wrong' 
            : error.message
        }
    }
  })

const port = process.env.API_PORT || 3001

app.listen(port, () => {
  console.log(`🚀 Baseline API is running on http://localhost:${port}`)
  console.log(`📚 API Documentation available at http://localhost:${port}/swagger`)
})

export default app
