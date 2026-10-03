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
