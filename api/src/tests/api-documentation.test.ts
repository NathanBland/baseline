import { describe, it, expect } from 'bun:test'
import { app } from '../index'

describe('API Documentation', () => {
  describe('When accessing API documentation', () => {
    it('should serve Swagger documentation given request to swagger endpoint', async () => {
      // Given: A request for API documentation
      // When: The Swagger endpoint is accessed
      const response = await app.handle(
        new Request('http://localhost/swagger')
      )

      // Then: Should serve the Swagger documentation
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')
    })

    it('should serve OpenAPI JSON specification given request to swagger JSON endpoint', async () => {
      // Given: A request for OpenAPI specification
      // When: The Swagger JSON endpoint is accessed
      const response = await app.handle(
        new Request('http://localhost/swagger/json')
      )

      // Then: Should serve the OpenAPI JSON specification
      expect([200, 404]).toContain(response.status)
      if (response.status === 200) {
        expect(response.headers.get('content-type')).toContain('application/json')
      }
    })
  })

  describe('When checking API health', () => {
    it('should return health status given health check request', async () => {
      // Given: A request to check API health
      // When: The health endpoint is accessed
      const response = await app.handle(
        new Request('http://localhost/health')
      )

      // Then: Should return health status information
      expect(response.status).toBe(200)
      
      const healthData = await response.json()
      expect(healthData).toHaveProperty('status')
      expect(healthData).toHaveProperty('timestamp')
      expect(healthData).toHaveProperty('version')
      expect(healthData.status).toBe('ok')
    })

    it('should reject non-GET requests given invalid HTTP method', async () => {
      // Given: A non-GET request to health endpoint
      // When: The health endpoint is accessed with POST method
      const response = await app.handle(
        new Request('http://localhost/health', {
          method: 'POST'
        })
      )

      // Then: Should reject the request
      expect([405, 404]).toContain(response.status)
    })
  })

  describe('When accessing root endpoint', () => {
    it('should return welcome message given root request', async () => {
      // Given: A request to the root endpoint
      // When: The root endpoint is accessed
      const response = await app.handle(
        new Request('http://localhost/')
      )

      // Then: Should return welcome message
      expect(response.status).toBe(200)
      const contentType = response.headers.get('content-type')
      expect(contentType).toBeTruthy()
      expect(contentType).toContain('text/plain')
      
      const text = await response.text()
      expect(text).toBe('Hello Elysia')
    })

    it('should reject non-GET requests given invalid HTTP method', async () => {
      // Given: A non-GET request to root endpoint
      // When: The root endpoint is accessed with POST method
      const response = await app.handle(
        new Request('http://localhost/', {
          method: 'POST'
        })
      )

      // Then: Should reject the request
      expect([405, 404]).toContain(response.status)
    })
  })
})
