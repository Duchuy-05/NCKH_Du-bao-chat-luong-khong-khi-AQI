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
