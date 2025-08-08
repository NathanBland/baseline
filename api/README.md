# Elysia with Bun runtime

## Getting Started
To get started with this template, simply paste this command into your terminal:
```bash
bun create elysia ./elysia-example
```

## Development
To start the development server run:
```bash
bun run dev
```

Open http://localhost:3000/ with your browser to see the result.

---

## Baseline API (Repository-specific)

### Scripts

```bash
# Development
bun run dev

# Build and start
bun run build
bun run start

# Tests
bun test
bun test --watch
```

### Database

```bash
# Prisma
bun run db:generate
bun run db:migrate           # prisma migrate dev
bun run db:migrate:deploy    # prisma migrate deploy
bun run db:reset             # prisma migrate reset --force
bun run db:seed              # run seed script
bun run db:studio            # open Prisma Studio
```

### Testing

- Unit/integration tests use Bun’s test runner: `bun test`.
- In Docker, use Make targets from the repo root:
  - `make test-api` to run API tests.
  - `make test-coverage` runs coverage for API and UI (API via `bun test --coverage`).

### Health & API Docs

- Health endpoint: `GET /health` (http://localhost:3000/health)
- Swagger UI: http://localhost:3000/swagger

### Environment Variables

The API reads these (see `docker-compose.yml` and `src/index.ts`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/baseline
REDIS_URL=redis://localhost:6379
API_PORT=3000
UI_URL=http://localhost:5173
JWT_SECRET=your-secret-key
```

For containerized development, prefer the Makefile targets in the repo root:

```bash
make dev         # databases + services
make migrate     # run migrations in API container
make seed        # seed data