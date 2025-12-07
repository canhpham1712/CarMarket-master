# FROM node:20-alpine AS builder

# WORKDIR /app

# # Copy package files
# COPY package*.json ./
# COPY packages/server/package*.json ./packages/server/
# COPY packages/client/package*.json ./packages/client/

# # Install dependencies
# RUN npm ci

# # Copy source code
# COPY . .

# # Build application
# RUN npm run build

# # Production stage
# FROM node:20-alpine

# WORKDIR /app

# # Copy package files
# COPY package*.json ./
# COPY packages/server/package*.json ./packages/server/

# # Install production dependencies only
# RUN npm ci --production

# # Copy built application
# COPY --from=builder /app/packages/server/dist ./packages/server/dist
# # COPY --from=builder /app/packages/server/node_modules ./packages/server/node_modules

# # Create uploads directory
# RUN mkdir -p ./packages/server/uploads

# WORKDIR /app/packages/server

# EXPOSE 3000

# CMD ["node", "dist/main"]

# --------------------------------------------------------
# Dockerfiile này dành cho giai đoạn production của server
# --------------------------------------------------------
# GIAI ĐOẠN BUILDER
# Thay đổi từ node:20-alpine sang node:20-slim
# --------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Cài đặt các công cụ build cần thiết (Debian dùng apt-get thay vì apk)
# openssl thường cần thiết cho Prisma hoặc các thư viện crypto
RUN apt-get update -y && apt-get install -y openssl

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

# --------------------------------------------------------
# GIAI ĐOẠN PRODUCTION
# Thay đổi từ node:20-alpine sang node:20-slim
# --------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Cài đặt thư viện runtime cần thiết
# onnxruntime cần glibc (có sẵn trong slim) và có thể cần thêm libgomp1 hoặc các lib cơ bản khác
RUN apt-get update -y && apt-get install -y openssl ca-certificates procps

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