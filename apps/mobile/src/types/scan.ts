export type ScanStatus = 'complete' | 'needs_review';
export type ScanCategory = 'food' | 'packaged_food' | 'plant' | 'mushroom' | 'hazardous_nonfood' | 'unknown';
export type ConfidenceLabel = 'high' | 'moderate' | 'low';
export type RiskLevel = 'low' | 'caution' | 'high' | 'unknown';
export type NutritionBasis = 'label' | 'estimated' | 'general' | 'unavailable';
export type RecipeDifficulty = 'easy' | 'medium';

export interface IdentificationAlternative {
  name: string;
  reason: string;
}

export interface ScanIdentification {
  name: string;
  scientific_name?: string | null;
  brand?: string | null;
  category: ScanCategory;
  confidence: number;
  confidence_label: ConfidenceLabel;
  evidence: string[];
  alternatives: IdentificationAlternative[];
  requires_expert_verification: boolean;
}

export interface ScanSafety {
  risk_level: RiskLevel;
  headline: string;
  warnings: string[];
  do_not_consume: boolean;
  /**
   * True when nothing can make the item consumable (non-food, wild mushrooms).
   * `do_not_consume` also covers merely unverified items an expert could clear,
   * so the two must stay distinct in the UI copy.
   */
  never_consumable?: boolean;
  emergency_guidance?: string | null;
}

export interface ScanNutrition {
  basis: NutritionBasis;
  serving_size?: string | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  sugar_g?: number | null;
  sodium_mg?: number | null;
  notes: string[];
}

export interface ScanRecipe {
  title: string;
  time_minutes: number;
  difficulty: RecipeDifficulty;
  ingredients: string[];
  steps: string[];
  dietary_notes: string[];
}

export interface ScanAnalysisMeta {
  model: string;
  prompt_version: string;
  mock: boolean;
  latency_ms: number;
}

/** Mirrors contracts/scan-result.schema.json, including its optional properties. */
export interface ScanResult {
  scan_id: string;
  status: ScanStatus;
  identification: ScanIdentification;
  description: string;
  safety: ScanSafety;
  nutrition?: ScanNutrition | null;
  recipes: ScanRecipe[];
  facts: string[];
  image_url?: string | null;
  created_at: string;
  chat_available: boolean;
  analysis_meta: ScanAnalysisMeta;
}

export interface LocalImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
}

export interface AnalysisOutcome {
  result: ScanResult;
  source: 'api' | 'demo';
  fallbackReason?: 'missing_api_url' | 'network' | 'timeout' | 'invalid_response' | 'server';
}
