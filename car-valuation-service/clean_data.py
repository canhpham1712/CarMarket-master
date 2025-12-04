from pathlib import Path
from typing import List

import pandas as pd


TARGET_BRANDS = [
    "Toyota",
    "VinFast",
    "Honda",
    "Hyundai",
    "Kia",
    "Mazda",
    "Suzuki",
    "BMW",
    "Ford",
    "Mercedes-Benz",
]


def normalize_brand(brand: str) -> str:
    if not isinstance(brand, str):
        return ""
    b = brand.strip()
    # TODO: có thể bổ sung mapping alias, ví dụ "Mec", "Mercedes" -> "Mercedes-Benz"
    return b


def normalize_model(model: str) -> str:
    if not isinstance(model, str):
        return ""
    m = model.strip()
    # TODO: thêm mapping alias model nếu cần (Lux SA2.0 -> Lux SA 2.0, ...)
    return m


def load_raw_dataframe(base_dir: Path) -> pd.DataFrame:
    raw_path = base_dir / "data" / "raw_bonbanh.csv"
    df = pd.read_csv(raw_path)
    return df


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    # Chuẩn hoá brand/model
    df["brand"] = df.get("brand", "").apply(normalize_brand)
    df["model"] = df.get("model", "").apply(normalize_model)

    # Lọc 10 hãng mục tiêu
    df = df[df["brand"].isin(TARGET_BRANDS)]

    # Bỏ bản ghi thiếu giá hoặc thiếu năm
    df = df.dropna(subset=["price_vnd", "year"])

    # Chuyển kiểu dữ liệu phù hợp
    df["price_vnd"] = pd.to_numeric(df["price_vnd"], errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["mileage_km"] = pd.to_numeric(df.get("mileage_km"), errors="coerce")

    # Loại bỏ outlier giá quá bất thường
    df = df[(df["price_vnd"] >= 5_000_000) & (df["price_vnd"] <= 5_000_000_000)]

    # Loại bỏ mileage quá bất thường (nếu có)
    if "mileage_km" in df.columns:
        df = df[(df["mileage_km"].isna()) | (df["mileage_km"] <= 500_000)]

    # Chọn các cột cần thiết
    keep_cols: List[str] = [
        "brand",
        "model",
        "year",
        "mileage_km",
        "transmission",
        "fuel",
        "location",
        "price_vnd",
    ]
    df = df[[c for c in keep_cols if c in df.columns]]

    return df


def export_metadata(df_clean: pd.DataFrame, base_dir: Path) -> None:
    """
    Sinh ra các file metadata phục vụ dropdown:
    - brand_model.csv
    - brand_model_year.csv
    """
    metadata_dir = base_dir / "metadata"
    metadata_dir.mkdir(exist_ok=True)

    # Danh sách brand-model phổ biến với số lượng bản ghi
    brand_model = (
        df_clean.groupby(["brand", "model"])["price_vnd"]
        .count()
        .reset_index(name="listing_count")
    )
    brand_model_out = metadata_dir / "brand_model.csv"
    brand_model.to_csv(brand_model_out, index=False)

    # Danh sách brand-model-year với số lượng bản ghi
    if "year" in df_clean.columns:
        brand_model_year = (
            df_clean.groupby(["brand", "model", "year"])["price_vnd"]
            .count()
            .reset_index(name="listing_count")
        )
        brand_model_year_out = metadata_dir / "brand_model_year.csv"
        brand_model_year.to_csv(brand_model_year_out, index=False)


def main() -> None:
    base_dir = Path(__file__).resolve().parent

    df_raw = load_raw_dataframe(base_dir)
    raw_out = base_dir / "data" / "car_listings_raw.csv"
    df_raw.to_csv(raw_out, index=False)

    df_clean = clean_dataframe(df_raw)
    clean_out = base_dir / "data" / "car_listings_clean.csv"
    df_clean.to_csv(clean_out, index=False)

    # Alias file chính để train
    final_out = base_dir / "data" / "car_listings.csv"
    df_clean.to_csv(final_out, index=False)

    # Sinh metadata cho dropdown (brand/model/year)
    export_metadata(df_clean, base_dir)


if __name__ == "__main__":
    main()

