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
# ... (Phần Builder giữ nguyên) ...

# --------------------------------------------------------
# Production stage
# --------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Cài đặt thư viện hệ thống
RUN apt-get update -y && apt-get install -y openssl ca-certificates procps

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/

# Install production dependencies
RUN npm ci --production

# Di chuyển vào thư mục server để làm việc
WORKDIR /app/packages/server

# [SỬA QUAN TRỌNG] Copy thẳng vào ./dist (ngang hàng packages.json server)
COPY --from=builder /app/packages/server/dist ./dist

# [SỬA QUAN TRỌNG] Copy init-scripts ra ngoài root (hoặc chỉnh lại đường dẫn trong script chạy)
# Script run-init-sql.ts của bạn đang tìm ../../../../init-scripts
# Tức là nó mong đợi init-scripts nằm ở /app/init-scripts
COPY --from=builder /app/init-scripts /app/init-scripts

RUN mkdir -p ./uploads

EXPOSE 3000

# Lệnh chạy tuần tự
CMD ["/bin/sh", "-c", "node dist/scripts/run-init-sql.js && node dist/scripts/run-migrations.js && node dist/scripts/run-rbac-seed.js && node dist/main"]