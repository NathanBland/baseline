import { useState, useEffect } from "react"
import { motion } from "motion/react"
import { X, MessageSquare, Search, Plus, UserPlus } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"

interface User {
  id: string
  username: string
  email: string
  firstName?: string | null
  lastName?: string | null
  avatar?: string | null
}

interface CreateConversationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateConversation: (title: string, participantIds: string[], type?: 'DIRECT' | 'GROUP') => Promise<void>
  onSearchUsers: (query: string) => Promise<User[]>
  currentUser: User
  isLoading?: boolean
}

export function CreateConversationDialog({
  isOpen,
  onClose,
  onCreateConversation,
  onSearchUsers,
  currentUser,
  isLoading = false
}: CreateConversationDialogProps) {
  const [title, setTitle] = useState("")
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounced user search
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }
      
      setIsSearching(true)
      try {
        const results = await onSearchUsers(searchQuery.trim())
        // Filter out current user and already selected participants
        const filteredResults = results.filter(user => 
          user.id !== currentUser.id && 
          !selectedParticipants.some(p => p.id === user.id)
        )
        setSearchResults(filteredResults)
      } catch (error) {
        console.error('Failed to search users:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(searchUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, onSearchUsers, currentUser.id, selectedParticipants])

  const handleAddParticipant = (user: User) => {
    if (!selectedParticipants.some(p => p.id === user.id)) {
      setSelectedParticipants([...selectedParticipants, user])
      setSearchQuery("")
      setSearchResults([])
      setError(null)
    }
  }

  const handleRemoveParticipant = (userId: string) => {
    setSelectedParticipants(selectedParticipants.filter(p => p.id !== userId))
  }

  const handleAddSelf = () => {
    if (!selectedParticipants.some(p => p.id === currentUser.id)) {
      setSelectedParticipants([...selectedParticipants, currentUser])
      setError(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // If there's a search result, add the first one
      if (searchResults.length > 0) {
        handleAddParticipant(searchResults[0])
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Please enter a conversation title")
      return
    }

    // Allow creating self-conversations (notes/reminders)
    if (selectedParticipants.length === 0) {
      setError("Please add at least one participant or create a self-conversation for notes")
      return
    }

    try {
      // Use participant user IDs
      const participantIds = selectedParticipants.map(p => p.id)
      
      // Determine conversation type
      const type = selectedParticipants.length === 1 && selectedParticipants[0].id === currentUser.id 
        ? 'DIRECT' 
        : selectedParticipants.length === 1 
        ? 'DIRECT' 
        : 'GROUP'
      
      await onCreateConversation(title.trim(), participantIds, type)
      
      // Reset form
      setTitle("")
      setSelectedParticipants([])
      setSearchQuery("")
      setSearchResults([])
      setError(null)
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create conversation")
    }
  }

  const handleClose = () => {
    setTitle("")
    setSelectedParticipants([])
    setSearchQuery("")
    setSearchResults([])
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleClose}
        onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Create New Conversation
            </CardTitle>
            <CardDescription>
              Start a new conversation with other users.
            </CardDescription>
          </CardHeader>
          <CardContent>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Conversation Title</Label>
            <Input
              id="title"
              placeholder="Enter conversation title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="participants">Participants</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSelf}
                disabled={isLoading || selectedParticipants.some(p => p.id === currentUser.id)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Self (Notes)
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="participants"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pl-10"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md bg-white shadow-sm max-h-32 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleAddParticipant(user)}
                    className="w-full text-left p-2 hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                    <Plus className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedParticipants.length > 0 && (
            <div className="space-y-2">
              <Label>Added Participants:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedParticipants.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                    <span>{user.username}</span>
                    {user.id === currentUser.id && <span className="text-xs">(You)</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(user.id)}
                      className="ml-1 hover:text-red-600"
                      disabled={isLoading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Conversation"}
            </Button>
          </div>
        </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
