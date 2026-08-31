```
NCKH/
├── ml-service/                         
│   ├── app/
│   │   ├── main.py                     # FastAPI server và API routes (/forecast/daily, /forecast/hourly)
│   │   ├── core/
│   │   │   ├── config.py               # Quản lý đường dẫn data/model và nạp biến môi trường .env
│   │   │   └── db.py                   # Kết nối PostgreSQL nạp dữ liệu nồng độ & thời tiết
│   │   ├── data/
│   │   │   ├── cities.py               # Danh mục tọa độ và metadata các thành phố lớn
│   │   │   ├── aqi.py                  # Công thức tính AQI theo chuẩn QCVN 05 (rolling 24h và 8h)
│   │   │   ├── quality.py              # Xử lý khuyết thiếu (nội suy <= 3h) & lọc outlier IQR theo tháng
│   │   │   ├── build_dataset.py        # Join bảng, drop CO2 và xuất clean_3h.parquet / clean_daily.parquet
│   │   │   ├── cache.py                # Quản lý cache Parquet theo từng năm
│   │   │   ├── ingest.py               # Module thu thập và chuẩn hóa dữ liệu
│   │   │   
│   │   │       
│   │   ├── features/
│   │   │   ├── daily_features.py       # Trích xuất đặc trưng Luồng A (7 ngày: lag, rolling, lịch, gió mùa)
│   │   │   └── hourly_features.py      # Trích xuất đặc trưng Luồng B (24h/bước 3h: lag steps, rolling, ngày/đêm)
│   │   ├── models/
│   │   │   └── schema.py               # Pydantic schemas cho Daily & Hourly Forecast
│   │   ├── services/
│   │   │   ├── daily_predictor.py      # Service nạp svr_daily.joblib & sinh dự báo 7 ngày tới
│   │   │   └── hourly_predictor.py     # Service nạp svr_hourly.joblib & sinh dự báo 24h bước 3h
│   │   └── training/
│   │       ├── train_svr_daily.py      # Pipeline huấn luyện SVR Luồng A (TimeSeriesSplit + GridSearchCV)
│   │       └── train_svr_hourly.py     # Pipeline huấn luyện SVR Luồng B (TimeSeriesSplit + GridSearchCV)
│   ├── data/                           # Nơi chứa các file dữ liệu trung gian & Parquet sạch
│   ├── models/                         # Nơi lưu trữ các model đã train (.joblib)
│   ├── requirements.txt                # Danh sách thư viện Python
│   └── .env                            # Thông tin cấu hình DB PostgreSQL
│
└── docker-compose.yml                  # Chạy đồng thời 3 service
```

---

# Hướng dẫn chi tiết ML-Service & Huấn luyện mô hình SVR

Dịch vụ `ml-service` cung cấp 2 luồng dự báo chất lượng không khí (AQI) bằng thuật toán **Support Vector Regression (SVR)**:
- **Luồng A (Daily Forecast)**: Dự báo chỉ số AQI cho **7 ngày tới** (1 điểm/ngày).
- **Luồng B (Hourly / Short-term Forecast)**: Dự báo chỉ số AQI cho **24 giờ tới** với bước nhảy **3 giờ** ($t+3\text{h}, t+6\text{h}, \dots, t+24\text{h}$, gồm 8 bước).

---

## 1. Cài đặt môi trường

Chuyển vào thư mục `ml-service`, tạo môi trường ảo Python và cài đặt các thư viện cần thiết:

```bash
cd ml-service

# Tạo virtual environment (Python >= 3.10)
python -m venv .venv

# Kích hoạt môi trường ảo:
# Trên Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Cài đặt toàn bộ thư viện
pip install -r requirements.txt
```

---

## 2. Cấu hình biến môi trường kết nối Database (.env)

Tạo hoặc cập nhật tệp `.env` bên trong thư mục `ml-service/`:

```env
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""

# Tên bảng thực tế trong PostgreSQL (pgAdmin)
TABLE_POLLUTANTS=hanoi_pollutants
TABLE_WEATHER=hanoi_weather
```

---

## 3. Quy trình chuẩn bị dữ liệu và Huấn luyện mô hình SVR

