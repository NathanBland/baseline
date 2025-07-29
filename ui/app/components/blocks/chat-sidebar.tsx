import { useState } from "react"
import { useNavigate } from "@remix-run/react"
import { motion, AnimatePresence } from "motion/react"
import { Plus, Settings, Search, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scroll-area"
import { ConnectionIndicator } from "~/components/connection-indicator"
import { CreateConversationDialog } from "~/components/create-conversation-dialog"
import { ConversationListItem } from "~/components/blocks/conversation-list-item"

interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  participants: Array<{
    id: string
    name: string
    avatar?: string
  }>
}

interface TypingIndicator {
  userId: string
  userName: string
  conversationId: string
}

interface User {
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

interface ChatSidebarProps {
  conversations: Conversation[]
  activeConversationId?: string
  currentUser: User
  typingUsers: TypingIndicator[]
  onConversationSelect: (conversationId: string) => void
  onCreateConversation: (title: string, participantIds: string[], type?: 'DIRECT' | 'GROUP') => Promise<void>
  onSearchUsers: (query: string) => Promise<User[]>
  onClose?: () => void // Optional close handler for mobile
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  currentUser,
  typingUsers,
  onConversationSelect,
  onCreateConversation,
  onSearchUsers,
  onClose
}: ChatSidebarProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleCreateConversation = async (title: string, participantIds: string[]) => {
    setIsCreatingConversation(true)
    try {
      await onCreateConversation(title, participantIds)
      setIsCreateDialogOpen(false)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-80 border-r bg-muted/80 flex flex-col h-screen"
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Messages</h2>
              <ConnectionIndicator variant="dot" />
            </div>
            <div className="flex gap-2">
              {/* Mobile close button */}
              {onClose && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={onClose}
                  className="md:hidden"
                  title="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setIsCreateDialogOpen(true)}
                title="Create new conversation"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                title="Settings"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            <AnimatePresence>
              {filteredConversations.map((conversation, index) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  currentUser={currentUser}
                  typingUsers={typingUsers}
                  isActive={activeConversationId === conversation.id}
                  index={index}
                  onClick={() => onConversationSelect(conversation.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </motion.div>

      <CreateConversationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreateConversation={handleCreateConversation}
        onSearchUsers={onSearchUsers}
        currentUser={currentUser}
      />
    </>
  )
}
