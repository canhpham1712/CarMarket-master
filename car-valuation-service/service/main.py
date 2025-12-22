from pathlib import Path
from typing import Optional
import os
import pickle
import joblib

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "models" / "car_price_predictor.pkl"
ENCODERS_PATH = BASE_DIR / "models" / "label_encoders.pkl"
FEATURES_PATH = BASE_DIR / "models" / "feature_columns.pkl"
METRICS_PATH = BASE_DIR / "models" / "model_metrics.pkl"


class CarInput(BaseModel):
    brand: str = Field(..., description="Hãng xe (ví dụ: Toyota)")
    model: str = Field(..., description="Dòng xe (ví dụ: Vios)")
    year: int = Field(..., description="Năm sản xuất", ge=1990, le=2030)
    mileage_km: int = Field(..., description="Số km đã đi", ge=0)
    version: Optional[str] = Field(None, description="Phiên bản xe (ví dụ: 1.5G CVT)")
    color: Optional[str] = Field(None, description="Màu xe (ví dụ: Trắng)")
    transmission: Optional[str] = Field(None, description="Hộp số (AT/MT)")
    location: Optional[str] = Field(None, description="Địa điểm")


class PricePrediction(BaseModel):
    price_estimate: float = Field(..., description="Giá dự đoán (triệu VND)")
    price_min: float = Field(..., description="Giá tối thiểu (triệu VND)")
    price_max: float = Field(..., description="Giá tối đa (triệu VND)")
    confidence_level: str = Field(..., description="Độ tin cậy")
    mae_estimate: float = Field(..., description="Sai số ước tính (triệu VND)")


app = FastAPI(title="Car Valuation Service", version="1.0.0")

# CORS middleware để frontend có thể gọi API
# Hỗ trợ environment variable để cấu hình origins trong production
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env == "*":
    allowed_origins = ["*"]
else:
    # Cho phép nhiều origins, phân cách bởi dấu phẩy
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables để lưu model và encoders
model = None
label_encoders = None
feature_columns = None
test_mae = 104.0  # Default fallback
test_r2 = 0.959  # Default fallback


def load_model_and_encoders():
    """Load model và label encoders"""
    global model, label_encoders, feature_columns, test_mae, test_r2
    
    if not MODEL_PATH.exists():
        raise RuntimeError(f"Model file not found at {MODEL_PATH}")
    if not ENCODERS_PATH.exists():
        raise RuntimeError(f"Encoders file not found at {ENCODERS_PATH}")
    if not FEATURES_PATH.exists():
        raise RuntimeError(f"Features file not found at {FEATURES_PATH}")
    
    # Load model - thử joblib trước, nếu không được thì dùng pickle
    try:
        loaded = joblib.load(MODEL_PATH)
        print(f"[DEBUG] Loaded object type: {type(loaded)}")
        print(f"[DEBUG] Has predict: {hasattr(loaded, 'predict')}")
        # Kiểm tra xem có phải là model không
        if hasattr(loaded, 'predict'):
            model = loaded
            print("✅ Model loaded with joblib")
        else:
            # Nếu không phải model, có thể là numpy array hoặc object khác
            print(f"[DEBUG] Loaded object attributes: {[attr for attr in dir(loaded) if not attr.startswith('_')][:10]}")
            raise ValueError(f"Loaded object is not a model (type: {type(loaded)})")
    except Exception as e:
        print(f"⚠️ Joblib failed: {e}")
        print(f"[DEBUG] Trying pickle as fallback...")
        try:
            with open(MODEL_PATH, 'rb') as f:
                loaded = pickle.load(f)
            print(f"[DEBUG] Pickle loaded object type: {type(loaded)}")
            print(f"[DEBUG] Has predict: {hasattr(loaded, 'predict')}")
            # Kiểm tra xem có phải là model không
            if hasattr(loaded, 'predict'):
                model = loaded
                print("✅ Model loaded with pickle")
            else:
                print(f"[DEBUG] Pickle loaded object attributes: {[attr for attr in dir(loaded) if not attr.startswith('_')][:10]}")
                raise ValueError(f"Loaded object is not a model (type: {type(loaded)}, has predict: {hasattr(loaded, 'predict')})")
        except Exception as e2:
            print(f"[DEBUG] Both joblib and pickle failed")
            print(f"[DEBUG] Joblib error: {e}")
            print(f"[DEBUG] Pickle error: {e2}")
            raise RuntimeError(f"Failed to load model with both joblib and pickle. Joblib error: {e}. Pickle error: {e2}")
    
    # Load label encoders - thử joblib trước
    try:
        label_encoders = joblib.load(ENCODERS_PATH)
        print("✅ Encoders loaded with joblib")
    except Exception as e:
        print(f"⚠️ Joblib failed, trying pickle: {e}")
        try:
            with open(ENCODERS_PATH, 'rb') as f:
                label_encoders = pickle.load(f)
            print("✅ Encoders loaded with pickle")
        except Exception as e2:
            raise RuntimeError(f"Failed to load encoders with both joblib and pickle: {e2}")
    
    # Load feature columns
    try:
        feature_columns = joblib.load(FEATURES_PATH)
    except Exception as e:
        with open(FEATURES_PATH, 'rb') as f:
            feature_columns = pickle.load(f)
    
    # Load model metrics
    try:
        metrics = joblib.load(METRICS_PATH)
        test_mae = metrics['test_mae']
        test_r2 = metrics['test_r2']
        print(f"   ✅ Loaded metrics: MAE={test_mae:.0f} triệu, R²={test_r2:.3f}")
    except Exception as e:
        print(f"   ⚠️ Could not load metrics, using defaults: {e}")
    
    # Validate model
    if not hasattr(model, 'predict'):
        raise RuntimeError(f"Loaded model does not have 'predict' method. Type: {type(model)}")
    
    print(f"✅ Model loaded successfully")
    print(f"   - Model type: {type(model)}")
    print(f"   - Has predict method: {hasattr(model, 'predict')}")
    print(f"   - Features: {feature_columns}")
    print(f"   - Encoders: {list(label_encoders.keys())}")


