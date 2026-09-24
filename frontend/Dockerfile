# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

# Production stage - use builder as base
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy only necessary files
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/next.config.js ./

# Install production dependencies only
RUN npm ci --frozen-lockfile --omit=dev

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
