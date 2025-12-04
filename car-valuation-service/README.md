## Car Valuation Service

Service định giá xe cũ cho thị trường Việt Nam, sử dụng dữ liệu scrape từ `bonbanh.com` (tuân thủ robots.txt) và mô hình machine learning đơn giản.

### Cấu trúc dữ liệu

File dữ liệu chuẩn để train mô hình: `data/car_listings.csv` với các cột:

- `brand` – Hãng xe (Toyota, VinFast, Honda, Hyundai, Kia, Mazda, Suzuki, BMW, Ford, Mercedes-Benz)
- `model` – Dòng xe (Vios, City, Fadil, v.v.)
- `year` – Năm sản xuất (VD: 2015)
- `mileage_km` – Số km đã đi (VD: 50000)
- `transmission` – Hộp số (`AT` hoặc `MT`, hoặc giá trị khác nếu parse được)
- `fuel` – Loại nhiên liệu (`xang`, `dau`, `hybrid`, … nếu parse được)
- `location` – Tỉnh/thành hoặc vùng
- `price_vnd` – Giá rao bán (đơn vị VND, dạng số nguyên)

### Thư mục chính

- `data/` – Chứa các file CSV:
  - `raw_bonbanh.csv` – Dữ liệu thô sau khi scrape.
  - `car_listings_raw.csv` – Dữ liệu đã chuẩn hoá sơ bộ.
  - `car_listings_clean.csv` – Dữ liệu sạch dùng để train.
  - `car_listings.csv` – Alias hoặc bản cuối cùng dùng cho training.
- `scraping/` – Script scrape dữ liệu từ bonbanh.com.
- `notebooks/` – Notebook/EDA (tuỳ chọn).
- `model/` – Mô hình đã train (`car_price_model.pkl`) và pipeline.
- `service/` – API service (FastAPI/Flask) để phục vụ dự đoán.


