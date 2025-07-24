import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { app } from '../../index'
import { 
  cleanupTestData, 
  generateTestData, 
  extractSessionFromResponse,
  createAuthHeaders,
  type TestUser 
} from './setup'

describe('User Authentication Integration', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Complete User Registration Flow', () => {
    it('should allow user to register, login, access profile, and logout', async () => {
      // Given: A new user wants to create an account
      const testData = generateTestData('auth_flow')
      const registrationData = {
        username: testData.username,
        email: testData.email,
        password: testData.password
      }

      // When: User registers for a new account
      const registerResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        })
      )

      // Then: Registration should succeed
      expect(registerResponse.status).toBe(200)
      const registerData = await registerResponse.json()
      expect(registerData.user).toBeDefined()
      expect(registerData.user.username).toBe(testData.username)
      expect(registerData.user.email).toBe(testData.email)
      expect(registerData.user.hashedPassword).toBeUndefined() // Should not expose password
      expect(registerData.sessionId).toBeDefined()

      const sessionId = registerData.sessionId

      // When: User accesses their profile with valid session
      const profileResponse = await app.handle(
        new Request('http://localhost/auth/me', {
          method: 'GET',
          headers: createAuthHeaders(sessionId)
        })
      )

      // Then: Should return user profile information
      expect(profileResponse.status).toBe(200)
      const profileData = await profileResponse.json()
      expect(profileData.user).toBeDefined()
      expect(profileData.user.username).toBe(testData.username)
      expect(profileData.user.email).toBe(testData.email)

      // When: User logs out
      const logoutResponse = await app.handle(
        new Request('http://localhost/auth/logout', {
          method: 'POST',
          headers: createAuthHeaders(sessionId)
        })
      )

      // Then: Logout should succeed
      expect(logoutResponse.status).toBe(200)
      const logoutData = await logoutResponse.json()
      expect(logoutData.success).toBe(true)

      // When: User tries to access profile after logout
      const profileAfterLogoutResponse = await app.handle(
        new Request('http://localhost/auth/me', {
          method: 'GET',
          headers: createAuthHeaders(sessionId)
        })
      )

      // Then: Should be unauthorized
      expect(profileAfterLogoutResponse.status).toBe(401)
    })

    it('should allow user to login with existing credentials', async () => {
      // Given: A user has already registered
      const testData = generateTestData('login_flow')
      const registrationData = {
        username: testData.username,
        email: testData.email,
        password: testData.password
      }

      // Register the user first
      const registerResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        })
      )
      expect(registerResponse.status).toBe(200)

      // When: User logs in with correct credentials
      const loginData = {
        email: testData.email,
        password: testData.password
      }

      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      )

      // Then: Login should succeed
      expect(loginResponse.status).toBe(200)
      const loginResponseData = await loginResponse.json()
      expect(loginResponseData.user).toBeDefined()
      expect(loginResponseData.user.username).toBe(testData.username)
      expect(loginResponseData.user.email).toBe(testData.email)
      expect(loginResponseData.sessionId).toBeDefined()

      // When: User accesses profile with login session
      const profileResponse = await app.handle(
        new Request('http://localhost/auth/me', {
          method: 'GET',
          headers: createAuthHeaders(loginResponseData.sessionId)
        })
      )

      // Then: Should return user profile
      expect(profileResponse.status).toBe(200)
      const profileData = await profileResponse.json()
      expect(profileData.user.username).toBe(testData.username)
    })
  })

  describe('Authentication Error Scenarios', () => {
    it('should reject duplicate user registration', async () => {
      // Given: A user has already registered
      const testData = generateTestData('duplicate_user')
      const registrationData = {
        username: testData.username,
        email: testData.email,
        password: testData.password
      }

      // Register user first time
      const firstRegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        })
      )
      expect(firstRegisterResponse.status).toBe(200)

      // When: Same user tries to register again
      const secondRegisterResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        })
      )

      // Then: Should reject duplicate registration
      expect(secondRegisterResponse.status).toBe(409)
    })

    it('should reject login with wrong password', async () => {
      // Given: A user has registered
      const testData = generateTestData('wrong_password')
      const registrationData = {
        username: testData.username,
        email: testData.email,
        password: testData.password
      }

      const registerResponse = await app.handle(
        new Request('http://localhost/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        })
      )
      expect(registerResponse.status).toBe(200)

      // When: User tries to login with wrong password
      const loginData = {
        email: testData.email,
        password: 'WrongPassword123!'
      }

      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      )

      // Then: Should reject login
      expect(loginResponse.status).toBe(401)
    })

    it('should reject login for non-existent user', async () => {
      // Given: A non-existent user
      const testData = generateTestData('nonexistent')
      
      // When: Non-existent user tries to login
      const loginData = {
        email: testData.email,
        password: testData.password
      }

      const loginResponse = await app.handle(
        new Request('http://localhost/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      )

      // Then: Should reject login
      expect(loginResponse.status).toBe(401)
    })
  })
})
