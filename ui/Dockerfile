# Multi-stage Dockerfile for Remix UI
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies stage
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 3000
ENV NODE_ENV=development
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY package.json ./
EXPOSE 3000
USER node
CMD ["npm", "run", "start"]
