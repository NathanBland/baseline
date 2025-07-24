import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'
import { websocket } from '@elysiajs/websocket'
import { initializeDatabase } from './db/index.js'
import { authRoutes } from './routes/auth.js'
import { websocketHandler } from './websocket/index.js'

// Initialize database connections
await initializeDatabase()

const app = new Elysia()
  // Testing plugins one by one to isolate validation error
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
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication endpoints' }
      ]
    }
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .use(cookie())
  // .use(websocket()) // CAUSES createValidationError - incompatible with current Elysia version
  .use(authRoutes)
  .get('/', () => 'Hello Elysia')
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    detail: {
      tags: ['Health'],
      summary: 'Health check endpoint',
      description: 'Returns the current status and version of the API'
    }
  })
  .ws('/ws', {
    message: websocketHandler.message,
    open: websocketHandler.open,
    close: websocketHandler.close
  })
  .listen({
    port: process.env.API_PORT || 3000,
    hostname: '0.0.0.0'
  })

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
