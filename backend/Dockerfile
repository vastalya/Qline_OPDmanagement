# =============================================================================
# Qline Backend - Production Dockerfile (Multi-stage)
# Stage 1: Build | Stage 2: Production (minimal image)
# =============================================================================

# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker layer caching - only reinstall if deps change)
COPY package.json package-lock.json ./

# Install ALL deps (including dev) for build
RUN npm ci --frozen-lockfile

# Copy source
COPY . .

# ---- Stage 2: Production ----
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -S qline && adduser -S qline -G qline

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy source from builder (not raw host files)
COPY --from=builder /app .

# Install ONLY production deps
RUN npm ci --frozen-lockfile --omit=dev && \
    # Clean npm cache to reduce image size
    npm cache clean --force

# Fix ownership
RUN chown -R qline:qline /app

USER qline

# Expose API port
EXPOSE 5000

# Health check (uses our /health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:5000/health || exit 1

# Start server
CMD ["node", "server.js"]
