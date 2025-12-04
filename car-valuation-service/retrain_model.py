"""
Script để retrain nhiều model, so sánh và lưu model tốt nhất với scikit-learn hiện tại
"""
import joblib
import os
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

print("🔄 RETRAIN NHIỀU MODEL VÀ CHỌN MODEL TỐT NHẤT")
print("\n" + "="*60)

# Kiểm tra XGBoost
try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("⚠️ XGBoost không có sẵn, sẽ bỏ qua model này")

# Đường dẫn
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

# Tìm file data đã làm sạch hoặc file merged
cleaned_file = DATA_DIR / "toyota_cleaned.csv"
if cleaned_file.exists():
    data_file = cleaned_file
    print(f"\n📁 Đang đọc dữ liệu đã làm sạch từ: {data_file.name}")
else:
    data_files = list(DATA_DIR.glob("toyota_merged*.csv"))
    if not data_files:
        raise FileNotFoundError(
            f"Không tìm thấy file data trong {DATA_DIR}\n"
            f"Vui lòng export dataframe df_merged từ notebook ra file CSV:\n"
            f"df_merged.to_csv('data/toyota_cleaned.csv', index=False, encoding='utf-8')"
        )
    data_file = max(data_files, key=lambda p: p.stat().st_mtime)
    print(f"\n📁 Đang đọc dữ liệu từ: {data_file.name}")
    print(f"⚠️ Lưu ý: File này chưa được làm sạch. Nên export df_merged từ notebook ra toyota_cleaned.csv")

# 1. Load data
df = pd.read_csv(data_file, encoding='utf-8')
print(f"   ✅ Đã đọc {len(df)} dòng")

# 2. Chuẩn bị dữ liệu
print(f"\n1️⃣ CHUẨN BỊ DỮ LIỆU:")
feature_cols = ['make', 'model', 'year', 'version', 'color', 'mileage']
target_col = 'price_vnd'

df_train = df[feature_cols + [target_col]].copy()

# Loại bỏ null
print(f"   - Trước khi xử lý: {len(df_train)} dòng")
df_train = df_train.dropna()
print(f"   - Sau khi loại bỏ null: {len(df_train)} dòng")

# Xử lý mileage nếu là string (có "km")
if df_train['mileage'].dtype == 'object':
    print(f"   - Đang xử lý cột mileage (string -> numeric)...")
    df_train['mileage'] = df_train['mileage'].astype(str).str.replace(' km', '').str.replace(',', '').str.replace(' ', '')
    df_train['mileage'] = pd.to_numeric(df_train['mileage'], errors='coerce')
    df_train = df_train.dropna(subset=['mileage'])

# Kiểm tra và xử lý infinity
print(f"\n   Kiểm tra infinity và giá trị bất thường...")
for col in feature_cols + [target_col]:
    if df_train[col].dtype in [np.float64, np.float32, np.int64, np.int32]:
        inf_count = np.isinf(df_train[col]).sum()
        if inf_count > 0:
            print(f"     ⚠️ {col}: {inf_count} giá trị infinity")
            df_train = df_train[~np.isinf(df_train[col])]

print(f"   - Sau khi xử lý: {len(df_train)} dòng")

# 3. Feature Engineering
print(f"\n2️⃣ FEATURE ENGINEERING:")

label_encoders = {}
X_encoded = pd.DataFrame()

for col in feature_cols:
    if df_train[col].dtype == 'object' or df_train[col].dtype.name == 'category':
        le = LabelEncoder()
        X_encoded[col] = le.fit_transform(df_train[col].astype(str))
        label_encoders[col] = le
        print(f"   - {col}: Label encoded ({df_train[col].nunique()} categories)")
    else:
        X_encoded[col] = df_train[col]
        print(f"   - {col}: Giữ nguyên (numerical)")

y = df_train[target_col].values

# Kiểm tra lại NaN/infinity sau khi encode
print(f"\n   Kiểm tra NaN/infinity sau khi encode...")
if X_encoded.isnull().sum().sum() > 0:
    print(f"     ⚠️ Có NaN trong X_encoded")
    X_encoded = X_encoded.fillna(X_encoded.median())

if np.isinf(X_encoded.values).sum() > 0:
    print(f"     ⚠️ Có infinity trong X_encoded")
    X_encoded = X_encoded.replace([np.inf, -np.inf], np.nan)
    X_encoded = X_encoded.fillna(X_encoded.median())

if np.isnan(y).sum() > 0:
    print(f"     ⚠️ Có NaN trong y")
    mask = ~np.isnan(y)
    X_encoded = X_encoded[mask]
    y = y[mask]

if np.isinf(y).sum() > 0:
    print(f"     ⚠️ Có infinity trong y")
    mask = ~np.isinf(y)
    X_encoded = X_encoded[mask]
    y = y[mask]

print(f"   - Sau khi xử lý: {len(X_encoded)} dòng")

# 4. Chia train/test
print(f"\n3️⃣ CHIA TRAIN/TEST:")
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y, test_size=0.2, random_state=42
)

print(f"   - Train: {len(X_train)} dòng")
print(f"   - Test: {len(X_test)} dòng")

# Reset index để tránh lỗi
X_train = X_train.reset_index(drop=True)
X_test = X_test.reset_index(drop=True)

# 5. Train nhiều model
print(f"\n4️⃣ TRAIN NHIỀU MODEL:")

models = {
    'Linear Regression': LinearRegression(),
    'Ridge Regression': Ridge(alpha=1.0),
    'Lasso Regression': Lasso(alpha=1.0),
    'Random Forest': RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
}

if XGBOOST_AVAILABLE:
    models['XGBoost'] = xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1)

