import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { lucia } from './index.js'
import { prisma } from '../db/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-256-bit-secret'
const JWT_ISSUER = 'baseline-api'
const JWT_AUDIENCE = 'baseline-web'
const ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days

const secret = new TextEncoder().encode(JWT_SECRET)

export interface JwtPayload extends JWTPayload {
  userId: string
  sessionId: string
  type: 'access' | 'refresh'
}

export class JwtService {
  static async generateToken(userId: string, sessionId: string, type: 'access' | 'refresh' = 'access'): Promise<string> {
    const expiresIn = type === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY
    
    return new SignJWT({ 
      userId,
      sessionId,
      type
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setExpirationTime(expiresIn)
      .sign(secret)
  }

  static async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jwtVerify<JwtPayload>(token, secret, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      })
      
      // Additional validation for required claims
      if (!payload.userId || !payload.sessionId || !payload.type) {
        throw new Error('Invalid token payload')
      }
      
      return payload
    } catch (error) {
      console.error('JWT verification failed:', error)
      throw new Error('Invalid or expired token')
    }
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { userId, sessionId } = await this.verifyToken(refreshToken)
      
      // Verify the session is still valid
      const session = await lucia.validateSession(sessionId)
      if (!session.session) {
        throw new Error('Session not found')
      }
      
      // Generate new tokens
      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.generateToken(userId, sessionId, 'access'),
        this.generateToken(userId, sessionId, 'refresh')
      ])
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw new Error('Failed to refresh token')
    }
  }
}