Toàn bộ quy trình từ kiểm tra kết nối, làm sạch dữ liệu, tạo đặc trưng đến huấn luyện mô hình được thực hiện tuần tự qua các lệnh module sau:

### Bước 1: Kiểm tra kết nối cơ sở dữ liệu
Kiểm tra kết nối tới PostgreSQL và nạp thử 3 dòng đầu của 2 bảng `hanoi_pollutants` và `hanoi_weather`:
```bash
python -m app.data.loaders.db_loader
```

### Bước 2: Ghép nối, làm sạch dữ liệu & Tính AQI chuẩn QCVN
Tệp `build_dataset.py` sẽ tự động:
1. Đọc và ghép nối bảng ô nhiễm và thời tiết theo trục thời gian `time`.
2. Lọc bỏ các cột ID trùng lặp, loại bỏ giá trị âm bất thường và lọc ngoại lai bằng IQR theo tháng.
3. Nội suy tuyến tính cho các khoảng trống $\le 6\text{h}$ và đánh cờ `missing_flag` cho khoảng trống lớn hơn.
4. Tính AQI theo quy chuẩn QCVN 05:2023/BTNMT (trung bình trượt 24h cho PM2.5, PM10, SO2, NO2 và 8h cho O3, CO).
5. Xuất ra 2 tệp dữ liệu sạch: `data/clean_3h.parquet` (bước 3h) và `data/clean_daily.parquet` (trung bình ngày).

```bash
python -m app.data.build_dataset
```

### Bước 3: Tạo bảng đặc trưng (Feature Engineering)
Trích xuất các đặc trưng chu kỳ thời gian (sin/cos ngày, tháng, thứ, giờ, ngày/đêm, cờ gió mùa Đông Bắc), các biến trễ (lags), lag mùa vụ (1 năm, 2 năm $\pm 3$ ngày), thống kê trượt (rolling mean, std, min, max) và vi khí hậu (chênh lệch nhiệt độ - điểm sương $T - T_{\text{dew}}$):

```bash
# Xây dựng đặc trưng cho Luồng A (Daily - 7 ngày)
python -m app.features.daily_features

# Xây dựng đặc trưng cho Luồng B (Hourly - 24h bước 3h)
python -m app.features.hourly_features
```

### Bước 4: Huấn luyện mô hình SVR (Support Vector Regression)
Pipeline huấn luyện sử dụng:
- **`StandardScaler`**: Chuẩn hóa độc lập dữ liệu đầu vào và đầu ra thông qua `TransformedTargetRegressor` để tránh rò rỉ dữ liệu (data leakage).
- **`MultiOutputRegressor(SVR(kernel='rbf'))`**: Dự báo đa bước cho chuỗi thời gian.
- **`TimeSeriesSplit(n_splits=5)`**: Cross-validation bảo toàn thứ tự thời gian.
- **`GridSearchCV`**: Tối ưu hóa siêu tham số ($C, \epsilon, \gamma$).

Thực hiện huấn luyện cho cả 2 luồng:

```bash
# 1. Train mô hình SVR 7 ngày tới -> Lưu vào models/svr_daily.joblib
python -m app.training.train_svr_daily

# 2. Train mô hình SVR 24h bước 3h -> Lưu vào models/svr_hourly.joblib
python -m app.training.train_svr_hourly (chưa xong)
```

---

## 4. Khởi chạy FastAPI Service & Kiểm tra API

Sau khi các file model `.joblib` đã được lưu trong thư mục `models/`, khởi động API server:

```bash
uvicorn app.main:app --reload --port 8000
```

### Các Endpoint chính:
1. **Kiểm tra trạng thái Service**:
   - `GET http://localhost:8000/health`
2. **Dự báo AQI 7 ngày tới (Luồng A)**:
   - `GET http://localhost:8000/forecast/daily?algo=svr`
3. **Dự báo AQI 24h tới bước 3h (Luồng B)**:
   - `GET http://localhost:8000/forecast/hourly?algo=svr`
4. **Tài liệu Swagger UI tương tác**:
   - `http://localhost:8000/docs`

---

## 5. Chạy toàn bộ hệ thống bằng Docker Compose

Để chạy đồng thời cả Frontend, Backend và ML-Service:

```bash
docker compose up --build
```