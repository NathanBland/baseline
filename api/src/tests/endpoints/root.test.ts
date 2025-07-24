import { describe, it, expect } from 'bun:test'
import { app } from '../../index'

describe('Root Endpoint', () => {
  it('should return hello message', async () => {
    const response = await app.handle(new Request('http://localhost/'))
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('Hello Elysia')
  })

  it('should be accessible via GET method', async () => {
    const response = await app.handle(new Request('http://localhost/', {
      method: 'GET'
    }))
    expect(response.status).toBe(200)
  })

  it('should have correct content type', async () => {
    const response = await app.handle(new Request('http://localhost/'))
    expect(response.headers.get('content-type')).toContain('text/plain')
  })

  it('should reject POST method', async () => {
    const response = await app.handle(new Request('http://localhost/', {
      method: 'POST'
    }))
    expect(response.status).toBe(405)
  })
})
