import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'
import { websocket } from '@elysiajs/websocket'
import { initializeDatabase } from './db/index.js'

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
        { name: 'Health', description: 'Health check endpoints' }
      ]
    }
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .use(cookie())
  .use(websocket())
  .get('/', () => 'Hello Elysia')
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }))
  .ws('/ws', {
    message(ws, message) {
      console.log('WebSocket message received:', message)
      ws.send(`Echo: ${message}`)
    },
    open(ws) {
      console.log('WebSocket connection opened')
      ws.send('Welcome to Baseline API WebSocket!')
    },
    close() {
      console.log('WebSocket connection closed')
    }
  })
  .listen({
    port: process.env.API_PORT || 3001,
    hostname: '0.0.0.0'
  })

console.log(`🦊 Elysia is running at http://localhost:${process.env.API_PORT || 3001}`)
console.log(`📚 API Documentation available at http://localhost:${process.env.API_PORT || 3001}/swagger`)

export default app
