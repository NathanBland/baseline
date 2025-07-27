// API service for communicating with the Baseline backend
// Use window.ENV provided by Remix root loader instead of Vite env vars
const getAPIBaseURL = () => {
  if (typeof window !== 'undefined' && window.ENV) {
    return window.ENV.API_URL
  }
  // Server-side fallback
  return 'http://localhost:3001'
}

const getWSBaseURL = () => {
  if (typeof window !== 'undefined' && window.ENV) {
    return window.ENV.WS_URL
  }
  // Server-side fallback
  return 'ws://localhost:3001'
}

const API_BASE_URL = getAPIBaseURL()
const WS_BASE_URL = getWSBaseURL()

export interface User {
  id: string
  username: string
  email: string
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
  emailVerified?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ConversationParticipant {
  id: string
  userId: string
  conversationId: string
  joinedAt: string
  role: string
  user: User
}

export interface Conversation {
  id: string
  title: string
  description?: string
  type: 'DIRECT' | 'GROUP'
  createdAt: string
  updatedAt: string
  participants: ConversationParticipant[]
  messages?: Message[]
  lastMessage?: Message
  _count?: {
    messages: number
  }
}

export interface Message {
  id: string
  content: string
  authorId: string
  conversationId: string
  createdAt: string
  updatedAt: string
  author: User
  type: 'text' | 'image' | 'file' | 'link'
}

export interface AuthResponse {
  user: User
  sessionId: string
  token: string
}

class ApiService {
  private baseUrl: string
  private wsUrl: string
  private currentUser: User | null = null

  constructor() {
    this.baseUrl = API_BASE_URL
    this.wsUrl = WS_BASE_URL
    
    // Try to get current user from localStorage if available
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('current_user')
      if (userData) {
        try {
          this.currentUser = JSON.parse(userData)
        } catch (error) {
          console.error('Error parsing stored user data:', error)
          localStorage.removeItem('current_user')
        }
      }
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session-based auth
    }
    
    const response = await fetch(url, { ...defaultOptions, ...options })
    
    if (!response.ok) {
      const errorData = await response.text()
      let parsedError
      
      try {
        parsedError = JSON.parse(errorData)
      } catch {
        throw new Error(`API Error: ${response.status} - ${errorData}`)
      }
      
      // Handle validation errors with user-friendly messages
      if (response.status === 422 && parsedError.type === 'validation') {
        if (parsedError.errors && parsedError.errors.length > 0) {
          const firstError = parsedError.errors[0]
          const field = firstError.path?.replace('/', '') || parsedError.property?.replace('/', '')
          
          // Create user-friendly error messages
          if (field === 'password' && firstError.message?.includes('length greater or equal to 6')) {
            throw new Error('Password must be at least 6 characters long')
          }
          if (field === 'email' && firstError.message?.includes('format')) {
            throw new Error('Please enter a valid email address')
          }
          if (field === 'username' && firstError.message?.includes('length')) {
            throw new Error('Username must be at least 3 characters long')
          }
          
          // Fallback to the API error message
          throw new Error(firstError.message || parsedError.summary || 'Validation error')
        }
        
        throw new Error(parsedError.summary || 'Please check your input and try again')
      }
      
      // Handle other API errors
      if (response.status === 401) {
        throw new Error('Invalid email or password')
      }
      
      if (response.status === 409) {
        throw new Error('An account with this email already exists')
      }
      
      throw new Error(parsedError.message || `API Error: ${response.status}`)
    }
    
    return response.json()
  }

  // Auth methods
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    console.log('Full login response:', response)
    console.log('Token in response:', response.token)
    
