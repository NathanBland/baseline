import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import { apiService } from "~/lib/api"

interface OAuthProvider {
  id: string
  name: string
  type: 'oauth' | 'oidc'
  authorizationUrl: string
  callbackUrl: string
}

interface ProvidersResponse {
  providers: OAuthProvider[]
}

export function OAuthProviders() {
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      setLoading(true)
      const baseUrl = typeof window !== 'undefined' && (window as any).ENV 
        ? (window as any).ENV.API_URL 
        : 'http://localhost:3000'
      const response = await fetch(`${baseUrl}/auth/providers`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load OAuth providers: ${response.status}`)
      }
      
      const data: ProvidersResponse = await response.json()
      setProviders(data.providers)
    } catch (err) {
      console.error('Failed to load OAuth providers:', err)
      setError('Failed to load authentication providers')
    } finally {
      setLoading(false)
    }
  }

  const handleProviderLogin = (provider: OAuthProvider) => {
    window.location.href = provider.authorizationUrl
  }

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'github':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        )
      case 'google':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )
      case 'oidc':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m20-7l-6 6m-6 6l-6 6m12-12l-6 6m6 6l-6 6"/>
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (providers.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {providers.map((provider) => (
          <motion.div
            key={provider.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleProviderLogin(provider)}
              disabled={loading}
            >
              <div className="flex items-center justify-center gap-2">
                {getProviderIcon(provider.id)}
                <span>Continue with {provider.name}</span>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
