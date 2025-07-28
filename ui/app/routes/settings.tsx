import type { MetaFunction } from "@remix-run/node"
import { useState, useEffect } from "react"
import { motion } from "motion/react"

import { UserSettings } from "~/components/user-settings"

export const meta: MetaFunction = () => {
  return [
    { title: "Settings - Baseline" },
    { name: "description", content: "Manage your Baseline account settings" },
  ]
}

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  username?: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true)
        
        // First check localStorage for cached user data
        const cachedUser = localStorage.getItem('current_user')
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser)
          setUser({
            id: parsedUser.id,
            name: parsedUser.username || parsedUser.name || 'User',
            email: parsedUser.email,
            avatar: parsedUser.avatar,
            username: parsedUser.username
          })
        }
        
        // Then fetch fresh data from API using session cookies
        const apiUrl = (window as any).ENV?.API_BASE_URL || 'http://localhost:3000'
        const response = await fetch(`${apiUrl}/auth/me`, {
          method: 'GET',
          credentials: 'include', // Include session cookies
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data')
        }
        
        const data = await response.json()
        const userData = {
          id: data.user.id,
          name: data.user.username || data.user.name || 'User',
          email: data.user.email,
          avatar: data.user.avatar,
          username: data.user.username
        }
        
        setUser(userData)
        // Update localStorage cache
        localStorage.setItem('current_user', JSON.stringify(data.user))
        
      } catch (err) {
        console.error('Failed to fetch user data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load user data')
        
        // If API fails but we have cached data, continue with that
        if (!user) {
          // Fallback to basic user data if available
          const cachedUser = localStorage.getItem('current_user')
          if (cachedUser) {
            try {
              const parsedUser = JSON.parse(cachedUser)
              setUser({
                id: parsedUser.id || 'unknown',
                name: parsedUser.username || parsedUser.name || 'User',
                email: parsedUser.email || '',
                avatar: parsedUser.avatar,
                username: parsedUser.username
              })
            } catch {
              // If all else fails, redirect to login
              console.error('Unable to load user data, redirecting to login')
              window.location.href = '/'
            }
          } else {
            // No cached data and API failed - redirect to login
            console.error('No user data available, redirecting to login')
            window.location.href = '/'
          }
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [])

  const handleLogout = async () => {
    try {
      // Clear authentication token
      localStorage.removeItem('auth_token')
      
      // Call logout API if available
      const token = localStorage.getItem('auth_token')
      if (token) {
        await fetch(`${(window as any).ENV?.API_BASE_URL || 'http://localhost:3000'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      }
      
      console.log("Successfully logged out")
      // Redirect to login page
      window.location.href = "/"
    } catch (error) {
      console.error('Logout error:', error)
      // Even if API call fails, clear token and redirect
      localStorage.removeItem('auth_token')
      window.location.href = "/"
    }
  }

  const handleUpdateProfile = async (data: { name: string; email: string }) => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const apiUrl = (window as any).ENV?.API_BASE_URL || 'http://localhost:3000'
      const response = await fetch(`${apiUrl}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: data.name,
          email: data.email
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update profile')
      }
      
      const updatedUser = await response.json()
      
      // Update user state with new data
      const newUserData: User = {
        ...user,
        name: data.name,
        email: data.email,
        username: data.name
      }
      
      setUser(newUserData)
      
      // Update localStorage cache
      const cachedUser = {
        ...JSON.parse(localStorage.getItem('current_user') || '{}'),
        username: data.name,
        email: data.email
      }
      localStorage.setItem('current_user', JSON.stringify(cachedUser))
      
      console.log('Profile updated successfully')
      
    } catch (err) {
      console.error('Failed to update profile:', err)
      throw err // Re-throw so UserSettings component can handle the error
    }
  }

  // Show loading state while fetching user data
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your settings...</p>
        </div>
      </motion.div>
    )
  }

  // Show error state if user data couldn't be loaded
  if (error || !user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Unable to Load Settings</h2>
          <p className="text-muted-foreground mb-4">
            {error || 'Failed to load your user data. Please try refreshing the page.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background"
    >
      <UserSettings
        user={user}
        onLogout={handleLogout}
        onUpdateProfile={handleUpdateProfile}
      />
    </motion.div>
  )
}