    this.currentUser = response.user
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(response.user))
      // Store token for WebSocket authentication
      if (response.token) {
        console.log('Storing token in localStorage:', response.token)
        localStorage.setItem('auth_token', response.token)
        console.log('Token stored, verifying:', localStorage.getItem('auth_token'))
      } else {
        console.error('No token in login response!')
      }
    }
    
    return response
  }

  async register(email: string, password: string, username: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    })
    
    this.currentUser = response.user
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(response.user))
    }
    
    return response
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' })
    this.currentUser = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('current_user')
    }
  }

  async getCurrentUser(): Promise<User> {
    if (this.currentUser) {
      return this.currentUser
    }
    
    // Try to get current user from API if we have a session
    try {
      const response = await this.request<{ user: User }>('/auth/me')
      this.currentUser = response.user
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(response.user))
      }
      return response.user
    } catch (error) {
      // Clear invalid session data
      this.currentUser = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('current_user')
      }
      throw error
    }
  }

  // Conversation methods
  async getConversations(): Promise<Conversation[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }
    
    const response = await this.request<{ conversations: Conversation[] }>(`/conversations?userId=${this.currentUser.id}`)
    return response.conversations
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.request<Conversation>(`/conversations/${id}`)
  }

  async createConversation(title: string, participantIds: string[], type: 'DIRECT' | 'GROUP' = 'GROUP'): Promise<Conversation> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }
    
    const response = await this.request<{ conversation: Conversation }>(`/conversations?userId=${this.currentUser.id}`, {
      method: 'POST',
      body: JSON.stringify({ title, type, participantIds }),
    })
    return response.conversation
  }

  // User search method for finding participants
  async searchUsers(query: string): Promise<User[]> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }
    
    // For now, we'll use a simple search endpoint
    // In a real implementation, this would respect privacy settings
    try {
      return this.request<User[]>(`/users/search?q=${encodeURIComponent(query)}&userId=${this.currentUser.id}`)
    } catch (error) {
      // If search endpoint doesn't exist, return empty array
      console.warn('User search not available:', error)
      return []
    }
  }

  // Message methods
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<{ messages: Message[], total: number, hasMore: boolean }> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }
    
    // Remove userId - let API infer from session for security
    return this.request<{ messages: Message[], total: number, hasMore: boolean }>(`/messages?conversationId=${conversationId}&limit=${limit}&offset=${offset}`)
  }

  async sendMessage(conversationId: string, content: string, type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'REACTION' = 'TEXT'): Promise<Message> {
    if (!this.currentUser) {
      throw new Error('User not authenticated')
    }
    
    // Remove userId - let API infer authorId from session for security
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationId, content, type }),
    })
  }

  async updateMessage(id: string, content: string): Promise<Message> {
    return this.request<Message>(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
  }

  async deleteMessage(id: string): Promise<void> {
    await this.request(`/messages/${id}`, { method: 'DELETE' })
  }

  // WebSocket connection
  createWebSocketConnection(): WebSocket | null {
    if (typeof window === 'undefined') return null
    
    console.log('Attempting to create WebSocket connection...')
    console.log('Current localStorage keys:', Object.keys(localStorage))
    
    // Get token from localStorage for WebSocket authentication
    const token = localStorage.getItem('auth_token')
    console.log('Retrieved token from localStorage:', token ? `[${token.substring(0, 10)}...]` : 'null')
    
    if (!token) {
      console.error('No auth token found for WebSocket connection')
      console.log('All localStorage items:', {
        auth_token: localStorage.getItem('auth_token'),
        current_user: localStorage.getItem('current_user')
      })
      return null
    }
    
    // WebSocket connection with token as query parameter
    const wsUrl = `${this.wsUrl}/ws?token=${encodeURIComponent(token)}`
    console.log('Creating WebSocket connection with token auth to:', wsUrl)
    return new WebSocket(wsUrl)
  }

  // Utility methods
  setCurrentUser(user: User) {
    this.currentUser = user
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_user', JSON.stringify(user))
    }
  }

  getCurrentUserSync(): User | null {
    return this.currentUser
  }

  isAuthenticated(): boolean {
    return !!this.currentUser
  }
}

export const apiService = new ApiService()
export default apiService
