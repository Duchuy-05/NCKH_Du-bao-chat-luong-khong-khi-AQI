```text
NCKH-2/
├── backend/
│   ├── app/            # FastAPI, PostgreSQL ingestion, feature engineering, SVR train/predict
│   ├── migrations/     # Alembic schema migrations
│   ├── data/            # Generated feature/data files (local runtime)
│   ├── models/          # Per-city daily/hourly SVR artifacts (local runtime)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/             # React, TypeScript, Vite UI
│   ├── Dockerfile       # Vite build served by Nginx
│   └── package.json
├── docker-compose.yml   # PostgreSQL, FastAPI, and frontend
└── .env.example         # Docker Compose development settings
```

---

# Hướng dẫn chi tiết backend và huấn luyện mô hình SVR

Dịch vụ `backend` cung cấp 2 luồng dự báo chất lượng không khí (AQI) bằng thuật toán **Support Vector Regression (SVR)**:
- **Luồng A (Daily Forecast)**: Dự báo chỉ số AQI cho **7 ngày tới** (1 điểm/ngày).
- **Luồng B (Hourly / Short-term Forecast)**: Dự báo chỉ số AQI cho **24 giờ tới**, với một điểm dự báo cho mỗi giờ ($t+1\text{h}$ đến $t+24\text{h}$).

---

## 1. Cài đặt môi trường

Chuyển vào thư mục `backend`, tạo môi trường ảo Python và cài đặt các thư viện cần thiết:

```bash
cd backend

# Tạo virtual environment (Python >= 3.10)
python -m venv .venv

# Kích hoạt môi trường ảo:
# Trên Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Cài đặt toàn bộ thư viện
pip install -r requirements.txt
# Cập nhật lại toàn bộ thư viện
python.exe -m pip install --upgrade pip
```

---

## 2. Cấu hình biến môi trường kết nối Database (.env)

Tạo hoặc cập nhật tệp `.env` bên trong thư mục `backend/`:

```env
DB_HOST=""
DB_PORT=""
DB_NAME=""
DB_USER=""
DB_PASSWORD=""

CITY=hanoi
```

---

## 3. Quy trình chuẩn bị dữ liệu và Huấn luyện mô hình SVR

Toàn bộ quy trình từ kiểm tra kết nối, làm sạch dữ liệu, tạo đặc trưng đến huấn luyện mô hình được thực hiện tuần tự qua các lệnh module sau:

### Bước 1: Tạo/cập nhật schema
Chạy migration từ thư mục `backend` để tạo catalog thành phố, các bảng dữ liệu giờ, AQI giờ và AQI ngày:

```bash
python -m alembic upgrade head
```

### Bước 2: Lấy dữ liệu, làm sạch, tính AQI rồi ghi database
Module ingest lấy dữ liệu hourly cho năm thành phố, làm sạch trước khi insert, tính VN_AQI giờ/ngày rồi upsert trực tiếp vào PostgreSQL:

```bash
python -m app.data.ingest_open_meteo
```

Mặc định lấy từ `2022-10-01` đến hôm qua. Có thể giới hạn khoảng ngày hoặc thành phố:

```bash
python -m app.data.ingest_open_meteo --start-date 2024-01-01 --end-date 2026-10-20
python -m app.data.ingest_open_meteo --city hanoi --city danang
```

`air_quality_observations.aqi` lưu AQI giờ. `aqi_daily_observations.aqi` lưu AQI ngày cùng dữ liệu thời tiết tổng hợp. Các slot bị thiếu vẫn được ghi với giá trị null để phép dịch lags giữ đúng bước thời gian.

### Bước 3: Huấn luyện từ dữ liệu đã lưu
Không chạy bước build Parquet. Huấn luyện và dự báo đọc AQI cùng thời tiết đã xử lý từ PostgreSQL; mỗi thành phố có model riêng:

```bash
python -m app.training.SVR.train_all_cities
```

