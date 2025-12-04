"""
Script để test load model và xem lỗi cụ thể
"""
from pathlib import Path
import joblib
import pickle
import sys

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "car_price_predictor.pkl"
ENCODERS_PATH = BASE_DIR / "models" / "label_encoders.pkl"
FEATURES_PATH = BASE_DIR / "models" / "feature_columns.pkl"

print("="*60)
print("TEST LOAD MODEL")
print("="*60)

# Kiểm tra file tồn tại
print(f"\n1️⃣ Kiểm tra file:")
print(f"   MODEL_PATH: {MODEL_PATH}")
print(f"   Exists: {MODEL_PATH.exists()}")
if MODEL_PATH.exists():
    print(f"   Size: {MODEL_PATH.stat().st_size} bytes")
    print(f"   Modified: {MODEL_PATH.stat().st_mtime}")

print(f"\n   ENCODERS_PATH: {ENCODERS_PATH}")
print(f"   Exists: {ENCODERS_PATH.exists()}")

print(f"\n   FEATURES_PATH: {FEATURES_PATH}")
print(f"   Exists: {FEATURES_PATH.exists()}")

# Thử load model với joblib
print(f"\n2️⃣ Thử load model với joblib:")
try:
    model = joblib.load(MODEL_PATH)
    print(f"   ✅ Load thành công!")
    print(f"   - Type: {type(model)}")
    print(f"   - Class: {model.__class__.__name__}")
    print(f"   - Module: {model.__class__.__module__}")
    print(f"   - Has predict: {hasattr(model, 'predict')}")
    
    if hasattr(model, 'predict'):
        # Test predict
        import numpy as np
        dummy = np.array([[0, 0, 2020, 0, 0, 50000]])
        result = model.predict(dummy)
        print(f"   ✅ Predict works! Result: {result[0]:.0f}")
    else:
        print(f"   ❌ Model không có method predict!")
        print(f"   - Attributes: {[attr for attr in dir(model) if not attr.startswith('_')][:10]}")
        
except Exception as e:
    print(f"   ❌ Lỗi khi load với joblib:")
    print(f"   - Error type: {type(e).__name__}")
    print(f"   - Error message: {str(e)}")
    import traceback
    traceback.print_exc()
    
    # Thử với pickle
    print(f"\n3️⃣ Thử load model với pickle:")
    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print(f"   ✅ Load thành công với pickle!")
        print(f"   - Type: {type(model)}")
        print(f"   - Has predict: {hasattr(model, 'predict')}")
    except Exception as e2:
        print(f"   ❌ Lỗi khi load với pickle:")
        print(f"   - Error type: {type(e2).__name__}")
        print(f"   - Error message: {str(e2)}")
        import traceback
        traceback.print_exc()

# Kiểm tra encoders
print(f"\n4️⃣ Kiểm tra encoders:")
try:
    encoders = joblib.load(ENCODERS_PATH)
    print(f"   ✅ Encoders loaded")
    print(f"   - Type: {type(encoders)}")
    if isinstance(encoders, dict):
        print(f"   - Keys: {list(encoders.keys())}")
except Exception as e:
    print(f"   ❌ Lỗi load encoders: {e}")

# Kiểm tra features
print(f"\n5️⃣ Kiểm tra features:")
try:
    features = joblib.load(FEATURES_PATH)
    print(f"   ✅ Features loaded")
    print(f"   - Type: {type(features)}")
    print(f"   - Value: {features}")
except Exception as e:
    print(f"   ❌ Lỗi load features: {e}")

print(f"\n" + "="*60)