results = {}

for name, model in models.items():
    print(f"\n   🔹 Training {name}...")
    try:
        model.fit(X_train, y_train)
        
        y_pred_train = model.predict(X_train)
        y_pred_test = model.predict(X_test)
        
        train_mae = mean_absolute_error(y_train, y_pred_train)
        test_mae = mean_absolute_error(y_test, y_pred_test)
        train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
        test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
        train_r2 = r2_score(y_train, y_pred_train)
        test_r2 = r2_score(y_test, y_pred_test)
        
        results[name] = {
            'model': model,
            'train_mae': train_mae,
            'test_mae': test_mae,
            'train_rmse': train_rmse,
            'test_rmse': test_rmse,
            'train_r2': train_r2,
            'test_r2': test_r2
        }
        
        print(f"      ✅ Hoàn thành")
        print(f"         Train MAE: {train_mae:.0f} triệu")
        print(f"         Test MAE: {test_mae:.0f} triệu")
        print(f"         Test R²: {test_r2:.3f}")
        
    except Exception as e:
        print(f"      ❌ Lỗi: {str(e)[:100]}")

# 6. So sánh kết quả
print(f"\n5️⃣ SO SÁNH KẾT QUẢ:")

comparison_df = pd.DataFrame({
    'Model': list(results.keys()),
    'Train MAE': [results[m]['train_mae'] for m in results.keys()],
    'Test MAE': [results[m]['test_mae'] for m in results.keys()],
    'Train RMSE': [results[m]['train_rmse'] for m in results.keys()],
    'Test RMSE': [results[m]['test_rmse'] for m in results.keys()],
    'Train R²': [results[m]['train_r2'] for m in results.keys()],
    'Test R²': [results[m]['test_r2'] for m in results.keys()]
})

comparison_df = comparison_df.sort_values('Test MAE')

print("\n   📊 Bảng so sánh:")
print(comparison_df.to_string(index=False))

# 7. Chọn model tốt nhất (dựa trên Test MAE thấp nhất)
print(f"\n6️⃣ MODEL TỐT NHẤT:")
best_model_name = comparison_df.iloc[0]['Model']
best_model = results[best_model_name]['model']

print(f"   ✅ {best_model_name}")
print(f"   - Test MAE: {results[best_model_name]['test_mae']:.0f} triệu VND")
print(f"   - Test RMSE: {results[best_model_name]['test_rmse']:.0f} triệu VND")
print(f"   - Test R²: {results[best_model_name]['test_r2']:.3f}")

# Feature importance (nếu có)
if hasattr(best_model, 'feature_importances_'):
    print(f"\n   📊 Feature Importance:")
    feature_importance = pd.DataFrame({
        'Feature': feature_cols,
        'Importance': best_model.feature_importances_
    }).sort_values('Importance', ascending=False)
    print(feature_importance.to_string(index=False))

# 8. Lưu model tốt nhất và encoders
print(f"\n7️⃣ LƯU MODEL TỐT NHẤT VÀ ENCODERS:")

MODELS_DIR.mkdir(exist_ok=True)

model_file = MODELS_DIR / "car_price_predictor.pkl"
encoders_file = MODELS_DIR / "label_encoders.pkl"
features_file = MODELS_DIR / "feature_columns.pkl"

# Xóa file cũ nếu tồn tại
if model_file.exists():
    model_file.unlink()
    print(f"   ✅ Đã xóa file model cũ")

# Lưu model tốt nhất
joblib.dump(best_model, model_file)
print(f"   ✅ Model saved: {model_file}")
print(f"   - Model name: {best_model_name}")
print(f"   - Model type: {type(best_model)}")
print(f"   - Absolute path: {model_file.resolve()}")
print(f"   - Has predict: {hasattr(best_model, 'predict')}")

if encoders_file.exists():
    encoders_file.unlink()
joblib.dump(label_encoders, encoders_file)
print(f"   ✅ Encoders saved: {encoders_file}")

if features_file.exists():
    features_file.unlink()
joblib.dump(feature_cols, features_file)
print(f"   ✅ Features saved: {features_file}")

# Lưu metrics của model tốt nhất
metrics_file = MODELS_DIR / "model_metrics.pkl"
metrics = {
    'test_mae': results[best_model_name]['test_mae'],
    'test_r2': results[best_model_name]['test_r2']
}
if metrics_file.exists():
    metrics_file.unlink()
joblib.dump(metrics, metrics_file)
print(f"   ✅ Metrics saved: {metrics_file}")
print(f"   - Test MAE: {metrics['test_mae']:.0f} triệu")
print(f"   - Test R²: {metrics['test_r2']:.3f}")

# 9. Verify model sau khi lưu
print(f"\n8️⃣ VERIFY MODEL SAU KHI LƯU:")
try:
    loaded_model = joblib.load(model_file)
    print(f"   ✅ Model loaded successfully")
    print(f"   - Type: {type(loaded_model)}")
    print(f"   - Has predict: {hasattr(loaded_model, 'predict')}")
    
    # Test predict
    dummy = np.array([[0, 0, 2020, 0, 0, 50000]])
    result = loaded_model.predict(dummy)
    print(f"   ✅ Predict works! Result: {result[0]:.0f} triệu")
    
except Exception as e:
    print(f"   ❌ Verification failed: {e}")
    import traceback
    traceback.print_exc()
    raise

print(f"\n✅ Hoàn thành! Model tốt nhất ({best_model_name}) đã được lưu")
print(f"   📌 QUAN TRỌNG: Hãy restart FastAPI service để load model mới!")
print(f"   📁 File được lưu tại: {model_file.resolve()}")