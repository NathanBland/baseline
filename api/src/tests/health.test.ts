import { describe, it, expect } from 'bun:test'
import { app } from '../index'

describe('Health Endpoint', () => {
  it('should return health status', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    
    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('version', '1.0.0')
    expect(new Date(data.timestamp)).toBeInstanceOf(Date)
  })

  it('should have correct response headers', async () => {
    const response = await app.handle(new Request('http://localhost/health'))
    
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
