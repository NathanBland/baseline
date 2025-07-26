# Baseline - Full-Stack Reference Architecture

> A comprehensive, modular, and pluggable full-stack baseline repository built with modern technologies and best practices.

## Overview

Baseline is a production-ready full-stack application template designed to serve as a reference architecture for modern web applications. It demonstrates best practices in containerization, real-time communication, authentication, testing, and deployment.

## Architecture

### Core Technologies
- **Frontend**: Remix + React with shadcn/ui and Tailwind CSS v4
- **Backend**: ElysiaJS API with Bun runtime
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for sessions and real-time features
- **Auth**: Lucia with local and OIDC support
- **Real-time**: WebSocket communication
- **Testing**: Vitest with comprehensive coverage
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: DroneCI with Portainer deployment

### Project Structure
```
baseline/
├── api/                 # ElysiaJS API server
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── auth/        # Authentication logic
│   │   ├── db/          # Database connection & models
│   │   ├── websocket/   # Real-time WebSocket handlers
│   │   └── test/        # API tests
│   └── Dockerfile       # API container configuration
├── ui/                  # Remix frontend application
│   ├── app/
│   │   ├── components/  # Reusable UI components
│   │   ├── routes/      # Remix routes
│   │   └── lib/         # Utility functions
│   └── Dockerfile       # UI container configuration
├── scripts/             # Database initialization scripts
├── docs/                # Documentation
├── docker-compose.yml   # Local development environment
├── Makefile            # Development commands
└── .drone.yml          # CI/CD pipeline
```

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Make (for command orchestration)
- Bun (for local development)

### Setup

1. **Clone and setup the project**:
   ```bash
   git clone <repository-url> baseline
   cd baseline
   make setup
   ```

2. **Configure environment**:
   ```bash
   # Edit .env with your settings
   cp .env.example .env
   ```

3. **Start development environment**:
   ```bash
   make dev
   ```

4. **Run database migrations and seed data**:
   ```bash
   make migrate
   make seed
   ```

### Available Services
- **UI**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/swagger
- **Database**: PostgreSQL on port 5432
- **Redis**: Redis on port 6379

## Available Commands

All commands are orchestrated through the Makefile:

```bash
# Development
make dev              # Start development environment
make build            # Build all containers
make test             # Run all tests
make lint             # Run linters

# Database
make migrate          # Run database migrations
make seed             # Seed database with test data
make db-studio        # Open Prisma Studio

# Utilities
make logs             # View container logs
make clean            # Clean up containers and volumes
make help             # Show all available commands
```

## Authentication

Baseline includes a comprehensive authentication system:

- **Local Authentication**: Email/password with secure password hashing
- **OIDC Support**: GitHub and Google OAuth integration
- **Session Management**: Lucia-based session handling
- **Security**: CSRF protection, secure cookies, and proper validation

## Real-time Features

WebSocket integration provides:
- Real-time messaging
- Typing indicators
- User presence
- Live conversation updates

## Testing

Comprehensive testing setup with:
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **Coverage Reports**: Detailed coverage analysis
- **CI Integration**: Automated testing in pipelines

```bash
# Run tests
make test
make test-coverage
```

## Deployment

### Overview
The project uses a complete CI/CD pipeline with DroneCI and Portainer for automated deployment to production environments.

**Deployment Flow:**
1. Push to `develop` → DroneCI tests → Deploy to staging
2. Push to `main` → DroneCI tests → Build production images → Deploy to production
3. Portainer pulls latest images and updates stack automatically

### Production Environment Setup

#### Required Secrets in DroneCI
Configure these secrets in your DroneCI instance:

```bash
# Docker Registry (for image storage)
docker_username          # Docker registry username
docker_password          # Docker registry password/token

# Portainer Integration
PORTAINER_URL           # https://port.aqueous.network
PORTAINER_API_KEY       # Portainer API key for stack management
PORTAINER_STACK_ID_STAGING     # Staging stack ID
PORTAINER_STACK_ID_PRODUCTION  # Production stack ID

# Optional: Slack Notifications
slack_webhook           # Slack webhook URL for deployment notifications
```

