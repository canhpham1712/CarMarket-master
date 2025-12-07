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

# --------------------------------------------------------
# SỬA ĐỔI: Chuyển sang node:20-slim (Debian based) thay vì alpine
# để hỗ trợ glibc cần thiết cho onnxruntime
# --------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Cài đặt các thư viện hệ thống cần thiết (nếu cần thiết cho các native modules khác)
# Với node:20-slim, glibc đã có sẵn nên onnxruntime sẽ chạy tốt.
# Nếu bạn dùng Prisma, có thể cần thêm openssl:
RUN apt-get update -y && apt-get install -y openssl ca-certificates

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