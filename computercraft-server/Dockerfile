# ComputerCraft Dashboard Server - Production Dockerfile
# Multi-stage build for optimal image size and security

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Remove dev dependencies to reduce size
RUN npm ci --omit=dev && npm cache clean --force

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S computercraft -u 1001

# Set working directory
WORKDIR /app

# Copy built application and production dependencies from builder stage
COPY --from=builder --chown=computercraft:nodejs /app/dist ./dist
COPY --from=builder --chown=computercraft:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=computercraft:nodejs /app/package*.json ./

# Copy ComputerCraft client script
COPY --chown=computercraft:nodejs computercraft_client.lua ./

# Switch to non-root user
USER computercraft

# Expose the port (configurable via environment variable)
EXPOSE 8080

# Health check to ensure server is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { host: 'localhost', port: process.env.PORT || 8080, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "dist/index.js"]

# Metadata labels
LABEL maintainer="your-email@example.com"
LABEL description="ComputerCraft Dashboard WebSocket Server"
LABEL version="1.0.0"
