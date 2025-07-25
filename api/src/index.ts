import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'
import { websocket } from '@elysiajs/websocket'
import { initializeDatabase } from './db/index.js'
import { authModule } from './modules/auth'
import { conversationModule } from './modules/conversations'
import { messageModule } from './modules/messages'
import { websocketHandler } from './websocket/index.js'

// Initialize database connections
await initializeDatabase()

const app = new Elysia()
  // Testing plugins one by one to isolate validation error
  .use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.UI_URL || 'http://localhost:3000']
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
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
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Conversations', description: 'Conversation management endpoints' },
        { name: 'Messages', description: 'Message CRUD endpoints' }
      ]
    }
  }))
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }))
  .use(cookie())
  // .use(websocket()) // CAUSES createValidationError - incompatible with current Elysia version
  .use(authModule)
  .use(conversationModule)
  .use(messageModule)
  .get('/', () => new Response('Hello Elysia', {
    headers: { 'content-type': 'text/plain' }
  }))
  .post('/', () => new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain' }
  }))
  .put('/', () => new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain' }
  }))
  .delete('/', () => new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain' }
  }))
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
  .post('/health', () => new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain' }
  }))
  .put('/health', () => new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain' }
  }))
  .delete('/health', () => new Response('Method Not Allowed', {
    status: 405,
    headers: { 'content-type': 'text/plain' }
  }))
  .get('/ws', ({ headers }) => {
    // Check for proper WebSocket upgrade headers
    const upgrade = headers.upgrade?.toLowerCase()
    const connection = headers.connection?.toLowerCase()
    
    if (upgrade !== 'websocket' || !connection?.includes('upgrade')) {
      return new Response('Bad Request: WebSocket upgrade required', {
        status: 400,
        headers: { 'content-type': 'text/plain' }
      })
    }
    
    return new Response('Upgrade Required', {
      status: 426,
      headers: { 'content-type': 'text/plain' }
    })
  })
  .ws('/ws', {
    message: websocketHandler.message,
    open: websocketHandler.open,
    close: websocketHandler.close
  })

// Export app for testing
export { app }

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen({
    port: process.env.API_PORT || 3000,
    hostname: '0.0.0.0'
  }, () => {
    console.log('✅ Connected to PostgreSQL database')
    console.log(`🦊 Elysia is running at 0.0.0.0:${process.env.API_PORT || 3000}`)
  })
}
