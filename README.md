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