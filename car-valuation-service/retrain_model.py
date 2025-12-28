"""
Script tối ưu hóa quy trình huấn luyện model định giá xe (V3 - Windows Optimized).
- Sửa lỗi xung đột luồng CPU (n_jobs).
- Thêm bảo vệ __main__ cho Windows.
- Tự động phát hiện và cảnh báo XGBoost.
- FIX: Bỏ early_stopping_rounds trong GridSearch để tránh lỗi thiếu validation set.
"""

import joblib
import pandas as pd
import numpy as np
import sys
from pathlib import Path
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import warnings

# Tắt warning
warnings.filterwarnings('ignore')

# Cấu hình hiển thị số thực đẹp hơn
pd.options.display.float_format = '{:,.2f}'.format

def main():
    print("🚀 BẮT ĐẦU QUÁ TRÌNH HUẤN LUYỆN (V3 - WINDOWS SAFE - XGB FIX)")
    print("="*70)

    # --- 1. THIẾT LẬP MÔI TRƯỜNG & DATA ---
    BASE_DIR = Path(__file__).resolve().parent
    DATA_DIR = BASE_DIR / "data"
    MODELS_DIR = BASE_DIR / "models"
    MODELS_DIR.mkdir(exist_ok=True)

    # Kiểm tra XGBoost
    try:
        import xgboost as xgb
        XGBOOST_AVAILABLE = True
        print("✅ Đã tìm thấy thư viện XGBoost.")
    except ImportError:
        XGBOOST_AVAILABLE = False
        print("⚠️  CẢNH BÁO: Chưa cài đặt XGBoost!")
        print("👉 Hãy chạy lệnh: pip install xgboost")
        print("   (Hiện tại sẽ bỏ qua XGBoost và chỉ train các model khác)\n")

    # Load dữ liệu
    data_path = DATA_DIR / "toyota_cleaned.csv"
    if not data_path.exists():
        csv_files = list(DATA_DIR.glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError("❌ Không tìm thấy file dữ liệu .csv nào!")
        data_path = max(csv_files, key=lambda p: p.stat().st_mtime)

    print(f"📁 Đang đọc dữ liệu từ: {data_path.name}")
    df = pd.read_csv(data_path)

    # --- 2. SƠ CHẾ DỮ LIỆU ---
    cat_features = ['make', 'model', 'version', 'color'] 
    num_features = ['year', 'mileage']                   
    target_col = 'price_vnd'

    # Clean mileage
    if df['mileage'].dtype == 'object':
        df['mileage'] = df['mileage'].astype(str).str.replace(r'\D', '', regex=True)
        df['mileage'] = pd.to_numeric(df['mileage'], errors='coerce')

    df = df.dropna(subset=[target_col, 'mileage'])

    X = df[cat_features + num_features]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"✅ Dữ liệu sẵn sàng: Train ({len(X_train)}) - Test ({len(X_test)})")

    # --- 3. PIPELINE ---
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='Unknown')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False)) 
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, num_features),
            ('cat', categorical_transformer, cat_features)
        ])

    # --- 4. CẤU HÌNH MODEL ---
    # LƯU Ý QUAN TRỌNG: Để model n_jobs=1 hoặc None để GridSearchCV (n_jobs=-1) quản lý luồng.
    models_config = {
        'Linear Regression': {
            'model': LinearRegression(),
            'params': {}
        },
        'Ridge Regression': {
            'model': Ridge(),
            'params': {'regressor__alpha': [0.1, 1.0, 10.0]}
        },
        'Random Forest': {
            'model': RandomForestRegressor(random_state=42, n_jobs=1), 
            'params': {
                'regressor__n_estimators': [200, 300, 500],
                'regressor__max_depth': [30, 50, None],
                'regressor__min_samples_split': [2, 5]
            }
        }
    }

    if XGBOOST_AVAILABLE:
        models_config['XGBoost'] = {
            'model': xgb.XGBRegressor(random_state=42, n_jobs=1),
            'params': {
                # Đã bỏ early_stopping_rounds để tránh lỗi với Pipeline
                'regressor__n_estimators': [200, 500, 1000], 
                'regressor__learning_rate': [0.01, 0.05, 0.1],
                'regressor__max_depth': [5, 7, 10]
            }
        }

    # --- 5. HUẤN LUYỆN ---
    print("\n🔄 ĐANG HUẤN LUYỆN VÀ TỐI ƯU HÓA (GRID SEARCH)...")
    results = []
    best_overall_model = None
    best_overall_score = float('inf')
    best_overall_name = ""

    for name, config in models_config.items():
        print(f"   🔹 {name}...", end=" ", flush=True)
        
        full_pipeline = Pipeline(steps=[('preprocessor', preprocessor),
                                        ('regressor', config['model'])])
        
        # GridSearchCV sẽ dùng toàn bộ CPU (n_jobs=-1) để chạy song song các fold
        search = GridSearchCV(full_pipeline, config['params'], cv=3, 
                              scoring='neg_mean_absolute_error', n_jobs=-1)
        
        try:
            search.fit(X_train, y_train)
            
            best_estimator = search.best_estimator_
            y_pred = best_estimator.predict(X_test)
            
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            print(f"✅ MAE: {mae:,.0f} | R2: {r2:.4f}")
            
            results.append({
                'Model': name,
                'Test MAE': mae,
                'R2 Score': r2,
                'Best Params': str(search.best_params_)
            })
            
            if mae < best_overall_score:
                best_overall_score = mae
                best_overall_model = best_estimator
                best_overall_name = name
                
        except Exception as e:
            print(f"❌ LỖI: {str(e)}")

    # --- 6. KẾT QUẢ ---
    print("\n📊 BẢNG XẾP HẠNG:")
    if results:
        results_df = pd.DataFrame(results).sort_values(by='Test MAE')
        print(results_df[['Model', 'Test MAE', 'R2 Score']].to_string(index=False))

        print("\n" + "="*70)
        print(f"🏆 MODEL CHIẾN THẮNG: {best_overall_name}")
        print(f"   - Sai số trung bình (MAE): {best_overall_score:,.0f}")
        print(f"   - Độ chính xác (R2): {results_df.iloc[0]['R2 Score']:.4f}")

        # Feature Importance
        if 'Random Forest' in best_overall_name or 'XGBoost' in best_overall_name:
            try:
                print("\n🌟 CÁC YẾU TỐ QUAN TRỌNG NHẤT (FEATURE IMPORTANCE):")
                feature_names = (best_overall_model.named_steps['preprocessor']
                                 .get_feature_names_out())
                importances = best_overall_model.named_steps['regressor'].feature_importances_
                
                feat_imp = pd.DataFrame({'Feature': feature_names, 'Importance': importances})
                feat_imp = feat_imp.sort_values(by='Importance', ascending=False).head(10)
                feat_imp['Feature'] = feat_imp['Feature'].str.replace('cat__', '').str.replace('num__', '')
                print(feat_imp.to_string(index=False))
            except Exception as e:
                pass

        print("="*70)

        # Lưu Model
        save_path = MODELS_DIR / "best_car_price_pipeline.pkl"
        joblib.dump(best_overall_model, save_path)
        print(f"💾 Đã lưu Pipeline tại: {save_path}")

        # Lưu metrics
        metrics_path = MODELS_DIR / "model_metrics.json"
        results_df.iloc[0][['Model', 'Test MAE', 'R2 Score']].to_json(metrics_path)

        print("\n✅ HOÀN TẤT!")
    else:
        print("\n❌ Không có model nào train thành công!")

# Bắt buộc cho Windows khi dùng multiprocessing
if __name__ == '__main__':
    main()