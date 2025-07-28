# Multi-stage Dockerfile for ElysiaJS API
FROM oven/bun:1 AS base
WORKDIR /app

# Install OpenSSL and CA certificates to fix Prisma detection
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set OpenSSL version for Prisma
ENV OPENSSL_ROOT_DIR=/usr
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

# Install dependencies stage
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Development stage
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client
RUN bunx prisma generate
EXPOSE 3001
ENV NODE_ENV=development
# Use --watch for hot reloading in development
CMD ["bun", "run", "--watch", "src/index.ts"]

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN bun run build

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json ./
EXPOSE 3001
USER bun
# Ensure production environment is used
ENV NODE_ENV=production
CMD ["sh", "-c", "NODE_ENV=production bun run start"]