Lệnh trên huấn luyện lần lượt cả daily và hourly cho năm thành phố được hỗ trợ (10 lượt). Script tiếp tục các lượt còn lại nếu một lượt lỗi và trả mã thoát `1` nếu có lỗi. Có thể giới hạn thành phố hoặc chu kỳ:

```bash
python -m app.training.SVR.train_all_cities --city hanoi --city danang
python -m app.training.SVR.train_all_cities --target daily
```

API train nhận `POST /admin/train?target=all&city=danang`. API dự báo nhận `city`, ví dụ `/api/air-quality/predict/hourly?algo=svr&city=danang`.
### Bước 4: Huấn luyện mô hình SVR (Support Vector Regression)
Pipeline huấn luyện sử dụng:
- **`StandardScaler`**: Chuẩn hóa độc lập dữ liệu đầu vào và đầu ra thông qua `TransformedTargetRegressor` để tránh rò rỉ dữ liệu (data leakage).
- **Bảy pipeline SVR một đầu ra**: mỗi model `d_1` ... `d_7` phụ trách một horizon, cho phép mỗi ngày dùng tập dữ liệu được lọc riêng.
- **`TimeSeriesSplit(n_splits=5)`**: Cross-validation bảo toàn thứ tự thời gian.
- **`GridSearchCV`**: Tối ưu hóa siêu tham số ($C, \epsilon, \gamma$).

Daily training không dùng toàn bộ lịch sử một cách mặc định. Với ngày dữ liệu cuối cùng `D`, mỗi horizon sử dụng:

- Cửa sổ lịch `[D-29, D]` và cửa sổ cùng ngày-tháng của từng năm lịch sử.
- Toàn bộ ba tháng thuộc mùa của ngày target (`Xuân` 2-4, `Hạ` 5-7, `Thu` 8-10, `Đông` 11-1) để không làm tập mẫu bị rỗng khi cửa sổ 30 ngày nằm ở ranh giới mùa.
- Chỉ các mẫu có `season(t+h)` trùng với mùa của ngày dự báo `D+h`.
- Không thay thế ngày thiếu bằng ngày gần nhất và không fallback âm thầm sang mùa khác hoặc toàn bộ lịch sử.

Mỗi lần huấn luyện daily thành công tạo một artifact có ngày và mã lượt chạy trong `models/`. Artifact lưu bảy horizon cùng số mẫu, mùa, khoảng thời gian, tham số tốt nhất và metric MAE/RMSE. Bộ dự báo chọn artifact phù hợp mới nhất của thành phố.

Thực hiện huấn luyện cho cả 2 luồng:

```bash
# Huấn luyện daily và hourly cho tất cả thành phố hỗ trợ
python -m app.training.SVR.train_all_cities

# Hoặc huấn luyện riêng một thành phố/chu kỳ
python -m app.training.SVR.train_svr_daily
python -m app.training.SVR.train_svr_hourly
```

Artifact được lưu theo thành phố, chu kỳ và ngày huấn luyện trong thư mục `models/`.

---

## 4. Khởi chạy FastAPI Service & Kiểm tra API

Sau khi các file model `.joblib` đã được lưu trong thư mục `models/`, khởi động API server:

```bash
uvicorn app.main:app --reload --port 3000
```

### Các Endpoint chính:
1. **Kiểm tra trạng thái Service**:
   - `GET http://localhost:3000/health`
2. **Dự báo AQI 7 ngày tới (Luồng A)**:
   - `GET http://localhost:3000/forecast/daily?algo=svr`
3. **Dự báo AQI 24 mốc 1h tới (Luồng B)**:
   - `GET http://localhost:3000/forecast/hourly?algo=svr`
4. **Tài liệu Swagger UI tương tác**:
   - `http://localhost:3000/docs`

---

## 5. Chạy toàn bộ hệ thống bằng Docker Compose

Để chạy PostgreSQL, FastAPI backend và frontend React:

```bash
docker compose up --build
```
