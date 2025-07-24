import { describe, it, expect } from 'bun:test'
import { app } from '../../index'

describe('CORS Middleware', () => {
  it('should include CORS headers in OPTIONS request', async () => {
    const response = await app.handle(
      new Request('http://localhost/health', {
        method: 'OPTIONS'
      })
    )
    
    expect(response.headers.has('access-control-allow-origin')).toBe(true)
  })

  it('should include CORS headers in GET request', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    
    expect(response.headers.has('access-control-allow-origin')).toBe(true)
  })

  it('should handle preflight requests', async () => {
    const response = await app.handle(
      new Request('http://localhost/health', {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })
    )
    
    expect(response.status).toBe(204)
  })

  it('should allow cross-origin requests', async () => {
    const response = await app.handle(
      new Request('http://localhost/health', {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
    )
    
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})
