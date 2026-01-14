# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all files first (including tsconfig.json)
COPY . .

# Install dependencies and run prepare script (which builds)
RUN npm ci

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (skip prepare script)
RUN npm ci --omit=dev --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory for persistent storage
RUN mkdir -p /app/data

# Set ownership for data directory
RUN chown -R node:node /app/data

# Create entrypoint script BEFORE switching to non-root user
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'mkdir -p /app/data/root_vault 2>/dev/null || true' >> /entrypoint.sh && \
    echo 'chown -R node:node /app/data/root_vault 2>/dev/null || true' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Switch to non-root user
USER node

# Expose port 6666 for HTTP transport
EXPOSE 6666

# Use entrypoint to create directory before starting server
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]