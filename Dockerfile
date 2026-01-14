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

# Switch to non-root user
USER node

# Expose port 6666 for HTTP transport
EXPOSE 6666

# Default command - run the MCP server
CMD ["node", "dist/index.js"]