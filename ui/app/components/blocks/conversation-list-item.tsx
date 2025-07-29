import { motion } from "motion/react"
import { Button } from "~/components/ui/button"
import { AvatarWithBadge } from "~/components/ui/avatar-with-badge"
import { getConversationDisplayTitle } from "~/lib/conversation-utils"

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

interface ConversationListItemProps {
  conversation: Conversation
  currentUser: User
  typingUsers: TypingIndicator[]
  isActive: boolean
  index: number
  onClick: () => void
}

export function ConversationListItem({
  conversation,
  currentUser,
  typingUsers,
  isActive,
  index,
  onClick
}: ConversationListItemProps) {
  const isTyping = typingUsers.filter(t => 
    t.conversationId === conversation.id && t.userId !== currentUser.id
  ).length > 0

  return (
    <motion.div
      key={conversation.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className="w-full p-3 h-auto justify-start mb-1"
        onClick={onClick}
      >
        <div className="flex items-start gap-3 w-full">
          <AvatarWithBadge
            src={conversation.participants[0]?.avatar}
            fallback={conversation.participants[0]?.name.slice(0, 2).toUpperCase() || "??"}
            unreadCount={conversation.unreadCount}
          />
          
          <div className="flex-1 text-left overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium truncate flex-1 min-w-0">
                {getConversationDisplayTitle(conversation, currentUser)}
              </p>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 min-w-[3rem]">
                {conversation.timestamp}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground truncate flex-1">
                {isTyping ? (
                  <span className="flex items-center gap-1 text-primary animate-pulse">
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    {typingUsers.filter(t => t.conversationId === conversation.id && t.userId !== currentUser.id)[0]?.userName} typing...
                  </span>
                ) : (
                  conversation.lastMessage
                )}
              </p>
            </div>
          </div>
        </div>
      </Button>
    </motion.div>
  )
}
