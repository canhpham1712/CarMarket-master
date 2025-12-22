FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ code và models
COPY . .

# Expose port (Render sẽ tự động set PORT env variable)
EXPOSE 8001

# Chạy service với uvicorn
# Render sẽ tự động set PORT env variable, nhưng nếu không có thì dùng 8001
CMD uvicorn service.main:app --host 0.0.0.0 --port ${PORT:-8001}

