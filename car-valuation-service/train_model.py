from pathlib import Path
from typing import List

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def load_dataset(base_dir: Path) -> pd.DataFrame:
    data_path = base_dir / "data" / "car_listings_clean.csv"
    return pd.read_csv(data_path)


def build_model_pipeline(categorical_features: List[str], numeric_features: List[str]) -> Pipeline:
    categorical_transformer = OneHotEncoder(handle_unknown="ignore")

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", categorical_transformer, categorical_features),
            ("num", "passthrough", numeric_features),
        ]
    )

    # Có thể đổi qua RandomForest nếu muốn, ở đây dùng Ridge cho đơn giản + nhanh
    model = Ridge(alpha=1.0)

    pipeline = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )

    return pipeline


def train_and_evaluate(df: pd.DataFrame, base_dir: Path) -> None:
    target_col = "price_vnd"
    feature_cols = [
        "brand",
        "model",
        "year",
        "mileage_km",
        "transmission",
        "location",
    ]

    df = df.dropna(subset=[target_col])
    df = df.dropna(subset=[c for c in feature_cols if c in df.columns])

    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    categorical_features = ["brand", "model", "transmission", "location"]
    numeric_features = ["year", "mileage_km"]

    pipeline = build_model_pipeline(
        categorical_features=categorical_features,
        numeric_features=numeric_features,
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"MAE: {mae:,.0f} VND")

    model_dir = base_dir / "model"
    model_dir.mkdir(exist_ok=True)
    model_path = model_dir / "car_price_model.pkl"
    joblib.dump(pipeline, model_path)
    print(f"Saved model to {model_path}")


def main() -> None:
    base_dir = Path(__file__).resolve().parent
    df = load_dataset(base_dir)
    train_and_evaluate(df, base_dir)


if __name__ == "__main__":
    main()


