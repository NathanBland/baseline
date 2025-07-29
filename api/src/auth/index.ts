import { Lucia } from 'lucia'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { GitHub, Google } from 'arctic'
import { prisma } from '../db/index.js'
import bcrypt from 'bcryptjs'

// Prisma adapter for Lucia
const adapter = new PrismaAdapter(prisma.session, prisma.user)

// Initialize Lucia
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === 'production'
    }
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      email: attributes.email,
      username: attributes.username,
      firstName: attributes.firstName,
      lastName: attributes.lastName,
      avatar: attributes.avatar,
      emailVerified: attributes.emailVerified
    }
  }
})

// OIDC providers (optional)
export const github = process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  ? new GitHub(
      process.env.GITHUB_CLIENT_ID,
      process.env.GITHUB_CLIENT_SECRET,
      process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback'
    )
  : null

export const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? new Google(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    )
  : null

// Generic OIDC provider (KeyCloak or any OIDC-compliant provider)
export const oidc = process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET && process.env.OIDC_ISSUER_URL
  ? {
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      issuerUrl: process.env.OIDC_ISSUER_URL,
      redirectUri: process.env.OIDC_REDIRECT_URI || 'http://localhost:3000/auth/oidc/callback',
      authorizationEndpoint: `${process.env.OIDC_ISSUER_URL}/protocol/openid-connect/auth`,
      tokenEndpoint: `${process.env.OIDC_ISSUER_URL}/protocol/openid-connect/token`,
      userInfoEndpoint: `${process.env.OIDC_ISSUER_URL}/protocol/openid-connect/userinfo`
    }
  : null

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Type declarations for Lucia
declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia
    DatabaseUserAttributes: {
      id: string
      email: string
      username: string
      firstName: string | null
      lastName: string | null
      avatar: string | null
      emailVerified: boolean
    }
  }
}
