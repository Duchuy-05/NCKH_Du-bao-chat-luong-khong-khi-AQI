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
