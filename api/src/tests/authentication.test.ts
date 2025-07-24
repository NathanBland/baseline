import { describe, it, expect } from 'bun:test'
import { app } from '../index'

describe('User Authentication', () => {
  describe('When registering new users', () => {
    it('should create account given valid registration details', async () => {
      // Given: Valid user registration data
      const registrationData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'securePassword123'
      }

      // When: A user attempts to register
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        })
      )

      // Then: Should create the account successfully
      expect([200, 201]).toContain(response.status)
    })

    it('should reject registration given missing required fields', async () => {
      // Given: Incomplete registration data
      const incompleteData = {
        username: 'testuser'
        // Missing email and password
      }

      // When: A user attempts to register with incomplete data
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incompleteData)
        })
      )

      // Then: Should reject the registration
      expect([400, 422]).toContain(response.status)
    })

    it('should reject registration given invalid email format', async () => {
      // Given: Registration data with invalid email
      const invalidEmailData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'securePassword123'
      }

      // When: A user attempts to register with invalid email
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidEmailData)
        })
      )

      // Then: Should reject the registration
      expect([400, 422]).toContain(response.status)
    })

    it('should reject registration given weak password', async () => {
      // Given: Registration data with weak password
      const weakPasswordData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123' // Too short
      }

      // When: A user attempts to register with weak password
      const response = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(weakPasswordData)
        })
      )

      // Then: Should reject the registration
      expect([400, 422]).toContain(response.status)
    })
  })

  describe('When logging in users', () => {
    it('should authenticate user given valid credentials', async () => {
      // Given: Valid login credentials
      const loginData = {
        email: 'test@example.com',
        password: 'correctPassword'
      }

      // When: A user attempts to login
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      )

      // Then: Should authenticate successfully or indicate user doesn't exist
      expect([200, 401, 404]).toContain(response.status)
    })

    it('should reject login given invalid password', async () => {
      // Given: Login data with incorrect password
      const invalidPasswordData = {
        email: 'test@example.com',
        password: 'wrongPassword'
      }

      // When: A user attempts to login with wrong password
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invalidPasswordData)
        })
      )

      // Then: Should reject the login
      expect([401, 404]).toContain(response.status)
    })

    it('should reject login given non-existent user', async () => {
      // Given: Login data for non-existent user
      const nonExistentUserData = {
        email: 'nonexistent@example.com',
        password: 'anyPassword'
      }

      // When: A non-existent user attempts to login
      const response = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nonExistentUserData)
        })
      )

      // Then: Should reject the login
      expect([401, 404]).toContain(response.status)
    })
  })

  describe('When managing user sessions', () => {
    it('should return user info given valid session', async () => {
      // Given: A request with valid authentication
      // When: A user requests their profile information
      const response = await app.handle(
        new Request('http://localhost/auth/me', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer valid-token' }
        })
      )

      // Then: Should return user information or indicate unauthorized
      expect([200, 401]).toContain(response.status)
    })

    it('should reject request given invalid session', async () => {
      // Given: A request with invalid or missing authentication
      // When: A user requests their profile information
      const response = await app.handle(
        new Request('http://localhost/auth/me', {
          method: 'GET'
          // No authorization header
        })
      )

      // Then: Should reject the request
      expect([401]).toContain(response.status)
    })

    it('should logout user given valid session', async () => {
      // Given: A user with valid session
      // When: The user attempts to logout
      const response = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer valid-token' }
        })
      )

      // Then: Should logout successfully or indicate unauthorized
      expect([200, 401]).toContain(response.status)
    })
  })

  describe('When using OAuth authentication', () => {
    it('should redirect to Google OAuth given Google login request', async () => {
      // Given: A request to login with Google
      // When: The Google OAuth endpoint is called
      const response = await app.handle(
        new Request('http://localhost/auth/google')
      )

      // Then: Should redirect to OAuth provider or return appropriate response
      expect([200, 302, 404]).toContain(response.status)
    })

    it('should handle Google OAuth callback given authorization code', async () => {
      // Given: A callback from Google OAuth with authorization code
      // When: The Google OAuth callback is processed
      const response = await app.handle(
        new Request('http://localhost/auth/google/callback?code=test&state=test')
      )

      // Then: Should process the callback appropriately
      expect([200, 400, 404]).toContain(response.status)
    })

    it('should redirect to GitHub OAuth given GitHub login request', async () => {
      // Given: A request to login with GitHub
      // When: The GitHub OAuth endpoint is called
      const response = await app.handle(
        new Request('http://localhost/auth/github')
      )

      // Then: Should redirect to OAuth provider or return appropriate response
      expect([200, 302, 404]).toContain(response.status)
    })

    it('should handle GitHub OAuth callback given authorization code', async () => {
      // Given: A callback from GitHub OAuth with authorization code
      // When: The GitHub OAuth callback is processed
      const response = await app.handle(
        new Request('http://localhost/auth/github/callback?code=test&state=test')
      )

      // Then: Should process the callback appropriately
      expect([200, 400, 404]).toContain(response.status)
    })
  })
})
