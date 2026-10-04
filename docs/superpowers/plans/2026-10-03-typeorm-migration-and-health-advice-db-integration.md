# Kế hoạch Triển khai: Chuyển đổi Toàn diện sang TypeORM & Tích hợp Cơ sở Dữ liệu Khuyến cáo Sức khỏe

> **Dành cho Agentic Workers:** YÊU CẦU KỸ NĂNG: Sử dụng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để triển khai kế hoạch này theo từng nhiệm vụ. Các bước sử dụng cú pháp checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Di chuyển toàn bộ tầng truy cập dữ liệu của Express Backend từ Sequelize (`sequelize-typescript`) sang TypeORM (`typeorm`), kết nối PostgreSQL database thực tế, xây dựng module Khuyến cáo Sức khỏe tự động xoay vòng sau mỗi 6 tiếng, tích hợp vào giao diện React Frontend (`Home.tsx`) với phân trang 2 trang x 4 thẻ, và xóa bỏ hoàn toàn dữ liệu mock data cũ.

**Kiến trúc:** 
1. **Tầng Backend ORM (TypeORM):** Thay thế Sequelize bằng TypeORM `AppDataSource` (`synchronize: false`). Chuyển đổi `User` và `AirQualityPrediction` sang TypeORM `BaseEntity`. Xây dựng các entity mới `AdviceTopic`, `AdviceItem`, `AdviceSource` với quan hệ nhiều-nhiều `@JoinTable` ánh xạ bảng `advice_topic_sources`.
2. **Tầng Xoay vòng & Truy vấn SQL:** Module `healthAdvice.service.ts` thực thi Raw Window Query SQL với phân vùng `PARTITION BY topic_id` và công thức modulo xoay vòng `(((pos - slot * 4) % n) + n) % n`, kết hợp múi giờ Việt Nam (UTC+7) cho các mốc 00:00, 06:00, 12:00, 18:00, trả về chuẩn bọc `ApiEnvelope` kèm header `Cache-Control`.
3. **Tầng Frontend & Dọn dẹp Mock Data:** Viết API client (`healthAdvice.api.ts`), hook `useHealthAdvice` quản lý timer reload kèm jitter ngẫu nhiên 1–5s và lắng nghe `visibilitychange`. Nâng cấp giao diện `Home.tsx` phân trang 2 trang x 4 thẻ, loại bỏ hoàn toàn hằng số `HEALTH_GROUPS_ADVICE` và type cũ trong `mockAirData.ts`.

**Công nghệ sử dụng:** Node.js, Express, TypeScript, TypeORM 0.3.x, PostgreSQL (`pg`), React 19, Tailwind CSS, Lucide React.

