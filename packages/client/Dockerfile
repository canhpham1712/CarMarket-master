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
# --------------------------------------------------------
# Builder Stage
# --------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Cài đặt thư viện hệ thống cho build
RUN apt-get update -y && apt-get install -y openssl

# Copy toàn bộ package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install dependencies
RUN npm ci

# Copy toàn bộ source code
COPY . .

# Build application (Biên dịch TS -> JS vào thư mục dist)
RUN npm run build

# --------------------------------------------------------
# Production Stage
# --------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Cài đặt thư viện runtime (quan trọng cho onnxruntime, postgres, etc.)
RUN apt-get update -y && apt-get install -y openssl ca-certificates procps

# Copy package.json để cài dependencies
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/

# Chỉ cài production dependencies
RUN npm ci --production

# --- BẮT ĐẦU PHẦN SỬA ---

# Di chuyển vào thư mục làm việc của server
WORKDIR /app/packages/server

# 1. Copy thư mục dist ĐÚNG CHỖ (Sửa lỗi đường dẫn lồng nhau)
COPY --from=builder /app/packages/server/dist ./dist

# 2. Copy thư mục init-scripts từ root vào đúng chỗ để script đọc được
# Vì script chạy từ /app/packages/server, nên init-scripts nên để ở /app/init-scripts
COPY --from=builder /app/init-scripts /app/init-scripts

# --- KẾT THÚC PHẦN SỬA ---

# Tạo thư mục uploads
RUN mkdir -p ./uploads

EXPOSE 3000

# Lệnh khởi động tuần tự
# Lưu ý: Đảm bảo bạn đã tạo file run-init-sql.ts và run-migrations.ts trong src/scripts trước khi build
CMD ["/bin/sh", "-c", "node dist/scripts/run-init-sql.js && node dist/scripts/run-migrations.js && node dist/scripts/run-rbac-seed.js && node dist/main"]