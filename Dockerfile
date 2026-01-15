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

# Create data directory for persistent storage BEFORE switching user
RUN mkdir -p /app/data/root_vault && \
    chown -R node:node /app/data

# Create entrypoint script to ensure directory ownership on container start
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo '# Ensure data directory exists and has correct permissions' >> /entrypoint.sh && \
    echo 'mkdir -p /app/data/root_vault' >> /entrypoint.sh && \
    echo 'chown -R node:node /app/data' >> /entrypoint.sh && \
    echo 'chmod -R 755 /app/data' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Switch to non-root user
USER node

# Expose port 6666 for HTTP transport
EXPOSE 6666

# Use entrypoint to create directory and set permissions before starting server
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js"]