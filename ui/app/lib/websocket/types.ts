import type { Message, Conversation } from '../api'

export type WebSocketMessageType =
  | 'message_created'
  | 'message_updated'
  | 'message_deleted'
  | 'conversation_created'
  | 'conversation_created_confirmed'
  | 'conversation_updated'
  | 'user_joined'
  | 'user_left'
  | 'typing_start'
  | 'typing_stop'
  | 'ping'
  | 'pong'
  | 'join_conversation'
  | 'leave_conversation'
  | 'message'
  | 'connected'
  | 'joined_conversation'

export interface TypingIndicator {
  userId: string
  userName: string
  conversationId: string
  isTyping?: boolean
}

export type IncomingPayloadMap = {
  message_created: Message
  message_updated: Message
  message_deleted: { id: string; conversationId: string }
  conversation_created: { conversation: Conversation } | Conversation
  conversation_created_confirmed: { conversation: Conversation }
  conversation_updated: Conversation
  user_joined: { conversationId: string; userId: string; userName?: string }
  user_left: { conversationId: string; userId: string }
  typing_start: TypingIndicator
  typing_stop: TypingIndicator
  ping: Record<string, unknown>
  pong: { timestamp?: number } | Record<string, unknown>
  connected: Record<string, unknown>
  message: Record<string, unknown>
  join_conversation: { conversationId: string }
  leave_conversation: { conversationId: string }
  joined_conversation: { conversationId: string }
}

export type OutgoingPayloadMap = {
  message_created: { conversationId: string; content: string; type?: 'text' | 'image' | 'file' | 'link' }
  message_updated: { id: string; content: string }
  message_deleted: { id: string; conversationId: string }
  conversation_created: { title: string; participantIds: string[]; type?: 'DIRECT' | 'GROUP' }
  conversation_created_confirmed: { conversation: Conversation }
  conversation_updated: { conversationId: string } | Conversation
  user_joined: { conversationId: string; userId: string }
  user_left: { conversationId: string; userId: string }
  typing_start: { conversationId: string }
  typing_stop: { conversationId: string }
  ping: Record<string, never>
  pong: Record<string, unknown>
  join_conversation: { conversationId: string }
  leave_conversation: { conversationId: string }
  message: Record<string, unknown>
  connected: Record<string, unknown>
  joined_conversation: { conversationId: string }
}

export type IncomingMessage = {
  [K in WebSocketMessageType]: {
    type: K
    data: K extends keyof IncomingPayloadMap ? IncomingPayloadMap[K] : unknown
    timestamp: number
  }
}[WebSocketMessageType]

export type OutgoingType = keyof OutgoingPayloadMap

export interface PendingMessage<T extends OutgoingType = OutgoingType> {
  id: string
  type: T
  data: OutgoingPayloadMap[T]
  timestamp: number
  retryCount: number
  maxRetries: number
  timeoutId?: NodeJS.Timeout
}
