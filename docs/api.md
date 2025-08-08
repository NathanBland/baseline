# API Documentation

## Overview

The Baseline API is built with ElysiaJS and Bun, providing a fast, type-safe REST API with real-time WebSocket support.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

The API uses session-based authentication with Lucia. All authenticated endpoints require a valid session cookie.

### Endpoints

#### Authentication

##### POST `/api/v1/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

##### POST `/api/v1/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

##### POST `/api/v1/auth/logout`
Logout and invalidate session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

##### GET `/api/v1/auth/me`
Get current authenticated user.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "emailVerified": true
  }
}
```

#### Users

##### GET `/api/v1/users`
Get paginated list of users.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://example.com/avatar.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

##### GET `/api/v1/users/:id`
Get user by ID.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_count": {
      "conversations": 5,
      "messages": 42
    }
  }
}
```

##### PUT `/api/v1/users/me`
Update current user profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

#### Conversations

##### GET `/api/v1/conversations`
Get user's conversations.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_id",
      "title": "Team Discussion",
      "description": "General team chat",
      "type": "GROUP",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "participants": [
        {
          "id": "participant_id",
          "role": "OWNER",
          "joinedAt": "2024-01-01T00:00:00.000Z",
          "user": {
            "id": "user_id",
            "username": "username",
            "firstName": "John",
            "lastName": "Doe",
            "avatar": "https://example.com/avatar.jpg"
          }
        }
      ],
      "messages": [
        {
          "id": "message_id",
          "content": "Hello everyone!",
          "createdAt": "2024-01-01T12:00:00.000Z",
          "user": {
            "id": "user_id",
            "username": "username",
            "firstName": "John",
            "lastName": "Doe"
          }
        }
      ],
      "_count": {
        "messages": 10,
        "participants": 3
      }
    }
  ]
}
```

##### POST `/api/v1/conversations`
Create a new conversation.

**Request Body:**
```json
{
  "title": "New Conversation",
  "description": "A new group chat",
  "type": "GROUP",
  "participantIds": ["user_id_1", "user_id_2"]
}
```

#### Messages

##### GET `/api/v1/messages/conversation/:conversationId`
Get messages for a conversation.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "messages": [
    {
      "id": "message_id",
      "content": "Hello!",
      "type": "TEXT",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "editedAt": null,
      "user": {
        "id": "user_id",
        "username": "username",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://example.com/avatar.jpg"
      },
      "replyTo": null,
      "_count": {
        "replies": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

##### POST `/api/v1/messages`
Send a new message.

**Request Body:**
```json
{
  "content": "Hello everyone!",
  "type": "TEXT",
  "conversationId": "conv_id",
  "replyToId": "message_id",
  "metadata": {}
}
```

## WebSocket API

### Connection

Connect to WebSocket at `/ws` with session authentication.

### Message Types

#### Join Conversation
```json
{
  "type": "join_conversation",
  "conversationId": "conv_id"
}
```

#### Send Message
```json
{
  "type": "message",
  "conversationId": "conv_id",
  "data": {
    "content": "Hello!",
    "type": "TEXT"
  }
}
```

#### Typing Indicators
```json
{
  "type": "typing_start",
  "conversationId": "conv_id"
}
```

```json
{
  "type": "typing_stop",
  "conversationId": "conv_id"
}
```

### Events Received

#### User Joined
```json
{
  "type": "user_joined",
  "userId": "user_id",
  "conversationId": "conv_id"
}
```

#### New Message
```json
{
  "type": "new_message",
  "conversationId": "conv_id",
  "message": {
    "id": "message_id",
    "content": "Hello!",
    "user": {
      "id": "user_id",
      "username": "username"
    }
  }
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Authentication endpoints: 5 requests per minute
- General endpoints: 100 requests per minute
- WebSocket connections: 1 connection per user

## CORS

CORS is configured to allow requests from the frontend application. In production, ensure the `UI_URL` environment variable is set correctly.
