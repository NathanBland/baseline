# Security Issues Audit

## Overview
This document tracks security issues identified in the baseline project, their status, and resolution.

## Issues

### 1. Session Cookies without SameSite Attribute
- **Description**: Session cookies were being set without the SameSite attribute, making them vulnerable to CSRF attacks.
- **Status**: Fixed
- **Resolution**: Added SameSite attribute to session cookies. Set to 'strict' in production and 'lax' in development.
- **Files Changed**: `api/src/modules/auth/index.ts`

### 2. Low bcrypt Cost Factor
- **Description**: The bcrypt cost factor for password hashing was set to 10, which is acceptable but not as strong as it could be.
- **Status**: Fixed
- **Resolution**: Increased cost factor to 12.
- **Files Changed**: `api/src/modules/auth/service.ts`

### 3. Detailed Error Messages in Production
- **Description**: The API was returning detailed error messages in production, which could leak sensitive information.
- **Status**: Fixed
- **Resolution**: Added a global error handler that returns a generic error message in production.
- **Files Changed**: `api/src/index.ts`

### 4. Permissive CORS Configuration
- **Description**: The CORS configuration allowed any origin in development and was too permissive in production.
- **Status**: Fixed
- **Resolution**: Restricted CORS to specific origins using the `CORS_ALLOWED_ORIGINS` environment variable and fallback to `UI_URL`.
- **Files Changed**: `api/src/index.ts`

### 5. WebSocket Token in localStorage
- **Description**: The WebSocket authentication token was stored in localStorage, making it vulnerable to XSS attacks.
- **Status**: Known Issue
- **Resolution**: This is a known tradeoff. We are using tokens for WebSocket authentication because WebSocket connections cannot use httpOnly cookies. We recommend using httpOnly cookies and same-site requests in production. This will be addressed in a future release.
- **Files Changed**: N/A

### WebSocket Security
- WebSocket is currently disabled. When enabled, ensure tokens are validated on every message and use wss:// in production.
