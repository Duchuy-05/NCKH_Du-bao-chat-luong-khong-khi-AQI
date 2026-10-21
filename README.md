# AirVision

AirVision là ứng dụng dự báo chất lượng không khí tại 5 thành phố Việt Nam. Frontend hiển thị AQI hiện tại, dự báo 7 ngày và 24 giờ, biểu đồ AQI, cùng khuyến cáo sức khỏe. Dự báo dùng các mô hình SVR riêng theo thành phố và theo chu kỳ.

## Công nghệ

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts.
- **API và machine learning:** FastAPI, scikit-learn, SVR.
- **Dữ liệu:** PostgreSQL; dữ liệu thời tiết và AQI được lấy/xử lý qua Open-Meteo.
- **Thành phố:** Hà Nội, Hải Phòng, Đà Nẵng, TP. Hồ Chí Minh và Cần Thơ.

## Chạy bằng Docker Compose

Cần cài Docker Desktop hoặc Docker Engine kèm Docker Compose. Từ thư mục gốc:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Compose khởi chạy PostgreSQL, chạy migration Alembic rồi khởi chạy FastAPI và frontend. Sau khi các container sẵn sàng:

- Frontend: <http://localhost:5173>
- FastAPI Swagger: <http://localhost:3000/docs>
- API health: <http://localhost:3000/health>
- PostgreSQL: `localhost:5432`

Database mới cần nạp lịch sử và huấn luyện mô hình lần đầu. Chạy các lệnh sau từ thư mục gốc sau khi backend đã sẵn sàng:

```powershell
docker compose exec backend python -m app.data.ingest_open_meteo
docker compose exec backend python -m app.training.SVR.train_all_cities
```

Lệnh nạp dữ liệu mặc định lấy lịch sử từ `2022-10-01` đến hôm qua. Huấn luyện chạy 10 lượt: daily và hourly cho từng thành phố. Có thể mất thời gian đáng kể. Dữ liệu PostgreSQL được giữ trong volume `pgdata`; model được giữ trong `backend/models`.

Để dừng các service:

```powershell
docker compose down
```

`docker compose down -v` cũng xóa volume PostgreSQL, vì vậy sẽ xóa dữ liệu database.

## Chạy frontend và backend riêng

### Backend

Cần Python 3.10+ và PostgreSQL. Tạo `backend/.env` từ mẫu rồi sửa `DATABASE_URL` để trỏ tới PostgreSQL:

```powershell
Copy-Item backend/.env.example backend/.env
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m app.data.ingest_open_meteo
python -m app.training.SVR.train_all_cities
uvicorn app.main:app --reload --port 3000
```

### Frontend

Cần Node.js 18+. Mở terminal thứ hai từ thư mục gốc:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm ci
npm run dev
```

Frontend mặc định gọi `http://localhost:3000/api`. Có thể thay đổi URL trong `frontend/.env` bằng `VITE_API_BASE_URL`.

## Thành phố và mô hình

Mỗi thành phố có model SVR daily (7 ngày) và hourly (24 mốc giờ). Để huấn luyện lại toàn bộ mô hình, chạy từ `backend/`:

```powershell
python -m app.training.SVR.train_all_cities
```

Có thể chỉ định thành phố hoặc chu kỳ, ví dụ `--city hanoi --city danang` hoặc `--target daily`. Xem [hướng dẫn dữ liệu và huấn luyện](backend/Guide-training-SVR.md) để biết thêm về ingestion, migration và pipeline SVR.

## Cấu trúc chính

```text
backend/       FastAPI, migrations, ingestion, training và dự báo
frontend/      React/Vite application
docker-compose.yml
```
