import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'
// import { websocket } from '@elysiajs/websocket' // Incompatible with current Elysia version
import { initializeDatabase } from './db/index.js'
import { authModule } from './modules/auth'
import { conversationModule } from './modules/conversations'
import { messageModule } from './modules/messages'
import { websocketHandler } from './websocket/index.js'

// Initialize database connections
await initializeDatabase()

// Configure CORS allowed origins
const getAllowedOrigins = (): string[] => {
  // Debug environment variables
  console.log('CORS Debug: NODE_ENV =', process.env.NODE_ENV)
  console.log('CORS Debug: BUN NODE_ENV =', Bun.env.NODE_ENV)
  console.log('CORS Debug: UI_URL =', process.env.UI_URL)
  console.log('CORS Debug: CORS_ALLOWED_ORIGINS =', process.env.CORS_ALLOWED_ORIGINS)
  console.log(process.env);
  console.log(Bun.env);
  
  const env = (Bun.env.NODE_ENV || process.env.NODE_ENV || 'development').trim().toLowerCase()
  
  console.log('CORS Debug: Final env value =', env)
  
  if (env === 'production') {
    // In production, use CORS_ALLOWED_ORIGINS or fallback to UI_URL
    const corsOrigins = process.env.CORS_ALLOWED_ORIGINS
    if (corsOrigins && corsOrigins.trim()) {
      const origins = corsOrigins.split(',').map(origin => origin.trim())
      console.log('CORS: Using CORS_ALLOWED_ORIGINS:', origins)
      return origins
    }
    
    // Fallback origins for production
    const fallbackOrigins = [
      process.env.UI_URL || 'https://baseline.aqueous.network',
      'https://baseline.aqueous.network',
    ].filter(Boolean)
    
    console.log('CORS: Using production fallback origins:', fallbackOrigins)
    return [...new Set(fallbackOrigins)] // Remove duplicates
  }
  
  // Development origins
  const devOrigins = [
    'http://localhost:5173',
    'http://localhost:3000', 
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ]
  
  console.log('CORS: Using development origins:', devOrigins)
  return devOrigins
}

const app = new Elysia()
  .use(cors({
    origin: (request: Request) => {
      const origin = request.headers.get('origin')
      const allowedOrigins = getAllowedOrigins()
      
      console.log('CORS Request Origin:', origin)
      console.log('CORS Allowed Origins:', allowedOrigins)
      console.log('CORS Request Method:', request.method)
      console.log('CORS Request URL:', request.url)
      
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        console.log('CORS: Allowing request with no origin')
        return true
      }
      
      // Check if the origin is in the allowed list
      const isAllowed = allowedOrigins.includes(origin)
      console.log(`CORS: Origin ${origin} is ${isAllowed ? 'allowed' : 'denied'}`)
      return isAllowed
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept', 'Origin'],
    exposeHeaders: ['Set-Cookie', 'Content-Length', 'Content-Range'],
    maxAge: 86400 // Cache preflight for 24 hours
  }))
  // Explicit OPTIONS handler for all routes
  .options('*', () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Content-Length': '0'
      }
    })
  })
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
  // WebSocket functionality temporarily disabled due to plugin incompatibility
  .use(authModule)
  .use(conversationModule)
  .use(messageModule)
  .use((await import('./modules/users')).userModule)
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
