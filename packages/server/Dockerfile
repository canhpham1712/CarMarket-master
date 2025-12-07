FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/

# Install production dependencies only
RUN npm ci --production

# Copy built application
COPY --from=builder /app/packages/server/dist ./packages/server/dist
# COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules

# Create uploads directory
RUN mkdir -p ./packages/server/uploads

WORKDIR /app/packages/server

EXPOSE 3000

CMD ["node", "dist/main"]

