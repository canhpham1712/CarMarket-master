#!/usr/bin/env python3
"""
Script để chạy FastAPI service cho car valuation
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "service.main:app",
        host="127.0.0.1",  # Use localhost instead of 0.0.0.0 for better compatibility
        port=8001,
        reload=True,
        log_level="info"
    )