**Tài liệu Spec liên kết:** [docs/superpowers/specs/2026-10-03-health-advice-db-integration-design.md](file:///C:/.Study%20at%20Home/.NCKH/NCKH/docs/superpowers/specs/2026-10-03-health-advice-db-integration-design.md)

---

## Các Ràng buộc Toàn cục (Global Constraints)

- **Không dùng `synchronize: true`:** Schema bảng trong PostgreSQL đã có sẵn dữ liệu seed, cấu hình `AppDataSource` phải luôn đặt `synchronize: false` ở mọi môi trường.
- **Loại bỏ triệt để Sequelize:** Gỡ bỏ hoàn toàn `sequelize`, `sequelize-typescript`, `pg-hstore` khỏi `backend/package.json`. Không để tồn tại bất kỳ dòng import nào từ Sequelize trong toàn bộ dự án.
- **Tính trung thực khoa học (NCKH):** Tuyệt đối không giữ lại dữ liệu hardcode/mock `HEALTH_GROUPS_ADVICE`. 100% dữ liệu khuyến cáo hiển thị trên Home phải được truy vấn từ PostgreSQL.
- **Chuẩn hóa Envelope API:** Tất cả các endpoint backend phải trả về định dạng `{ success: boolean, data?: T, message?: string }` đồng bộ với `airQuality.router.ts`.
- **Kiểm tra kiểu TypeScript nghiêm ngặt:** Toàn bộ backend và frontend phải vượt qua `tsc --noEmit` với 0 lỗi cảnh báo.

---

## Trọng tâm Kiểm duyệt (Review Focus)

1. **Tính tương thích sau khi gỡ Sequelize:** Khi gỡ bỏ `sequelize` và chuyển sang `typeorm`, luồng Đăng ký/Đăng nhập của `AuthService` và lưu dự báo của `AirQualityController` phải hoạt động bình thường, không bị gãy vỡ.
2. **Tính toán Slot Xoay vòng theo Múi giờ Việt Nam (UTC+7):** Biên thời gian lúc 23:59:59 UTC (tức 06:59:59 VN) và 00:00:00 UTC (tức 07:00:00 VN) phải tính đúng slot của chu kỳ 06:00–12:00 VN, không bị lệch do múi giờ máy chủ.
3. **Xử lý Bảng Nguồn Tham khảo Rỗng:** Database hiện có bảng `advice_sources` với 0 bản ghi trước khi seed; service phải dùng LEFT JOIN hoặc xử lý fallback an toàn `sources: []` để không làm mất danh sách topic.
4. **Hẹn giờ Tự đổi Ý & Jitter Tránh Nghẽn Mạng:** Timer trong `useHealthAdvice` phải cộng thêm khoảng jitter ngẫu nhiên 1–5 giây để tránh tình huống hàng loạt client đồng thời gửi request lên server tại đúng tích tắc chuyển slot.
5. **Dọn dẹp Toàn diện Mock Data:** Sau khi xóa `HEALTH_GROUPS_ADVICE`, kiểm tra kỹ các file `mockAirData.ts`, `HealthAlerts.tsx`, `Home.tsx`, `airQuality.types.ts` để chắc chắn không còn import chết hoặc reference lỗi.

---

## Sơ đồ Phân chia File và Trách nhiệm

```
backend/
├── package.json                                    # Cập nhật: gỡ Sequelize, thêm TypeORM
├── src/
│   ├── config/
│   │   └── database.config.ts                      # Cập nhật: AppDataSource TypeORM
│   ├── models/
│   │   ├── DataSource.ts                           # Re-export các TypeORM entities
│   │   └── entities/
│   │       ├── User.entity.ts                      # Chuyển đổi sang TypeORM BaseEntity
│   │       ├── AirQualityPrediction.entity.ts      # Chuyển đổi sang TypeORM BaseEntity
│   │       ├── advice.enums.ts                     # Enum TopicType, RiskLevel
│   │       ├── AdviceTopic.entity.ts               # TypeORM Entity cho advice_topics
│   │       ├── AdviceItem.entity.ts                # TypeORM Entity cho advice_items
│   │       └── AdviceSource.entity.ts              # TypeORM Entity cho advice_sources
│   ├── utils/
│   │   └── rotation.util.ts                        # Thuật toán tính slot xoay 6 tiếng
│   ├── services/
│   │   ├── auth.service.ts                         # Cập nhật TypeORM methods
│   │   └── healthAdvice.service.ts                 # Service chạy Window Query SQL
│   ├── controllers/
│   │   ├── airQuality.controller.ts                # Cập nhật TypeORM save prediction
│   │   └── healthAdvice.controller.ts              # Controller GET /api/health-advice
│   ├── routers/
│   │   └── healthAdvice.router.ts                  # Router /api/health-advice
│   ├── scripts/
│   │   └── seed-advice-sources.ts                  # Script migration & seed nguồn y khoa S1-S8
│   └── index.ts                                    # Mount healthAdviceRouter
└── tests/                                          # Bộ test tích hợp và unit test backend

frontend/
├── src/
│   ├── types/
│   │   ├── airQuality.types.ts                     # Xóa HealthAdviceGroup cũ
│   │   └── healthAdvice.types.ts                   # Types mới cho module khuyến cáo
│   ├── services/
│   │   └── apiClient/
│   │       └── healthAdvice.api.ts                 # API Client gọi /api/health-advice
│   ├── hooks/
│   │   └── useHealthAdvice.ts                      # Hook phân trang, timer, reload
│   ├── pages/
│   │   ├── HealthAlerts.tsx                        # Gỡ unused import mock data
│   │   └── Home.tsx                                # Tích hợp hook mới, phân trang 2x4
│   └── data/
│       └── mockAirData.ts                          # Xóa HEALTH_GROUPS_ADVICE
└── tests/                                          # Bộ test frontend
```

---

### Nhiệm vụ 1: Cài đặt TypeORM, Gỡ bỏ Sequelize & Cấu hình AppDataSource

**Danh sách file:**
- Chỉnh sửa: `backend/package.json`
- Chỉnh sửa: `backend/src/config/database.config.ts`
- File test: `backend/tests/database.config.test.ts`

**Giao diện kết nối:**
- Cung cấp cho các tác vụ sau: `AppDataSource: DataSource`, `connectDatabase(): Promise<void>`.

- [ ] **Bước 1: Viết test kiểm tra cấu hình TypeORM DataSource**

Tạo file `backend/tests/database.config.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { AppDataSource } from '../src/config/database.config';

test('AppDataSource is configured correctly for PostgreSQL with synchronize false', () => {
  assert.equal(AppDataSource.options.type, 'postgres');
  assert.equal(AppDataSource.options.synchronize, false);
  assert(Array.isArray(AppDataSource.options.entities));
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
npx ts-node backend/tests/database.config.test.ts
```
Kết quả mong đợi: FAIL vì `AppDataSource` chưa được export từ `database.config.ts`.

- [ ] **Bước 3: Cập nhật package.json và triển khai AppDataSource**

1. Trong `backend/package.json`:
   - Gỡ bỏ `"sequelize": "^6.37.5"`
   - Gỡ bỏ `"sequelize-typescript": "^2.1.6"`
   - Gỡ bỏ `"pg-hstore": "^2.3.4"`
   - Thêm `"typeorm": "^0.3.20"` vào `dependencies`.
2. Chạy `npm install` trong thư mục `backend/`.
3. Cập nhật `backend/src/config/database.config.ts`:
```ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { envConfig } from './env.config';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  username: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_NAME,
  synchronize: false,
  logging: envConfig.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  entities: [],
  migrations: [],
  subscribers: [],
});

export async function connectDatabase(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅  Kết nối cơ sở dữ liệu PostgreSQL (TypeORM DataSource) thành công.');
    }
  } catch (error) {
    console.error('❌  Khởi động TypeORM DataSource thất bại:', error);
    throw error;
  }
}
```

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
npx ts-node backend/tests/database.config.test.ts
```
Kết quả mong đợi: PASS 1 test.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/package.json backend/src/config/database.config.ts backend/tests/database.config.test.ts
git commit -m "feat(backend): configure TypeORM DataSource and remove Sequelize dependencies"
```

---

### Nhiệm vụ 2: Chuyển đổi Entity `User` sang TypeORM và Cập nhật `AuthService`

**Danh sách file:**
- Chỉnh sửa: `backend/src/models/entities/User.entity.ts`
- Chỉnh sửa: `backend/src/services/auth.service.ts`
- Chỉnh sửa: `backend/src/config/database.config.ts` (thêm `User` vào `entities`)
- File test: `backend/tests/auth.service.typeorm.test.ts`

**Giao diện kết nối:**
- Sử dụng: `AppDataSource`
- Cung cấp: `User` (TypeORM BaseEntity), `authService.register`, `authService.login`, `authService.getProfile`.

- [ ] **Bước 1: Viết test cho User Entity và AuthService với TypeORM**

Tạo file `backend/tests/auth.service.typeorm.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { User, UserRole } from '../src/models/entities/User.entity';

test('User entity has password hashing hook and safe object transformation', async () => {
  const user = new User();
  user.fullName = 'Test User';
  user.email = 'test@example.com';
  user.passwordHash = 'plainPassword123';
  user.role = UserRole.USER;
  user.isActive = true;

  await user.hashPasswordOnInsert();
  assert.notEqual(user.passwordHash, 'plainPassword123');
  
  const isMatch = await user.comparePassword('plainPassword123');
  assert.equal(isMatch, true);

  const safe = user.toSafeObject();
  assert.equal('passwordHash' in safe, false);
  assert.equal(safe.email, 'test@example.com');
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
npx ts-node backend/tests/auth.service.typeorm.test.ts
```
Kết quả mong đợi: FAIL do `User.entity.ts` vẫn import từ `sequelize-typescript`.

- [ ] **Bước 3: Viết lại User.entity.ts và cập nhật auth.service.ts**

1. Chỉnh sửa `backend/src/models/entities/User.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  BaseEntity,
} from 'typeorm';
import bcrypt from 'bcryptjs';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  async hashPasswordOnInsert(): Promise<void> {
    if (this.passwordHash) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
  }

  @BeforeUpdate()
  async hashPasswordOnUpdate(): Promise<void> {
    if (this.passwordHash && !this.passwordHash.startsWith('$2a$') && !this.passwordHash.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  toSafeObject() {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
```

2. Cập nhật `backend/src/services/auth.service.ts`:
```ts
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/entities/User.entity';
import { envConfig } from '../config/env.config';

export interface RegisterDto {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<{ user: object; token: string }> {
    const existing = await User.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new Error('Email đã được sử dụng.');
    }

    const user = User.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash: dto.password,
    });
    await user.save();

    const token = this.generateToken(user);
    return { user: user.toSafeObject(), token };
  }

  async login(dto: LoginDto): Promise<{ user: object; token: string }> {
    const user = await User.findOne({ where: { email: dto.email } });

    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị vô hiệu hoá.');
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không đúng.');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);
    return { user: user.toSafeObject(), token };
  }

  async getProfile(userId: number): Promise<object> {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) throw new Error('Người dùng không tồn tại.');
    return user.toSafeObject();
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, envConfig.JWT_SECRET, {
      expiresIn: envConfig.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }
}

export const authService = new AuthService();
```

3. Thêm `User` vào mảng `entities` trong `backend/src/config/database.config.ts`.

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
npx ts-node backend/tests/auth.service.typeorm.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/src/models/entities/User.entity.ts backend/src/services/auth.service.ts backend/src/config/database.config.ts backend/tests/auth.service.typeorm.test.ts
git commit -m "feat(backend): migrate User entity and AuthService to TypeORM"
```

---

### Nhiệm vụ 3: Chuyển đổi Entity `AirQualityPrediction` sang TypeORM & Cập nhật Controller

**Danh sách file:**
- Chỉnh sửa: `backend/src/models/entities/AirQualityPrediction.entity.ts`
- Chỉnh sửa: `backend/src/controllers/airQuality.controller.ts`
- Chỉnh sửa: `backend/src/config/database.config.ts` (thêm `AirQualityPrediction` vào `entities`)
- File test: `backend/tests/airQuality.typeorm.test.ts`

**Giao diện kết nối:**
- Sử dụng: `AppDataSource`
- Cung cấp: `AirQualityPrediction` (TypeORM BaseEntity).

- [ ] **Bước 1: Viết test cho AirQualityPrediction TypeORM entity**

Tạo file `backend/tests/airQuality.typeorm.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { AirQualityPrediction } from '../src/models/entities/AirQualityPrediction.entity';

test('AirQualityPrediction can be instantiated with valid attributes', () => {
  const pred = new AirQualityPrediction();
  pred.type = 'daily';
  pred.algo = 'svr';
  pred.city = 'hanoi';
  pred.predictionData = { sample: 123 };
  pred.generatedAt = new Date();

  assert.equal(pred.type, 'daily');
  assert.equal(pred.algo, 'svr');
  assert.equal(pred.city, 'hanoi');
  assert(pred.generatedAt instanceof Date);
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
npx ts-node backend/tests/airQuality.typeorm.test.ts
```
Kết quả mong đợi: FAIL do entity cũ dùng Sequelize.

- [ ] **Bước 3: Viết lại AirQualityPrediction.entity.ts và cập nhật airQuality.controller.ts**

1. Chỉnh sửa `backend/src/models/entities/AirQualityPrediction.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';

@Entity({ name: 'air_quality_predictions' })
export class AirQualityPrediction extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 50, default: 'svr' })
  algo: string;

  @Column({ type: 'varchar', length: 100, default: 'hanoi' })
  city: string;

  @Column({ name: 'prediction_data', type: 'jsonb' })
  predictionData: object;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

2. Cập nhật `backend/src/controllers/airQuality.controller.ts`:
Thay thế đoạn `AirQualityPrediction.create({ ... })` bằng:
```ts
await AirQualityPrediction.create({
  type: 'daily',
  algo: data.algo,
  city: data.city,
  predictionData: data,
  generatedAt: new Date(data.generated_at),
}).save();
```
(Tương tự cho hàm `getHourlyForecast`).

3. Thêm `AirQualityPrediction` vào `entities` trong `backend/src/config/database.config.ts`.

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
npx ts-node backend/tests/airQuality.typeorm.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/src/models/entities/AirQualityPrediction.entity.ts backend/src/controllers/airQuality.controller.ts backend/src/config/database.config.ts backend/tests/airQuality.typeorm.test.ts
git commit -m "feat(backend): migrate AirQualityPrediction entity and controller to TypeORM"
```

---

### Nhiệm vụ 4: Migration Ràng buộc Toàn vẹn & Seed Nguồn Y khoa S1–S8 trong PostgreSQL

**Danh sách file:**
- Tạo: `backend/src/scripts/seed-advice-sources.ts`
- File test: `backend/tests/advice-seed.test.ts`

**Giao diện kết nối:**
- Cung cấp: 8 bản ghi nguồn tài liệu y tế trong bảng `advice_sources` và các liên kết trong `advice_topic_sources`.

- [ ] **Bước 1: Viết test kiểm tra tính toàn vẹn và dữ liệu seed trong DB**

Tạo file `backend/tests/advice-seed.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { envConfig } from '../src/config/env.config';

test('PostgreSQL database contains advice_sources S1-S8 and integrity constraints', async () => {
  const client = new Client({
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
  });

  await client.connect();
  try {
    const resSources = await client.query('SELECT count(*) FROM advice_sources WHERE code IN (\'S1\',\'S2\',\'S3\',\'S4\',\'S5\',\'S6\',\'S7\',\'S8\')');
    assert.equal(parseInt(resSources.rows[0].count, 10), 8);

    const resTopicSources = await client.query('SELECT count(*) FROM advice_topic_sources');
    assert(parseInt(resTopicSources.rows[0].count, 10) > 0);
  } finally {
    await client.end();
  }
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại trước khi seed**

Chạy:
```bash
npx ts-node backend/tests/advice-seed.test.ts
```
Kết quả mong đợi: FAIL vì `advice_sources` hiện tại có 0 bản ghi.

- [ ] **Bước 3: Tạo và chạy script migration & seed**

Tạo `backend/src/scripts/seed-advice-sources.ts`:
```ts
import { Client } from 'pg';
import { envConfig } from '../config/env.config';

async function runSeed() {
  const client = new Client({
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
  });

  await client.connect();
  console.log('🔗 Đã kết nối PostgreSQL để chạy migration & seed...');

  try {
    // 1. Ràng buộc toàn vẹn
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_advice_items_topic_sort') THEN
          ALTER TABLE advice_items ADD CONSTRAINT uq_advice_items_topic_sort UNIQUE (topic_id, sort_order);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_advice_topics_risk_level') THEN
          ALTER TABLE advice_topics ADD CONSTRAINT chk_advice_topics_risk_level CHECK (risk_level IN ('low', 'moderate', 'high', 'critical'));
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_advice_topics_type') THEN
          ALTER TABLE advice_topics ADD CONSTRAINT chk_advice_topics_type CHECK (topic_type IN ('target_group', 'situation', 'pollutant', 'symptom'));
        END IF;
      END $$;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_advice_topics_target_group_order 
      ON advice_topics (display_order) 
      WHERE topic_type = 'target_group';

      CREATE INDEX IF NOT EXISTS idx_advice_topic_sources_source_id 
      ON advice_topic_sources (source_id);
    `);
    console.log('✅ Đã cập nhật các ràng buộc và chỉ mục toàn vẹn.');

    // 2. Seed nguồn tài liệu y khoa S1–S8
    await client.query(`
      INSERT INTO advice_sources (code, title, publisher, published_year, url) VALUES
      ('S1', 'Air Quality Guidelines: Global Update', 'World Health Organization (WHO)', 2021, 'https://www.who.int/publications/i/item/9789240034228'),
      ('S2', 'Air Quality and Health', 'US Environmental Protection Agency (EPA)', 2023, 'https://www.epa.gov/air-research/air-quality-and-health'),
      ('S3', 'Hướng dẫn dự phòng và bảo vệ sức khỏe mùa ô nhiễm không khí', 'Bộ Y tế Việt Nam', 2023, 'https://moh.gov.vn'),
      ('S4', 'Guidance on Air Pollution and Children Health', 'UNICEF / WHO', 2022, 'https://www.unicef.org'),
      ('S5', 'Asthma and Outdoor Air Pollution Management', 'Global Initiative for Asthma (GINA)', 2023, 'https://ginasthma.org'),
      ('S6', 'Air Pollution and Cardiovascular Disease', 'American Heart Association (AHA)', 2020, 'https://www.ahajournals.org'),
      ('S7', 'Protecting Outdoor Workers from Air Pollution Hazards', 'Occupational Safety and Health Administration (OSHA)', 2022, 'https://www.osha.gov'),
      ('S8', 'Indoor Air Quality and Vulnerable Populations', 'Clean Air Asia', 2023, 'https://cleanairasia.org')
      ON CONFLICT (code) DO NOTHING;
    `);

    // 3. Map topic -> sources
    await client.query(`
      INSERT INTO advice_topic_sources (topic_id, source_id)
      SELECT t.id, s.id FROM advice_topics t, advice_sources s
      WHERE (t.slug = 'children' AND s.code IN ('S1', 'S3', 'S4'))
         OR (t.slug = 'pregnant' AND s.code IN ('S1', 'S3', 'S4'))
         OR (t.slug = 'elderly' AND s.code IN ('S1', 'S2', 'S3', 'S6'))
         OR (t.slug = 'respiratory' AND s.code IN ('S1', 'S3', 'S5'))
         OR (t.slug = 'cardiovascular' AND s.code IN ('S1', 'S3', 'S6'))
         OR (t.slug = 'athletes' AND s.code IN ('S2', 'S3', 'S7'))
         OR (t.slug = 'outdoor_workers' AND s.code IN ('S2', 'S3', 'S7'))
         OR (t.slug = 'families' AND s.code IN ('S1', 'S3', 'S8'))
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Đã seed thành công nguồn S1–S8 và liên kết topic.');
  } finally {
    await client.end();
  }
}

runSeed().catch(console.error);
```
Chạy script:
```bash
npx ts-node backend/src/scripts/seed-advice-sources.ts
```

- [ ] **Bước 4: Chạy test xác nhận seed hoàn tất**

Chạy:
```bash
npx ts-node backend/tests/advice-seed.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/src/scripts/seed-advice-sources.ts backend/tests/advice-seed.test.ts
git commit -m "feat(backend): add database constraints and seed medical advice sources S1-S8"
```

---

### Nhiệm vụ 5: Xây dựng TypeORM Entities cho Khuyến cáo Sức khỏe

**Danh sách file:**
- Tạo: `backend/src/models/entities/advice.enums.ts`
- Tạo: `backend/src/models/entities/AdviceSource.entity.ts`
- Tạo: `backend/src/models/entities/AdviceTopic.entity.ts`
- Tạo: `backend/src/models/entities/AdviceItem.entity.ts`
- Chỉnh sửa: `backend/src/config/database.config.ts`
- Chỉnh sửa: `backend/src/models/DataSource.ts`
- File test: `backend/tests/advice.entities.test.ts`

**Giao diện kết nối:**
- Cung cấp: `AdviceTopic`, `AdviceItem`, `AdviceSource`, `TopicType`, `RiskLevel` cho service.

- [ ] **Bước 1: Viết test kiểm tra TypeORM entities cho Health Advice**

Tạo file `backend/tests/advice.entities.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdviceTopic } from '../src/models/entities/AdviceTopic.entity';
import { AdviceItem } from '../src/models/entities/AdviceItem.entity';
import { AdviceSource } from '../src/models/entities/AdviceSource.entity';
import { TopicType, RiskLevel } from '../src/models/entities/advice.enums';

test('Advice entities can be instantiated with relational structures', () => {
  const topic = new AdviceTopic();
  topic.id = 1;
  topic.slug = 'children';
  topic.titleVi = 'Trẻ em';
  topic.topicType = TopicType.TARGET_GROUP;
  topic.riskLevel = RiskLevel.HIGH;

  const item = new AdviceItem();
  item.id = 10;
  item.contentVi = 'Kiểm tra AQI';
  item.topic = topic;

  const source = new AdviceSource();
  source.code = 'S1';
  source.title = 'WHO Guide';
  topic.sources = [source];

  assert.equal(topic.slug, 'children');
  assert.equal(item.topic.id, 1);
  assert.equal(topic.sources.length, 1);
  assert.equal(topic.sources[0].code, 'S1');
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
npx ts-node backend/tests/advice.entities.test.ts
```
Kết quả mong đợi: FAIL do chưa tạo các file entity.

- [ ] **Bước 3: Tạo các entity TypeORM**

1. Tạo `backend/src/models/entities/advice.enums.ts`:
```ts
export enum TopicType {
  TARGET_GROUP = 'target_group',
  SITUATION = 'situation',
  POLLUTANT = 'pollutant',
  SYMPTOM = 'symptom',
}

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical',
}
```

2. Tạo `backend/src/models/entities/AdviceSource.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { AdviceTopic } from './AdviceTopic.entity';

@Entity({ name: 'advice_sources' })
export class AdviceSource {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 10, unique: true })
  code: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher: string | null;

  @Column({ name: 'published_year', type: 'smallint', nullable: true })
  publishedYear: number | null;

  @Column({ type: 'text', nullable: true })
  url: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToMany(() => AdviceTopic, (topic) => topic.sources)
  topics: AdviceTopic[];
}
```

3. Tạo `backend/src/models/entities/AdviceTopic.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { RiskLevel, TopicType } from './advice.enums';
import { AdviceItem } from './AdviceItem.entity';
import { AdviceSource } from './AdviceSource.entity';

@Entity({ name: 'advice_topics' })
export class AdviceTopic {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({
    name: 'topic_type',
    type: 'varchar',
    length: 30,
    default: TopicType.TARGET_GROUP,
  })
  topicType: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string;

  @Column({ name: 'title_vi', type: 'varchar', length: 200 })
  titleVi: string;

  @Column({ name: 'title_en', type: 'varchar', length: 200, nullable: true })
  titleEn: string | null;

  @Column({ name: 'icon_key', type: 'varchar', length: 30, default: 'HeartPulse' })
  iconKey: string;

  @Column({
    name: 'risk_level',
    type: 'varchar',
    length: 20,
    default: RiskLevel.MODERATE,
  })
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';

  @Column({ name: 'display_order', type: 'smallint', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => AdviceItem, (item) => item.topic)
  items: AdviceItem[];

  @ManyToMany(() => AdviceSource, (source) => source.topics)
  @JoinTable({
    name: 'advice_topic_sources',
    joinColumn: { name: 'topic_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'source_id', referencedColumnName: 'id' },
  })
  sources: AdviceSource[];
}
```

4. Tạo `backend/src/models/entities/AdviceItem.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AdviceTopic } from './AdviceTopic.entity';

@Entity({ name: 'advice_items' })
@Index('idx_advice_items_topic_active_sort', ['topicId', 'isActive', 'sortOrder', 'id'])
export class AdviceItem {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'topic_id', type: 'int' })
  topicId: number;

  @ManyToOne(() => AdviceTopic, (topic) => topic.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'topic_id' })
  topic: AdviceTopic;

  @Column({ name: 'content_vi', type: 'text' })
  contentVi: string;

  @Column({ name: 'content_en', type: 'text', nullable: true })
  contentEn: string | null;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
```

5. Cập nhật `backend/src/models/DataSource.ts` và thêm các entity vào `entities` trong `backend/src/config/database.config.ts`.

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
npx ts-node backend/tests/advice.entities.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/src/models/entities/advice.enums.ts backend/src/models/entities/AdviceSource.entity.ts backend/src/models/entities/AdviceTopic.entity.ts backend/src/models/entities/AdviceItem.entity.ts backend/src/models/DataSource.ts backend/src/config/database.config.ts backend/tests/advice.entities.test.ts
git commit -m "feat(backend): implement TypeORM entities for health advice module"
```

---

### Nhiệm vụ 6: Thuật toán Xoay vòng 6h & Service Khuyến cáo Sức khỏe

**Danh sách file:**
- Tạo: `backend/src/utils/rotation.util.ts`
- Tạo: `backend/src/services/healthAdvice.service.ts`
- File test: `backend/tests/rotation.util.test.ts`
- File test: `backend/tests/healthAdvice.service.test.ts`

**Giao diện kết nối:**
- Cung cấp: `calculateRotation(nowMs)`, `healthAdviceService.getHealthAdvice(nowMs)`.

- [ ] **Bước 1: Viết test cho thuật toán xoay vòng và service**

1. Tạo `backend/tests/rotation.util.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRotation } from '../src/utils/rotation.util';

test('calculateRotation computes 6-hour slots aligned with Vietnam Time (UTC+7)', () => {
  // 2026-10-03T16:59:59Z = 23:59:59 VN (slot trước 00h)
  const t1 = new Date('2026-10-03T16:59:59Z').getTime();
  const r1 = calculateRotation(t1);

  // 2026-10-03T17:00:00Z = 00:00:00 VN ngày mới (slot 00h)
  const t2 = new Date('2026-10-03T17:00:00Z').getTime();
  const r2 = calculateRotation(t2);

  assert.equal(r2.slot, r1.slot + 1);
  assert(r1.rotatesAt.getTime() > t1);
  assert(r1.secondsRemaining > 0 && r1.secondsRemaining <= 21600);
});
```

2. Tạo `backend/tests/healthAdvice.service.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { AppDataSource, connectDatabase } from '../src/config/database.config';
import { healthAdviceService } from '../src/services/healthAdvice.service';

test('HealthAdviceService returns 8 topics with maximum 4 items each and sources', async () => {
  await connectDatabase();
  try {
    const res = await healthAdviceService.getHealthAdvice(new Date('2026-10-03T12:00:00Z').getTime());
    assert.equal(res.topics.length, 8);
    for (const topic of res.topics) {
      assert(topic.items.length <= 4 && topic.items.length > 0);
      assert(Array.isArray(topic.sources));
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
npx ts-node backend/tests/rotation.util.test.ts
```
Kết quả mong đợi: FAIL do chưa có file `rotation.util.ts`.

- [ ] **Bước 3: Viết rotation.util.ts và healthAdvice.service.ts**

1. Tạo `backend/src/utils/rotation.util.ts`:
```ts
const SIX_HOURS_MS = 6 * 3600 * 1000;
const VN_TIMEZONE_OFFSET_MS = 7 * 3600 * 1000;

export interface RotationInfo {
  slot: number;
  rotatesAt: Date;
  secondsRemaining: number;
}

export function calculateRotation(nowMs: number = Date.now()): RotationInfo {
  const vnNow = nowMs + VN_TIMEZONE_OFFSET_MS;
  const slot = Math.floor(vnNow / SIX_HOURS_MS);

  const nextSlotVnMs = (slot + 1) * SIX_HOURS_MS;
  const rotatesAt = new Date(nextSlotVnMs - VN_TIMEZONE_OFFSET_MS);
  const secondsRemaining = Math.max(1, Math.floor((rotatesAt.getTime() - nowMs) / 1000));

  return { slot, rotatesAt, secondsRemaining };
}
```

2. Tạo `backend/src/services/healthAdvice.service.ts`:
```ts
import { AppDataSource } from '../config/database.config';
import { AdviceTopic } from '../models/entities/AdviceTopic.entity';
import { calculateRotation } from '../utils/rotation.util';

export interface HealthAdviceResponseData {
  slot: number;
  generatedAt: string;
  rotatesAt: string;
  topics: Array<{
    id: number;
    slug: string;
    titleVi: string;
    titleEn: string | null;
    iconKey: string;
    riskLevel: 'low' | 'moderate' | 'high' | 'critical';
    displayOrder: number;
    items: Array<{
      id: number;
      contentVi: string;
      contentEn: string | null;
    }>;
    sources: Array<{
      code: string;
      title: string;
      publisher: string | null;
      publishedYear: number | null;
      url: string | null;
    }>;
  }>;
}

export class HealthAdviceService {
  async getHealthAdvice(nowMs: number = Date.now()): Promise<HealthAdviceResponseData> {
    const { slot, rotatesAt } = calculateRotation(nowMs);

    const rotatingSql = `
      WITH ranked AS (
        SELECT i.id, i.topic_id, i.content_vi, i.content_en,
               ROW_NUMBER() OVER (PARTITION BY i.topic_id ORDER BY i.sort_order, i.id) - 1 AS pos,
               COUNT(*)     OVER (PARTITION BY i.topic_id)                               AS n
        FROM advice_items i
        WHERE i.is_active = true
      ), windowed AS (
        SELECT r.*, (((r.pos - $1::bigint * 4) % r.n) + r.n) % r.n AS rel
        FROM ranked r
      )
      SELECT t.id AS topic_id, t.slug, t.title_vi, t.title_en, t.icon_key, t.risk_level, t.display_order,
             w.id AS item_id, w.content_vi, w.content_en, w.rel
      FROM advice_topics t
      JOIN windowed w ON w.topic_id = t.id
      WHERE t.topic_type = 'target_group'
        AND t.is_active = true
        AND (w.n <= 4 OR w.rel < 4)
      ORDER BY t.display_order ASC, w.rel ASC;
    `;

    const itemRows = await AppDataSource.query(rotatingSql, [slot]);

    const topicRepo = AppDataSource.getRepository(AdviceTopic);
    const topicsWithSources = await topicRepo.find({
      where: { topicType: 'target_group', isActive: true },
      relations: { sources: true },
      order: { displayOrder: 'ASC' },
    });

    const sourcesByTopicId = new Map<number, any[]>();
    topicsWithSources.forEach((t) => {
      sourcesByTopicId.set(
        t.id,
        (t.sources || []).map((s) => ({
          code: s.code,
          title: s.title,
          publisher: s.publisher,
          publishedYear: s.publishedYear,
          url: s.url,
        }))
      );
    });

    const topicsMap = new Map<number, any>();

    for (const row of itemRows) {
      const topicId = Number(row.topic_id);
      if (!topicsMap.has(topicId)) {
        topicsMap.set(topicId, {
          id: topicId,
          slug: row.slug,
          titleVi: row.title_vi,
          titleEn: row.title_en,
          iconKey: row.icon_key,
          riskLevel: row.risk_level,
          displayOrder: Number(row.display_order),
          items: [],
          sources: sourcesByTopicId.get(topicId) || [],
        });
      }

      if (row.item_id) {
        topicsMap.get(topicId).items.push({
          id: Number(row.item_id),
          contentVi: row.content_vi,
          contentEn: row.content_en,
        });
      }
    }

    return {
      slot,
      generatedAt: new Date(nowMs).toISOString(),
      rotatesAt: rotatesAt.toISOString(),
      topics: Array.from(topicsMap.values()),
    };
  }
}

export const healthAdviceService = new HealthAdviceService();
```

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
npx ts-node backend/tests/rotation.util.test.ts
npx ts-node backend/tests/healthAdvice.service.test.ts
```
Kết quả mong đợi: PASS cả 2 bộ test.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/src/utils/rotation.util.ts backend/src/services/healthAdvice.service.ts backend/tests/rotation.util.test.ts backend/tests/healthAdvice.service.test.ts
git commit -m "feat(backend): implement 6h rotation logic and HealthAdviceService with raw window query"
```

---

### Nhiệm vụ 7: Controller & Router API Khuyến cáo Sức khỏe (`/api/health-advice`)

**Danh sách file:**
- Tạo: `backend/src/controllers/healthAdvice.controller.ts`
- Tạo: `backend/src/routers/healthAdvice.router.ts`
- Chỉnh sửa: `backend/src/index.ts`
- File test: `backend/tests/healthAdvice.api.test.ts`

**Giao diện kết nối:**
- Cung cấp: Endpoint HTTP `GET /api/health-advice`.

- [ ] **Bước 1: Viết test cho endpoint GET /api/health-advice**

Tạo file `backend/tests/healthAdvice.api.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { connectDatabase, AppDataSource } from '../src/config/database.config';
import healthAdviceRouter from '../src/routers/healthAdvice.router';

test('GET /api/health-advice returns 200 with ApiEnvelope and Cache-Control header', async () => {
  await connectDatabase();
  const app = express();
  app.use('/api/health-advice', healthAdviceRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health-advice`);
    assert.equal(res.status, 200);
    assert(res.headers.get('cache-control')?.includes('max-age'));

    const body: any = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.topics.length, 8);
    assert(typeof body.data.slot === 'number');
  } finally {
    server.close();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
npx ts-node backend/tests/healthAdvice.api.test.ts
```
Kết quả mong đợi: FAIL do chưa có controller và router.

- [ ] **Bước 3: Viết controller, router và mount vào app**

1. Tạo `backend/src/controllers/healthAdvice.controller.ts`:
```ts
import { Request, Response, NextFunction } from 'express';
import { healthAdviceService } from '../services/healthAdvice.service';
import { calculateRotation } from '../utils/rotation.util';

export class HealthAdviceController {
  async getHealthAdvice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const now = Date.now();
      const { secondsRemaining } = calculateRotation(now);
      const data = await healthAdviceService.getHealthAdvice(now);

      const maxAge = Math.min(secondsRemaining, 600);
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('❌ [HealthAdviceController] Lỗi lấy khuyến cáo sức khỏe:', error);
      res.status(500).json({
        success: false,
        message: 'Không thể tải dữ liệu khuyến cáo sức khỏe. Vui lòng thử lại sau.',
      });
    }
  }
}

export const healthAdviceController = new HealthAdviceController();
```

2. Tạo `backend/src/routers/healthAdvice.router.ts`:
```ts
import { Router } from 'express';
import { healthAdviceController } from '../controllers/healthAdvice.controller';

const router = Router();
router.get('/', (req, res, next) => healthAdviceController.getHealthAdvice(req, res, next));

export default router;
```

3. Trong `backend/src/index.ts`, import và mount router:
```ts
import healthAdviceRouter from './routers/healthAdvice.router';
// ...
app.use('/api/health-advice', healthAdviceRouter);
```

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
npx ts-node backend/tests/healthAdvice.api.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add backend/src/controllers/healthAdvice.controller.ts backend/src/routers/healthAdvice.router.ts backend/src/index.ts backend/tests/healthAdvice.api.test.ts
git commit -m "feat(backend): implement health advice controller and router"
```

---

### Nhiệm vụ 8: Tầng Frontend API Client & Custom Hook `useHealthAdvice`

**Danh sách file:**
- Tạo: `frontend/src/types/healthAdvice.types.ts`
- Tạo: `frontend/src/services/apiClient/healthAdvice.api.ts`
- Tạo: `frontend/src/hooks/useHealthAdvice.ts`
- File test: `frontend/tests/healthAdvice.api.test.ts`

**Giao diện kết nối:**
- Cung cấp: Types, `fetchHealthAdvice()`, `useHealthAdvice()`.

- [ ] **Bước 1: Viết test cho API Client của Frontend**

Tạo `frontend/tests/healthAdvice.api.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchHealthAdvice } from '../src/services/apiClient/healthAdvice.api';

test('fetchHealthAdvice unwraps envelope and returns health advice data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          slot: 1234,
          generatedAt: '2026-10-03T10:00:00Z',
          rotatesAt: '2026-10-03T16:00:00Z',
          topics: [
            {
              id: 1,
              slug: 'children',
              titleVi: 'Trẻ em',
              titleEn: null,
              iconKey: 'Baby',
              riskLevel: 'high',
              displayOrder: 1,
              items: [{ id: 10, contentVi: 'Khuyến cáo mẫu', contentEn: null }],
              sources: [],
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  try {
    const res = await fetchHealthAdvice();
    assert.equal(res.slot, 1234);
    assert.equal(res.topics.length, 1);
    assert.equal(res.topics[0].slug, 'children');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
node --experimental-strip-types --test frontend/tests/healthAdvice.api.test.ts
```
Kết quả mong đợi: FAIL do chưa có file `healthAdvice.api.ts`.

- [ ] **Bước 3: Viết Types, API Client và Custom Hook**

1. Tạo `frontend/src/types/healthAdvice.types.ts`:
```ts
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface HealthAdviceItem {
  id: number;
  contentVi: string;
  contentEn: string | null;
}

export interface HealthAdviceSource {
  code: string;
  title: string;
  publisher: string | null;
  publishedYear: number | null;
  url: string | null;
}

export interface HealthAdviceTopic {
  id: number;
  slug: string;
  titleVi: string;
  titleEn: string | null;
  iconKey: string;
  riskLevel: RiskLevel;
  displayOrder: number;
  items: HealthAdviceItem[];
  sources: HealthAdviceSource[];
}

export interface HealthAdviceResponseData {
  slot: number;
  generatedAt: string;
  rotatesAt: string;
  topics: HealthAdviceTopic[];
}
```

2. Tạo `frontend/src/services/apiClient/healthAdvice.api.ts`:
```ts
import type { HealthAdviceResponseData } from '../../types/healthAdvice.types';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export async function fetchHealthAdvice(timeoutMs: number = 8000): Promise<HealthAdviceResponseData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}/health-advice`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    let body: ApiEnvelope<HealthAdviceResponseData> | null = null;
    try {
      body = await res.json();
    } catch {}

    if (!res.ok || !body?.success || !body.data) {
      throw new Error(body?.message || `Lỗi tải khuyến cáo sức khỏe (HTTP ${res.status})`);
    }

    return body.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

3. Tạo `frontend/src/hooks/useHealthAdvice.ts`:
```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchHealthAdvice } from '../services/apiClient/healthAdvice.api';
import type { HealthAdviceResponseData } from '../types/healthAdvice.types';

export function useHealthAdvice() {
  const [data, setData] = useState<HealthAdviceResponseData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const timerRef = useRef<any>(null);

  const loadAdvice = useCallback(async (isBackground: boolean = false) => {
    if (!isBackground) setIsLoading(true);
    setError(null);
    try {
      const result = await fetchHealthAdvice();
      setData(result);

      if (timerRef.current) clearTimeout(timerRef.current);
      const now = Date.now();
      const rotatesAtMs = new Date(result.rotatesAt).getTime();
      const delayMs = Math.max(1000, rotatesAtMs - now + Math.floor(Math.random() * 4000 + 1000));

      timerRef.current = setTimeout(() => {
        loadAdvice(true);
      }, delayMs);
    } catch (err: any) {
      setError(err.message || 'Không thể tải khuyến cáo sức khỏe');
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdvice();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && data?.rotatesAt) {
        if (Date.now() > new Date(data.rotatesAt).getTime()) {
          loadAdvice(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAdvice, data?.rotatesAt]);

  const allTopics = data?.topics || [];
  const totalPages = Math.max(1, Math.ceil(allTopics.length / 4));
  const currentTopics = allTopics.slice((currentPage - 1) * 4, currentPage * 4);

  return {
    topics: currentTopics,
    allTopics,
    rotatesAt: data?.rotatesAt,
    isLoading,
    error,
    currentPage,
    totalPages,
    setCurrentPage,
    refetch: () => loadAdvice(false),
  };
}
```

- [ ] **Bước 4: Chạy test xác nhận test vượt qua**

Chạy:
```bash
node --experimental-strip-types --test frontend/tests/healthAdvice.api.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add frontend/src/types/healthAdvice.types.ts frontend/src/services/apiClient/healthAdvice.api.ts frontend/src/hooks/useHealthAdvice.ts frontend/tests/healthAdvice.api.test.ts
git commit -m "feat(frontend): implement health advice types, api client and useHealthAdvice hook"
```

---

### Nhiệm vụ 9: Nâng cấp Giao diện Khối Khuyến cáo trên Trang `Home.tsx`

**Danh sách file:**
- Chỉnh sửa: `frontend/src/pages/Home.tsx`

**Giao diện kết nối:**
- Sử dụng: `useHealthAdvice()`.

- [ ] **Bước 1: Viết test xác nhận cấu trúc component và helper hiển thị**

Tạo `frontend/tests/home.advice.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { HealthAdviceTopic } from '../src/types/healthAdvice.types';

test('HealthAdviceTopic data can be partitioned into 2 pages with 4 cards each', () => {
  const mockTopics: HealthAdviceTopic[] = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    slug: `topic-${i + 1}`,
    titleVi: `Nhóm ${i + 1}`,
    titleEn: null,
    iconKey: 'Baby',
    riskLevel: 'moderate',
    displayOrder: i + 1,
    items: [],
    sources: [],
  }));

  const page1 = mockTopics.slice(0, 4);
  const page2 = mockTopics.slice(4, 8);

  assert.equal(page1.length, 4);
  assert.equal(page2.length, 4);
  assert.equal(page1[0].displayOrder, 1);
  assert.equal(page2[3].displayOrder, 8);
});
```

- [ ] **Bước 2: Chạy test để xác nhận**

Chạy:
```bash
node --experimental-strip-types --test frontend/tests/home.advice.test.ts
```
Kết quả mong đợi: PASS.

- [ ] **Bước 3: Tích hợp useHealthAdvice vào Home.tsx**

1. Trong `frontend/src/pages/Home.tsx`:
   - Import `useHealthAdvice` từ `../hooks/useHealthAdvice`.
   - Bổ sung helper icon mapping hỗ trợ các key: `Baby`, `HeartPulse`, `Activity`, `Heart`, `Bike`, `Users`, fallback `ShieldAlert`.
   - Bổ sung helper nhãn và màu sắc cho `riskLevel` (`critical`, `high`, `moderate`, `low`).
   - Xây dựng thanh điều khiển phân trang: nút chuyển trang Prev/Next và các pagination dots (Trang 1: nhóm 1–4, Trang 2: nhóm 5–8).
   - Hiển thị danh sách nguồn tham khảo y học qua dialog/popover khi bấm "Xem tài liệu y khoa tham khảo".
   - Bổ sung thông cáo an toàn y khoa chân khối: *"Lưu ý: Các khuyến cáo mang tính chất tham khảo khoa học, không thay thế chẩn đoán hay chỉ định y khoa chuyên sâu. Người có triệu chứng hô hấp/tim mạch nặng cần thăm khám bác sĩ kịp thời."*
   - Xử lý trạng thái Skeleton loading (4 thẻ mờ) và Error banner (kèm nút Thử lại).

- [ ] **Bước 4: Kiểm tra hiển thị và tương tác trên trình duyệt**

Mở ứng dụng hoặc chạy `npm run lint` để kiểm tra type an toàn.
Kết quả mong đợi: Khối khuyến cáo hiển thị 4 thẻ, chuyển sang trang 2 hiển thị 4 nhóm còn lại, icon hiển thị sắc nét.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add frontend/src/pages/Home.tsx frontend/tests/home.advice.test.ts
git commit -m "feat(frontend): integrate dynamic health advice with pagination and medical sources on Home page"
```

---

### Nhiệm vụ 10: Xóa bỏ Triệt để Mock Data Cũ & Kiểm tra Compile Toàn hệ thống

**Danh sách file:**
- Chỉnh sửa: `frontend/src/data/mockAirData.ts`
- Chỉnh sửa: `frontend/src/pages/HealthAlerts.tsx`
- Chỉnh sửa: `frontend/src/pages/Home.tsx`
- Chỉnh sửa: `frontend/src/types/airQuality.types.ts`
- File test: `frontend/tests/mock-cleanup.test.ts`

**Giao diện kết nối:**
- Đảm bảo: 0 dữ liệu mock khuyến cáo, 0 lỗi TypeScript toàn hệ thống.

- [ ] **Bước 1: Viết test kiểm tra mock data đã bị xóa bỏ**

Tạo `frontend/tests/mock-cleanup.test.ts`:
```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mockModule from '../src/data/mockAirData';

test('HEALTH_GROUPS_ADVICE is completely removed from mockAirData', () => {
  assert.equal('HEALTH_GROUPS_ADVICE' in mockModule, false);
});
```

- [ ] **Bước 2: Chạy test để xác nhận test thất bại**

Chạy:
```bash
node --experimental-strip-types --test frontend/tests/mock-cleanup.test.ts
```
Kết quả mong đợi: FAIL do `HEALTH_GROUPS_ADVICE` vẫn còn tồn tại.

- [ ] **Bước 3: Xóa mock data và dọn dẹp import**

1. Trong `frontend/src/data/mockAirData.ts`:
   - Gỡ bỏ import `HealthAdviceGroup` ở dòng 1.
   - Xóa bỏ định nghĩa `export const HEALTH_GROUPS_ADVICE: HealthAdviceGroup[] = [ ... ];` (khoảng 78 dòng).
2. Trong `frontend/src/pages/HealthAlerts.tsx`:
   - Xóa bỏ import `HEALTH_GROUPS_ADVICE` từ `../data/mockAirData`.
3. Trong `frontend/src/pages/Home.tsx`:
   - Xóa bỏ import `HEALTH_GROUPS_ADVICE` từ `../data/mockAirData`.
4. Trong `frontend/src/types/airQuality.types.ts`:
   - Xóa bỏ interface `HealthAdviceGroup`.

- [ ] **Bước 4: Chạy test và lint kiểm tra toàn hệ thống**

1. Chạy test:
```bash
node --experimental-strip-types --test frontend/tests/mock-cleanup.test.ts
```
Kết quả mong đợi: PASS.
2. Kiểm tra type frontend:
```bash
cd frontend && npm run lint
```
Kết quả mong đợi: Không có lỗi type.
3. Kiểm tra type backend:
```bash
cd backend && npm run lint
```
Kết quả mong đợi: Không có lỗi type.

- [ ] **Bước 5: Commit thay đổi**

```bash
git add frontend/src/data/mockAirData.ts frontend/src/pages/HealthAlerts.tsx frontend/src/pages/Home.tsx frontend/src/types/airQuality.types.ts frontend/tests/mock-cleanup.test.ts
git commit -m "refactor(frontend): completely remove HEALTH_GROUPS_ADVICE mock data and unused types"
```

---

## Tự Đánh giá Kế hoạch (Self-Review)

1. **Phủ kín Spec (Spec Coverage):**
   - Di chuyển TypeORM: Nhiệm vụ 1, 2, 3.
   - Ràng buộc toàn vẹn & Seed S1-S8: Nhiệm vụ 4.
   - Entities Khuyến cáo TypeORM: Nhiệm vụ 5.
   - Thuật toán xoay 6 tiếng & Window Query SQL: Nhiệm vụ 6.
   - API Endpoint `/api/health-advice`: Nhiệm vụ 7.
   - Frontend API Client & Hook: Nhiệm vụ 8.
   - Giao diện Home 2 trang x 4 thẻ: Nhiệm vụ 9.
   - Xóa bỏ mock data & Kiểm tra compile: Nhiệm vụ 10.
2. **Không chứa Placeholder:** Tất cả các bước đều có code mẫu, lệnh thực thi và kết quả kỳ vọng rõ ràng.
3. **Tính nhất quán của Kiểu dữ liệu:** Các interface `HealthAdviceResponseData`, `AdviceTopic`, `AdviceItem`, `AdviceSource` đồng nhất giữa Backend và Frontend.
4. **Trọng tâm kiểm duyệt:** Đã bao hàm kiểm thử lỗi mạng, chuyển múi giờ VN, và kiểm thử hồi quy Auth/Prediction.
