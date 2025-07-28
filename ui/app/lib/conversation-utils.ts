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
 * For direct conversations (2 participants), shows the other participant's name
 * For group conversations, shows the actual conversation title
 */
export function getConversationDisplayTitle(conversation: ChatConversation, currentUser: ChatUser): string {
  // For direct conversations (exactly 2 participants), show the other participant's name
  if (conversation.participants && conversation.participants.length === 2) {
    const otherParticipant = conversation.participants.find(
      participant => participant.id !== currentUser.id
    )

    if (otherParticipant?.name) {
      return otherParticipant.name
    }
  }

  // For group conversations or any edge cases, show the actual title
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
