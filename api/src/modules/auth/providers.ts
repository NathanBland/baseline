import { Elysia, t } from 'elysia'
import { github, google, oidc } from '../../auth/index.js'

export const providersModule = new Elysia()
  .get('/providers', () => {
    const providers = []
    
    if (github) {
      providers.push({
        id: 'github',
        name: 'GitHub',
        type: 'oauth',
        authorizationUrl: 'http://localhost:3000/auth/github',
        callbackUrl: 'http://localhost:3000/auth/github/callback'
      })
    }
    
    if (google) {
      providers.push({
        id: 'google',
        name: 'Google',
        type: 'oauth',
        authorizationUrl: 'http://localhost:3000/auth/google',
        callbackUrl: 'http://localhost:3000/auth/google/callback'
      })
    }
    
    if (oidc) {
      providers.push({
        id: 'oidc',
        name: 'OpenID Connect',
        type: 'oidc',
        authorizationUrl: 'http://localhost:3000/auth/oidc',
        callbackUrl: oidc.redirectUri
      })
    }
    
    return { providers }
  }, {
    detail: {
      tags: ['Auth'],
      summary: 'Get available OAuth/OIDC providers',
      description: 'Returns a list of configured OAuth and OIDC providers with their authorization and callback URLs'
    }
  })