#### GitHub Repository Settings
1. **Webhook Configuration**: DroneCI webhook should be configured to trigger on:
   - Push events to `main` and `develop` branches
   - Pull request events

2. **Branch Protection**: Recommended settings for `main` branch:
   - Require status checks to pass (DroneCI build)
   - Require up-to-date branches
   - Restrict pushes to admins/maintainers

#### Portainer Stack Configuration

1. **Create Stack in Portainer**:
   - Navigate to https://port.aqueous.network
   - Create new stack using Git repository method
   - Repository URL: Your GitHub repository URL
   - Compose file path: `docker-compose.prod.yml`
   - Branch: `main` (for production) or `develop` (for staging)

2. **Environment Variables in Portainer**:
   Set these environment variables in your Portainer stack:

   ```bash
   # Database Configuration
   POSTGRES_DB=baseline_prod
   POSTGRES_USER=baseline_user
   POSTGRES_PASSWORD=<secure-password>
   
   # Redis Configuration  
   REDIS_URL=redis://redis:6379
   
   # API Configuration
   JWT_SECRET=<secure-jwt-secret>
   API_PORT=3001
   DATABASE_URL=postgresql://baseline_user:<secure-password>@postgres:5432/baseline_prod
   
   # UI Configuration
   UI_PORT=3000
   VITE_API_URL=https://your-domain.com/api
   VITE_WS_URL=wss://your-domain.com/api
   VITE_APP_NAME=Baseline Production
   VITE_APP_VERSION=1.0.0
   
   # Docker Images (set by CI/CD)
   DOCKER_REGISTRY=your-registry.com
   DOCKER_REPO_NAME=baseline
   IMAGE_TAG=latest
   
   # OAuth Configuration (Optional)
   GOOGLE_CLIENT_ID=<google-oauth-client-id>
   GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
   GITHUB_CLIENT_ID=<github-oauth-client-id>
   GITHUB_CLIENT_SECRET=<github-oauth-client-secret>
   ```

### Local Production Testing

```bash
# Validate production compose file
make validate-stack

# Check if production images exist
make check-images

# Test production deployment locally
make deploy-up
make deploy-logs
```

### Troubleshooting Deployment

**Common Issues:**

1. **Images not found**: Ensure CI/CD pipeline completed successfully
   ```bash
   make check-images
   ```

2. **Database connection errors**: Verify `DATABASE_URL` format in Portainer environment
   ```bash
   # Correct format:
   postgresql://username:password@postgres:5432/database
   ```

3. **Environment variable errors**: Check Portainer stack environment configuration

4. **Stack update failures**: Verify Portainer API key and stack IDs in DroneCI secrets

### Manual Deployment Commands

```bash
# Build production images locally
make deploy-build

# Start production stack
make deploy-up

# View production logs
make deploy-logs

# Restart production services
make deploy-restart

# Stop production stack
make deploy-down
```

## Database Schema

Core entities:
- **Users**: User accounts with profile information
- **Conversations**: Direct messages, groups, and channels
- **Messages**: Text messages with threading support
- **Sessions**: Authentication session management

## Configuration

### Environment Variables
Key configuration options in `.env`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port

# API
API_PORT=3001
JWT_SECRET=your-secret-key

# UI
UI_PORT=3000
API_URL=http://api:3001

# Auth (Optional OIDC)
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
```

## Contributing

This is a reference architecture. Fork and adapt for your needs:

1. Fork the repository
2. Create your feature branch
3. Follow the existing patterns and conventions
4. Add tests for new functionality
5. Update documentation as needed

## Documentation

Detailed documentation available in the `docs/` directory:
- [API Documentation](./docs/api.md)
- [Frontend Guide](./docs/frontend.md)
- [Deployment Guide](./docs/deployment.md)
- [Development Guide](./docs/development.md)

## Modular Design

Baseline is designed to be modular and pluggable:
- **Swappable Components**: Easy to replace any layer
- **Environment Agnostic**: Runs anywhere Docker runs
- **Scalable Architecture**: Ready for horizontal scaling
- **Best Practices**: Follows industry standards

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ as a reference architecture for modern full-stack applications.**
