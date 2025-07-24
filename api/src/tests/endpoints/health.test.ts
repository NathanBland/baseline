import { describe, it, expect } from 'bun:test'
import { app } from '../../index'

describe('Health Endpoint', () => {
  it('should return 200 status', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    expect(response.status).toBe(200)
  })

  it('should return correct health data structure', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    const data = await response.json()
    
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('version', '1.0.0')
    expect(typeof data.timestamp).toBe('string')
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
  })

  it('should have correct content type', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should be accessible via GET method', async () => {
    const response = await app.handle(new Request('http://localhost/health', {
      method: 'GET'
    }))
    expect(response.status).toBe(200)
  })

  it('should reject non-GET methods', async () => {
    const response = await app.handle(new Request('http://localhost/health', {
      method: 'POST'
    }))
    expect(response.status).toBe(405)
  })
})
