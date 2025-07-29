// Simple types for the chat layout context
type ChatUser = {
  id: string
  name?: string
}

type ChatConversation = {
  id: string
  title: string
  participants?: Array<{
    id: string
    name: string
    avatar?: string
  }>
}

/**
 * Get the display title for a conversation based on the current user context
 * Priority:
 * 1. Custom title (always takes priority)
 * 2. Auto-generated participant name (for direct chats without custom titles) 
 * 3. Fallback to conversation title
 */
export function getConversationDisplayTitle(conversation: ChatConversation, currentUser: ChatUser): string {
  // For direct conversations (exactly 2 participants), check if title is auto-generated
  if (conversation.participants && conversation.participants.length === 2) {
    const otherParticipant = conversation.participants.find(
      participant => participant.id !== currentUser.id
    )

    if (otherParticipant?.name) {
      // Check if the conversation title appears to be auto-generated (matches participant name)
      const participantName = otherParticipant.name
      const title = conversation.title
      
      // If title exactly matches participant name or username pattern, it's likely auto-generated
      // Show participant name for consistency
      if (title === participantName || 
          title === otherParticipant.name || 
          !title || 
          title.trim() === '') {
        return participantName
      }
      
      // If title is different from participant name, it's a custom title - show it as-is
      return title
    }
  }

  // For group conversations or any edge cases, always show the actual title
  return conversation.title
}

/**
 * Get a shortened display title for use in compact spaces (like notifications)
 */
export function getConversationShortTitle(conversation: ChatConversation, currentUser: ChatUser, maxLength: number = 30): string {
  const fullTitle = getConversationDisplayTitle(conversation, currentUser)
  
  if (fullTitle.length <= maxLength) {
    return fullTitle
  }
  
  return fullTitle.substring(0, maxLength - 3) + '...'
}
