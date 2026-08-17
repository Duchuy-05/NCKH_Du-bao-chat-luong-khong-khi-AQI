```
NCKH/
├── frontend/                     
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── data/
│       ├── layouts/
│       ├── pages/
│       ├── services/
│       │   └── apiClient/
│       │       └── airquality.api.ts   # gọi sang BE (KHÔNG gọi thẳng ML service)
│       ├── styles/
│       └── utils/
│
├── backend/                     
│   └── src/
│       ├── config/
│       │   ├── database.config.ts
│       │   ├── env.config.ts
│       │   ├── cloudinary.config.ts
│       │   ├── redis.config.ts
│       │   └── mlService.config.ts     # base URL + timeout của ML service
│       ├── controllers/
│       │   └── airQuality.controller.ts  # nhận request, gọi service
│       ├── middlewares/
│       ├── models/
│       │   └── entities/
│       │       └── AirQualityPrediction.entity.ts  # lưu lịch sử dự đoán
│       ├── routers/
│       │   └── airQuality.router.ts     # POST /api/air-quality/predict
│       ├── services/
│       │   └── mlClient.service.ts      # hàm gọi HTTP sang FastAPI
│       └── utils/
│
├── ml-service/                    # service Python độc lập
│   ├── app/
│   │   ├── main.py                # khởi tạo FastAPI app
│   │   ├── api/
│   │   │   └── predict.py         # route POST /predict
│   │   ├── core/
│   │   │   └── config.py          # đọc biến môi trường
│   │   ├── models/
│   │   │   └── schema.py          # Pydantic request/response schema
│   │   ├── services/
│   │   │   └── predictor.py       # load model, xử lý predict
│   │   └── ml/
│   │       └── air_quality_model.pkl   # model đã train (scikit-learn/joblib)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
└── docker-compose.yml             # chạy đồng thời 3 service
```

## Yêu cầu môi trường

- Node.js >= 18
- Python >= 3.10 (nếu chạy ml-service)
- Docker & Docker Compose (nếu muốn chạy cả 3 service cùng lúc)

## Cách chạy (Frontend)

```bash
git clone https://github.com/Duchuy-05/NCKH_Du-bao-chat-luong-khong-khi-AQI.git
cd NCKH_Du-bao-chat-luong-khong-khi-AQI/frontend
npm i
npm run dev
```

Mặc định app chạy tại `http://localhost:5173`.

## Cách chạy (Backend)

```bash
cd backend
npm i
npm start
```

Tạo file `.env` trong `backend/` dựa theo biến trong `src/config/env.config.ts` (DB, Redis, Cloudinary, ML_SERVICE_URL...) trước khi chạy.

## Cách chạy (ML Service)

```bash
cd ml-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Chạy toàn bộ bằng Docker Compose

```bash
docker compose up --build
```