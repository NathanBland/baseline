# Baseline Repository Development Guide

## Project Overview
Baseline is a real-time chat application built with:
- **Backend**: Bun + ElysiaJS + Prisma + PostgreSQL + Redis
- **Frontend**: Remix + React + Tailwind CSS + shadcn/ui
- **Real-time**: WebSocket for live messaging and typing indicators
- **Authentication**: Session-based auth with HTTP-only cookies

## Development Environment Setup

### Local Development (Recommended for active development)

#### Prerequisites
- **Node.js**: Use Node LTS via nvm
- **Bun**: Latest version for API server
- **Docker**: For databases (PostgreSQL + Redis)

#### Starting Services Locally

**API Server (Backend)**
```bash
cd api/
bun dev
```
- Runs on http://localhost:3000
- Uses Bun runtime with ElysiaJS framework
- Auto-reloads on file changes

**UI Server (Frontend)**
```bash
cd ui/
npm run dev
```
- Runs on http://localhost:3001
- Uses Node LTS (ensure via nvm)
- Auto-reloads on file changes

**Databases (Docker)**
```bash
# Start only databases for local dev
make dev-db  # or docker-compose up -d postgres redis
```

### Docker Development (Full containerized environment)

#### Available Make Commands

**Environment Setup**
```bash
make help           # Show all available commands
make setup          # Initial project setup (copy .env, show instructions)
make build          # Build all Docker containers
make build-prod     # Build production containers
```

**Development**
```bash
make dev            # Start full development environment (databases + services)
make dev-detached   # Start development environment in background
make dev-logs       # Show logs from development containers
make down           # Stop all containers
make down-volumes   # Stop containers and remove volumes
make restart        # Restart all containers
make restart-api    # Restart API container only
make restart-ui     # Restart UI container only
```

**Database Management**
```bash
make migrate        # Run database migrations
make migrate-reset  # Reset database and run migrations
make seed           # Seed database with test data
make db-studio      # Open Prisma Studio (database GUI)
```

**Testing**
```bash
make test           # Run all tests (API + UI)
make test-api       # Run API tests only (bun test)
make test-ui        # Run UI tests only (npm test)
make test-coverage  # Run tests with coverage reports
```

**Code Quality**
```bash
make lint           # Run linters on both API and UI
make format         # Format code using prettier/biome
make type-check     # Run TypeScript type checking
```

**Utilities**
```bash
make logs           # Show logs from all containers
make logs-api       # Show API logs only
make logs-ui        # Show UI logs only
make logs-db        # Show database logs (postgres + redis)
make shell-api      # Open shell in API container
make shell-ui       # Open shell in UI container
make shell-db       # Open PostgreSQL shell
make install-api    # Install API dependencies (bun install)
make install-ui     # Install UI dependencies (npm install)
make health         # Check health of all services
```

**Production**
```bash
make deploy-build   # Build for production deployment
make deploy-up      # Start production deployment
```

**Cleanup**
```bash
make clean          # Clean up containers, images, and volumes
make clean-all      # Nuclear cleanup - remove everything
```

## Testing

### API Tests
```bash
# Local development
cd api/
bun test

# Docker environment
make test-api
```

### UI Tests
```bash
# Local development
cd ui/
npm run test

# Docker environment
make test-ui
```

### Coverage Reports
```bash
make test-coverage  # Both API and UI with coverage
```

## Architecture Notes

### Security Implementation
- **Session-based authentication**: HTTP-only cookies, secure in production
- **CORS configuration**: Configured for UI domain
- **API security**: All endpoints validate session, no client-side user ID injection
- **WebSocket security**: Session-based authentication via cookie headers
- **Authorization**: User permissions checked via session on all protected operations

### API Structure
- **Modular architecture**: Separate modules for auth, conversations, messages
- **ElysiaJS plugins**: Used for modularity and encapsulation
- **Validation**: TypeBox schemas for runtime validation and TypeScript types
- **Database**: Prisma ORM with PostgreSQL
- **Real-time**: WebSocket handler with session-based auth

### UI Structure
- **Remix framework**: Server-side rendering with client-side hydration
- **Component library**: shadcn/ui with Tailwind CSS
- **State management**: React hooks with real-time WebSocket integration
- **Error boundaries**: Comprehensive error handling for UI resilience
- **API integration**: Session-based with credentials: 'include'

## Environment Configuration

### Required Environment Variables

**API (.env in api/)**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/baseline"
REDIS_URL="redis://localhost:6379"
NODE_ENV="development"
UI_URL="http://localhost:3001"
SESSION_SECRET="your-session-secret"
```

**UI (.env in ui/)**
```
VITE_API_URL="http://localhost:3000"
VITE_WS_URL="ws://localhost:3000"
```

## Common Development Tasks

### Adding New API Endpoints
1. Update relevant module in `src/modules/`
2. Add validation schemas in `model.ts`
3. Implement business logic in `service.ts`
4. Add route handlers in `index.ts`
5. Ensure session-based authentication
6. Add tests in `src/tests/`

### Adding New UI Components
1. Create component in `app/components/`
2. Use shadcn/ui as base, extend with Tailwind
3. Add error boundaries for resilience
4. Integrate with API using fetch with credentials
5. Add loading and error states

### Database Changes
1. Modify schema in `prisma/schema.prisma`
2. Generate migration: `bunx prisma migrate dev`
3. Update related TypeScript types
4. Update seed data if needed

### Real-time Features
1. Add WebSocket message handlers in `src/websocket/`
2. Ensure proper session-based authentication
3. Add client-side WebSocket integration
4. Test connection resilience and reconnection

## Troubleshooting

### Common Issues
- **Database connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
- **Session issues**: Check cookie settings and CORS configuration
- **WebSocket connection**: Verify session cookies are being sent
- **Build issues**: Clear node_modules and reinstall dependencies

### Useful Commands
```bash
# Reset everything and start fresh
make clean-all
make setup
make build
make dev

# Check service health
make health

# View logs for debugging
make logs-api
make logs-ui
make logs-db
```

## Testing Standards
- **Coverage requirement**: >90% for new code
- **BDD approach**: Given-When-Then patterns
- **Test isolation**: Clean database state between tests
- **Comprehensive testing**: Unit, integration, and end-to-end tests

## Security Best Practices
- Never trust client-provided user IDs
- Always validate sessions on protected endpoints
- Use HTTP-only cookies for session storage
- Implement proper CORS policies
- Validate all input data with TypeBox schemas
- Log security events for monitoring

---

*Last updated: 2025-07-25*
*For API documentation, see: `/api/docs/api-reference.txt`*
