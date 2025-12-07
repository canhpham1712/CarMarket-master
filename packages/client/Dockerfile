# FROM node:20-alpine AS builder

# WORKDIR /app

# # Copy package files
# COPY package*.json ./
# COPY packages/client/package*.json ./packages/client/

# # Install dependencies
# RUN npm ci

# # Copy source code
# COPY packages/client ./packages/client

# WORKDIR /app/packages/client

# # Build frontend
# RUN npm run build

# # Production stage with nginx
# FROM nginx:alpine

# # Copy built files
# COPY --from=builder /app/packages/client/dist /usr/share/nginx/html

# # Copy nginx config
# COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

# EXPOSE 80

# CMD ["nginx", "-g", "daemon off;"]

# --------------------------------------------------------
# Dockerfiile này dành cho giai đoạn production của server

# ... (Phần builder giữ nguyên) ...
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci
COPY . .
RUN npm run build

# --------------------------------------------------------
# Production stage
# --------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Cài đặt thư viện hệ thống
RUN apt-get update -y && apt-get install -y openssl ca-certificates procps

COPY package*.json ./
COPY packages/server/package*.json ./packages/server/

RUN npm ci --production

# Copy built application
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# [QUAN TRỌNG] Copy thư mục init-scripts để script có thể đọc file .sql
COPY --from=builder /app/init-scripts /app/init-scripts

RUN mkdir -p ./packages/server/uploads

WORKDIR /app/packages/server

EXPOSE 3000

# [CẬP NHẬT] Lệnh khởi động chạy tuần tự 4 bước:
# 1. Chạy Init SQL (file .sql raw)
# 2. Chạy Migrations (TypeORM)
# 3. Chạy Seed RBAC (Data)
# 4. Start Server
CMD ["/bin/sh", "-c", "node dist/scripts/run-init-sql.js && node dist/scripts/run-migrations.js && node dist/scripts/run-rbac-seed.js && node dist/main"]