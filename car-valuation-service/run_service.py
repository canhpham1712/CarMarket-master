#!/usr/bin/env python3
"""
Script để chạy FastAPI service cho car valuation
"""
import uvicorn
import os

if __name__ == "__main__":
    # Hỗ trợ cả development và production
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "127.0.0.1")
    reload = os.getenv("RELOAD", "false").lower() == "true"
    
    uvicorn.run(
        "service.main:app",
        host=host,
        port=port,
        reload=reload,  # Tắt reload trong production
        log_level="info"
    )

