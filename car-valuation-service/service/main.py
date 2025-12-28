import json
import os
import joblib
import pandas as pd
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --- CẤU HÌNH PATH ---
BASE_DIR = Path(__file__).resolve().parents[1]
# Trỏ vào file Pipeline mới (chứa cả xử lý dữ liệu + model XGBoost)
MODEL_PATH = BASE_DIR / "models" / "best_car_price_pipeline.pkl"
# Metrics bây giờ lưu dưới dạng JSON
METRICS_PATH = BASE_DIR / "models" / "model_metrics.json"

# --- INPUT SCHEMA ---
class CarInput(BaseModel):
    brand: str = Field(..., description="Hãng xe (ví dụ: Toyota)")
    model: str = Field(..., description="Dòng xe (ví dụ: Vios)")
    year: int = Field(..., description="Năm sản xuất", ge=1990, le=2030)
    mileage_km: int = Field(..., description="Số km đã đi", ge=0)
    version: Optional[str] = Field(None, description="Phiên bản xe (ví dụ: 1.5G CVT)")
    color: Optional[str] = Field(None, description="Màu xe (ví dụ: Trắng)")
    transmission: Optional[str] = Field(None, description="Hộp số (AT/MT) - (Hiện tại chưa dùng trong model)")
    location: Optional[str] = Field(None, description="Địa điểm - (Hiện tại chưa dùng trong model)")

class PricePrediction(BaseModel):
    price_estimate: float = Field(..., description="Giá dự đoán (triệu VND)")
    price_min: float = Field(..., description="Giá tối thiểu (triệu VND)")
    price_max: float = Field(..., description="Giá tối đa (triệu VND)")
    confidence_level: str = Field(..., description="Độ tin cậy")
    mae_estimate: float = Field(..., description="Sai số ước tính (triệu VND)")

# --- APP SETUP ---
app = FastAPI(title="Car Valuation Service", version="2.0.0")

# CORS setup
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = ["*"] if allowed_origins_env == "*" else [o.strip() for o in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model_pipeline = None
test_mae = 35.0  # Default fallback từ log train gần nhất
test_r2 = 0.98   # Default fallback

def load_model_resources():
    """Load Pipeline hoàn chỉnh và Metrics"""
    global model_pipeline, test_mae, test_r2
    
    # 1. Load Model Pipeline
    if not MODEL_PATH.exists():
        raise RuntimeError(f"❌ Không tìm thấy file model tại: {MODEL_PATH}")
    
    try:
        # Load pipeline (bao gồm preprocessor + regressor)
        model_pipeline = joblib.load(MODEL_PATH)
        print(f"✅ Đã load Model Pipeline thành công từ: {MODEL_PATH.name}")
        print(f"   - Type: {type(model_pipeline)}")
    except Exception as e:
        raise RuntimeError(f"❌ Lỗi khi load model bằng joblib: {e}")

    # 2. Load Metrics (JSON)
    if METRICS_PATH.exists():
        try:
            with open(METRICS_PATH, 'r') as f:
                metrics = json.load(f)
                # JSON lưu key là tên cột, ví dụ: {"Test MAE": 34.9, "R2 Score": 0.99}
                # Cần map đúng key từ file json mà script train đã lưu
                test_mae = metrics.get('Test MAE', test_mae)
                test_r2 = metrics.get('R2 Score', test_r2)
            print(f"✅ Đã load Metrics: MAE={test_mae:.0f} triệu, R2={test_r2:.4f}")
        except Exception as e:
            print(f"⚠️ Không thể đọc file metrics json: {e}. Sử dụng giá trị mặc định.")
    else:
        print("⚠️ Không tìm thấy file metrics json. Sử dụng giá trị mặc định.")

@app.on_event("startup")
def startup_event():
    load_model_resources()

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model_loaded": model_pipeline is not None,
        "current_mae": test_mae,
        "model_type": str(type(model_pipeline)) if model_pipeline else "None"
    }

@app.post("/predict", response_model=PricePrediction)
def predict_price(car: CarInput):
    """
    Dự đoán giá xe sử dụng Pipeline.
    Không cần manual encoding vì Pipeline đã có sẵn OneHotEncoder.
    """
    if model_pipeline is None:
        raise HTTPException(status_code=500, detail="Model chưa được load.")
    
    try:
        # 1. Chuẩn bị dữ liệu đầu vào dưới dạng DataFrame
        # Tên cột PHẢI KHỚP chính xác với lúc train trong file csv
        input_data = pd.DataFrame([{
            'make': car.brand,       # Mapping: brand -> make
            'model': car.model,
            'year': car.year,
            'version': car.version if car.version else "Unknown",
            'color': car.color if car.color else "Unknown",
            'mileage': car.mileage_km # Mapping: mileage_km -> mileage
        }])

        # Debug input
        # print(f"[DEBUG] Input DataFrame:\n{input_data}")

        # 2. Dự đoán (Pipeline tự động xử lý NaN, Encode, Scale -> Predict)
        price_estimate = float(model_pipeline.predict(input_data)[0])

        # 3. Tính toán khoảng giá và độ tin cậy
        # Dùng hệ số an toàn 2.0 * MAE để bao phủ 95% trường hợp (theo quy tắc thống kê cơ bản)
        # Tuy nhiên để user thấy khoảng hẹp hơn cho hấp dẫn, ta dùng 1.5 hoặc 1.0 tùy chiến lược
        margin = test_mae * 1.5 
        
        price_min = max(0.0, price_estimate - margin)
        price_max = price_estimate + margin
        
        # Xác định text độ tin cậy
        if test_r2 > 0.90:
            confidence = "Rất cao (>90%)"
        elif test_r2 > 0.80:
            confidence = "Cao (>80%)"
        else:
            confidence = "Trung bình"

        return PricePrediction(
            price_estimate=round(price_estimate, 0),
            price_min=round(price_min, 0),
            price_max=round(price_max, 0),
            confidence_level=confidence,
            mae_estimate=round(test_mae, 0)
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Lỗi khi dự đoán: {str(e)}"
        )