import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  MessageSquare,
  Send,
  Search,
  MoreHorizontal,
  X,
  Paperclip,
  Smile,
  Loader2,
  RotateCcw,
  Menu
} from "lucide-react"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { getConversationDisplayTitle } from "~/lib/conversation-utils"
import { ChatSidebar } from "~/components/blocks/chat-sidebar"

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

interface Message {
  id: string
  content: string
  authorId: string
  authorName: string
  timestamp: string
  type: 'text' | 'image' | 'file' | 'link'
  pending?: boolean // For optimistic updates
  failed?: boolean // For failed sends
  retryCount?: number // Number of retry attempts
  canRetry?: boolean // Whether retry is available
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

interface ChatLayoutProps {
  conversations: Conversation[]
  activeConversationId?: string
  messages: Message[]
  currentUser: User
  typingUsers: TypingIndicator[]
  isMessageSending?: boolean
  onConversationSelect: (conversationId: string) => void
  onSendMessage: (content: string) => void
  onCreateConversation: (title: string, participantIds: string[], type?: 'DIRECT' | 'GROUP') => Promise<void>
  onSearchUsers: (query: string) => Promise<User[]>
  onTypingStart: (conversationId: string) => void
  onTypingStop: (conversationId: string) => void
  onRetryMessage?: (messageId: string) => Promise<void>
}

export function ChatLayout({
  conversations,
  activeConversationId,
  messages,
  currentUser,
  typingUsers,
  isMessageSending = false,
  onConversationSelect,
  onSendMessage,
  onCreateConversation,
  onSearchUsers,
  onTypingStart,
  onTypingStop,
  onRetryMessage
}: ChatLayoutProps) {
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [messageSearchQuery, setMessageSearchQuery] = useState("")
  const [isMessageSearchOpen, setIsMessageSearchOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Auto-scroll functionality
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only scroll for new messages (not when switching conversations)
    if (messages.length === 0) return
    
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'auto', // Use 'auto' instead of 'smooth' for better performance
          block: 'end'
        })
      }
    }
    
    // Use requestAnimationFrame for better performance
    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBottom) // Double RAF to ensure DOM update
    })
    
    return () => cancelAnimationFrame(frameId)
  }, [messages.length]) // Only depend on length, not full messages array

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  
  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // Filter messages based on search query
  const filteredMessages = messageSearchQuery.trim() 
    ? messages.filter(message =>
        message.content.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
        message.authorName.toLowerCase().includes(messageSearchQuery.toLowerCase())
      )
    : messages

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // Send typing stop event before sending the message
      if (activeConversationId) {
        onTypingStop(activeConversationId)
      }
      
      onSendMessage(messageInput.trim())
      setMessageInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setMessageInput(newValue)
    
    // Trigger typing indicators
    if (activeConversationId) {
      if (newValue.trim().length > 0) {
        onTypingStart(activeConversationId)
      } else {
        onTypingStop(activeConversationId)
      }
    }
  }

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
    <div className="flex h-screen relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Conversations Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 transition-transform duration-300 ease-in-out
        fixed md:relative z-50 md:z-auto
        w-80 md:w-80 h-screen
      `}>
        <ChatSidebar
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          currentUser={currentUser}
          typingUsers={typingUsers}
          onConversationSelect={(id) => {
            onConversationSelect(id)
            setIsSidebarOpen(false) // Close sidebar on mobile after selection
          }}
          onCreateConversation={onCreateConversation}
          onSearchUsers={onSearchUsers}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile hamburger menu */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="md:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  
                  <Avatar>
                    <AvatarImage src={activeConversation.participants[0]?.avatar} />
                    <AvatarFallback>
                      {activeConversation.participants[0]?.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{getConversationDisplayTitle(activeConversation, currentUser)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {activeConversation.participants.length} participants
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsMessageSearchOpen(!isMessageSearchOpen)}
                    className={isMessageSearchOpen ? 'bg-muted' : ''}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Message Search Input */}
              {isMessageSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-2"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    {messageSearchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMessageSearchQuery('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {messageSearchQuery && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} found
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Messages */}
            <div ref={scrollAreaRef} className="flex-1 h-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                <AnimatePresence>
                  {filteredMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex gap-3 ${
                        message.authorId === currentUser.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.authorId !== currentUser.id && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.authorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <motion.div  transition={{ 
                          duration: 0.6, 
                          ease: 'easeOut'
                        }}
                        className={`max-w-[70%] rounded-lg p-3 transition-all duration-500 ease-out ${
                          message.authorId === currentUser.id
                            ? message.failed
                              ? 'bg-red-100 border-red-300 border text-red-800' // Red for failed
                              : message.pending 
                                ? 'bg-orange-300 text-white opacity-85' // Orange for pending
                                : 'bg-primary text-primary-foreground opacity-100' // Primary for confirmed
                            : 'bg-muted text-muted-foreground'
                        }`}
                        >
                        {message.authorId !== currentUser.id && (
                          <p className="text-xs font-medium mb-1">{message.authorName}</p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">{message.timestamp}</p>
                          {message.failed && message.canRetry && onRetryMessage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRetryMessage(message.id)}
                              className="h-6 px-2 py-0 text-xs hover:bg-red-200 text-red-600 hover:text-red-700"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </motion.div>
                      {message.authorId === currentUser.id && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={currentUser.avatar || undefined} />
                          <AvatarFallback>
                            {currentUser.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Scroll anchor for auto-scroll */}
                <div ref={messagesEndRef} />
                
                {/* Typing Indicators */}
                {activeConversationId && typingUsers.filter(t => t.conversationId === activeConversationId).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {typingUsers
                          .filter(t => t.conversationId === activeConversationId)
                          .map(t => t.userName)
                          .join(', ')}
                        {typingUsers.filter(t => t.conversationId === activeConversationId).length === 1 
                          ? ' is typing...' 
                          : ' are typing...'}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>
            </div>

            {/* Message Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              <div className="flex items-end gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isMessageSending}
                  >
                    {isMessageSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </>
        ) : (
          /* No Conversation Selected */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex items-center justify-center p-4"
          >
            <div className="text-center max-w-md">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose a conversation from the sidebar to start messaging
              </p>
              {/* Mobile-only button to open sidebar */}
              <Button 
                variant="outline" 
                className="md:hidden"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-4 w-4 mr-2" />
                View Conversations
              </Button>
            </div>
          </motion.div>
        )}
      </div>


    </div>
  )
}
