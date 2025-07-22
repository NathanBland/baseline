import { z } from 'zod'

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional()
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional()
})

// Conversation validation schemas
export const createConversationSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['DIRECT', 'GROUP', 'CHANNEL']).default('DIRECT'),
  participantIds: z.array(z.string()).min(1, 'At least one participant is required')
})

export const updateConversationSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional()
})

// Message validation schemas
export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE', 'SYSTEM', 'REACTION']).default('TEXT'),
  replyToId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export const updateMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required')
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
})

// WebSocket message schemas
export const wsMessageSchema = z.object({
  type: z.enum(['join_conversation', 'leave_conversation', 'typing_start', 'typing_stop', 'message']),
  conversationId: z.string(),
  data: z.record(z.any()).optional()
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type WSMessageInput = z.infer<typeof wsMessageSchema>