@app.on_event("startup")
def startup_event():
    """Load model khi khởi động"""
    try:
        load_model_and_encoders()
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        raise


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "encoders_loaded": label_encoders is not None
    }


@app.post("/predict", response_model=PricePrediction)
def predict_price(car: CarInput):
    """Dự đoán giá xe dựa trên thông tin đầu vào"""
    if model is None or label_encoders is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    # Debug: Kiểm tra model
    if not hasattr(model, 'predict'):
        raise HTTPException(
            status_code=500,
            detail=f"Model is invalid. Expected sklearn model, got: {type(model)}. Model attributes: {[attr for attr in dir(model) if not attr.startswith('_')][:10]}"
        )
    
    try:
        # Chuẩn bị features theo thứ tự: ['make', 'model', 'year', 'version', 'color', 'mileage']
        features = []
        
        for col in feature_columns:
            if col == 'make':
                # Encode make (brand)
                try:
                    encoded_val = label_encoders[col].transform([car.brand])[0]
                except (ValueError, KeyError):
                    # Nếu không tìm thấy, dùng giá trị mặc định (0)
                    encoded_val = 0
                features.append(encoded_val)
                
            elif col == 'model':
                # Encode model
                try:
                    encoded_val = label_encoders[col].transform([car.model])[0]
                except (ValueError, KeyError):
                    encoded_val = 0
                features.append(encoded_val)
                
            elif col == 'year':
                # Giữ nguyên year
                features.append(float(car.year))
                
            elif col == 'version':
                # Encode version
                version_val = car.version if car.version else ""
                try:
                    encoded_val = label_encoders[col].transform([version_val])[0]
                except (ValueError, KeyError):
                    encoded_val = 0
                features.append(encoded_val)
                
            elif col == 'color':
                # Encode color
                color_val = car.color if car.color else ""
                try:
                    encoded_val = label_encoders[col].transform([color_val])[0]
                except (ValueError, KeyError):
                    encoded_val = 0
                features.append(encoded_val)
                
            elif col == 'mileage':
                # Giữ nguyên mileage (đã là km)
                features.append(float(car.mileage_km))
        
        # Validate model before prediction
        if not hasattr(model, 'predict'):
            raise HTTPException(
                status_code=500,
                detail=f"Model is not valid. Type: {type(model)}"
            )
        
        # Predict
        features_array = np.array([features])
        print(f"[DEBUG] Features array shape: {features_array.shape}")
        print(f"[DEBUG] Features array: {features_array}")
        print(f"[DEBUG] Model type: {type(model)}")
        price_estimate = float(model.predict(features_array)[0])
        
        # Tính khoảng giá dựa trên MAE
        margin = test_mae * 1.0  # Khoảng ±1.0 * MAE (giảm từ 1.5 để khoảng giá hợp lý hơn)
        price_min = max(0.0, price_estimate - margin)
        price_max = price_estimate + margin
        
        # Xác định độ tin cậy
        if test_r2 > 0.95:
            confidence = "Cao (>95%)"
        elif test_r2 > 0.90:
            confidence = "Trung bình-Cao (90-95%)"
        else:
            confidence = "Trung bình (<90%)"
        
        return PricePrediction(
            price_estimate=round(price_estimate, 0),
            price_min=round(price_min, 0),
            price_max=round(price_max, 0),
            confidence_level=confidence,
            mae_estimate=round(test_mae, 0)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Prediction error: {str(e)}"
        ) from e


# Gợi ý chạy: uvicorn service.main:app --reload --port 8001


