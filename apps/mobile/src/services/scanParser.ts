import type {
  ConfidenceLabel,
  IdentificationAlternative,
  NutritionBasis,
  RecipeDifficulty,
  RiskLevel,
  ScanAnalysisMeta,
  ScanCategory,
  ScanIdentification,
  ScanNutrition,
  ScanRecipe,
  ScanResult,
  ScanSafety,
  ScanStatus,
} from '../types/scan';

type JsonObject = Record<string, unknown>;

export class ScanResultParseError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'ScanResultParseError';
    this.path = path;
  }
}

function objectAt(value: unknown, path: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ScanResultParseError(path, 'expected an object');
  }
  return value as JsonObject;
}

function assertKeys(value: JsonObject, required: readonly string[], optional: readonly string[], path: string): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      throw new ScanResultParseError(`${path}.${key}`, 'is required');
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ScanResultParseError(`${path}.${key}`, 'is not allowed by the contract');
    }
  }
}

function stringAt(value: unknown, path: string, minLength = 0): string {
  if (typeof value !== 'string' || value.length < minLength) {
    throw new ScanResultParseError(path, `expected a string${minLength > 0 ? ` with at least ${minLength} character` : ''}`);
  }
  return value;
}

function nullableStringAt(value: unknown, path: string): string | null {
  if (value === null) return null;
  return stringAt(value, path);
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new ScanResultParseError(path, 'expected a boolean');
  return value;
}

function numberAt(value: unknown, path: string, min: number, max = Number.POSITIVE_INFINITY): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new ScanResultParseError(path, `expected a number from ${min} to ${max === Number.POSITIVE_INFINITY ? 'infinity' : max}`);
  }
  return value;
}

function integerAt(value: unknown, path: string, min: number): number {
  const parsed = numberAt(value, path, min);
  if (!Number.isInteger(parsed)) throw new ScanResultParseError(path, 'expected an integer');
  return parsed;
}

function enumAt<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ScanResultParseError(path, `expected one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

function arrayAt<T>(
  value: unknown,
  path: string,
  parseItem: (item: unknown, itemPath: string) => T,
  limits: { min?: number; max?: number } = {},
): T[] {
  if (!Array.isArray(value)) throw new ScanResultParseError(path, 'expected an array');
  if (limits.min !== undefined && value.length < limits.min) {
    throw new ScanResultParseError(path, `expected at least ${limits.min} item(s)`);
  }
  if (limits.max !== undefined && value.length > limits.max) {
    throw new ScanResultParseError(path, `expected at most ${limits.max} item(s)`);
  }
  return value.map((item, index) => parseItem(item, `${path}[${index}]`));
}

function stringArrayAt(value: unknown, path: string, limits: { min?: number; max?: number } = {}): string[] {
  return arrayAt(value, path, (item, itemPath) => stringAt(item, itemPath), limits);
}

function parseAlternative(value: unknown, path: string): IdentificationAlternative {
  const item = objectAt(value, path);
  assertKeys(item, ['name', 'reason'], [], path);
  return {
    name: stringAt(item.name, `${path}.name`),
    reason: stringAt(item.reason, `${path}.reason`),
  };
}

function parseIdentification(value: unknown, path: string): ScanIdentification {
  const item = objectAt(value, path);
  assertKeys(
    item,
    ['name', 'category', 'confidence', 'confidence_label', 'evidence', 'alternatives', 'requires_expert_verification'],
    ['scientific_name', 'brand'],
    path,
  );
  const parsed: ScanIdentification = {
    name: stringAt(item.name, `${path}.name`, 1),
    category: enumAt<ScanCategory>(item.category, ['food', 'packaged_food', 'plant', 'mushroom', 'unknown'], `${path}.category`),
    confidence: numberAt(item.confidence, `${path}.confidence`, 0, 1),
    confidence_label: enumAt<ConfidenceLabel>(item.confidence_label, ['high', 'moderate', 'low'], `${path}.confidence_label`),
    evidence: stringArrayAt(item.evidence, `${path}.evidence`, { max: 5 }),
    alternatives: arrayAt(item.alternatives, `${path}.alternatives`, parseAlternative, { max: 3 }),
    requires_expert_verification: booleanAt(item.requires_expert_verification, `${path}.requires_expert_verification`),
  };
  if (Object.prototype.hasOwnProperty.call(item, 'scientific_name')) {
    parsed.scientific_name = nullableStringAt(item.scientific_name, `${path}.scientific_name`);
  }
  if (Object.prototype.hasOwnProperty.call(item, 'brand')) {
    parsed.brand = nullableStringAt(item.brand, `${path}.brand`);
  }
  return parsed;
}

function parseSafety(value: unknown, path: string): ScanSafety {
  const item = objectAt(value, path);
  assertKeys(item, ['risk_level', 'headline', 'warnings', 'do_not_consume'], ['emergency_guidance'], path);
  const parsed: ScanSafety = {
    risk_level: enumAt<RiskLevel>(item.risk_level, ['low', 'caution', 'high', 'unknown'], `${path}.risk_level`),
    headline: stringAt(item.headline, `${path}.headline`),
    warnings: stringArrayAt(item.warnings, `${path}.warnings`, { min: 1 }),
    do_not_consume: booleanAt(item.do_not_consume, `${path}.do_not_consume`),
  };
  if (Object.prototype.hasOwnProperty.call(item, 'emergency_guidance')) {
    parsed.emergency_guidance = nullableStringAt(item.emergency_guidance, `${path}.emergency_guidance`);
  }
  return parsed;
}

function optionalNonNegativeNumber(item: JsonObject, key: string, path: string): number | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(item, key)) return undefined;
  const value = item[key];
  return value === null ? null : numberAt(value, `${path}.${key}`, 0);
}

function parseNutrition(value: unknown, path: string): ScanNutrition | null {
  if (value === null) return null;
  const item = objectAt(value, path);
  assertKeys(
    item,
    ['basis', 'notes'],
    ['serving_size', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'sodium_mg'],
    path,
  );
  const parsed: ScanNutrition = {
    basis: enumAt<NutritionBasis>(item.basis, ['label', 'estimated', 'general', 'unavailable'], `${path}.basis`),
    notes: stringArrayAt(item.notes, `${path}.notes`),
  };
  if (Object.prototype.hasOwnProperty.call(item, 'serving_size')) {
    parsed.serving_size = nullableStringAt(item.serving_size, `${path}.serving_size`);
  }
  const numericKeys = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'sodium_mg'] as const;
  for (const key of numericKeys) {
    const parsedValue = optionalNonNegativeNumber(item, key, path);
    if (parsedValue !== undefined) parsed[key] = parsedValue;
  }
  return parsed;
}

export function parseScanRecipe(value: unknown, path = '$'): ScanRecipe {
  const item = objectAt(value, path);
  assertKeys(item, ['title', 'time_minutes', 'difficulty', 'ingredients', 'steps', 'dietary_notes'], [], path);
  return {
    title: stringAt(item.title, `${path}.title`),
    time_minutes: integerAt(item.time_minutes, `${path}.time_minutes`, 1),
    difficulty: enumAt<RecipeDifficulty>(item.difficulty, ['easy', 'medium'], `${path}.difficulty`),
    ingredients: stringArrayAt(item.ingredients, `${path}.ingredients`, { min: 1 }),
    steps: stringArrayAt(item.steps, `${path}.steps`, { min: 1 }),
    dietary_notes: stringArrayAt(item.dietary_notes, `${path}.dietary_notes`),
  };
}

function parseAnalysisMeta(value: unknown, path: string): ScanAnalysisMeta {
  const item = objectAt(value, path);
  assertKeys(item, ['model', 'prompt_version', 'mock', 'latency_ms'], [], path);
  return {
    model: stringAt(item.model, `${path}.model`),
    prompt_version: stringAt(item.prompt_version, `${path}.prompt_version`),
    mock: booleanAt(item.mock, `${path}.mock`),
    latency_ms: integerAt(item.latency_ms, `${path}.latency_ms`, 0),
  };
}

function uuidAt(value: unknown, path: string): string {
  const parsed = stringAt(value, path);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed)) {
    throw new ScanResultParseError(path, 'expected a UUID');
  }
  return parsed;
}

function dateTimeAt(value: unknown, path: string): string {
  const parsed = stringAt(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(parsed) || Number.isNaN(Date.parse(parsed))) {
    throw new ScanResultParseError(path, 'expected an ISO date-time');
  }
  return parsed;
}

export function parseScanResult(value: unknown): ScanResult {
  const item = objectAt(value, '$');
  assertKeys(
    item,
    ['scan_id', 'status', 'identification', 'description', 'safety', 'recipes', 'facts', 'created_at', 'chat_available', 'analysis_meta'],
    ['nutrition', 'image_url'],
    '$',
  );
  const parsed: ScanResult = {
    scan_id: uuidAt(item.scan_id, '$.scan_id'),
    status: enumAt<ScanStatus>(item.status, ['complete', 'needs_review'], '$.status'),
    identification: parseIdentification(item.identification, '$.identification'),
    description: stringAt(item.description, '$.description', 1),
    safety: parseSafety(item.safety, '$.safety'),
    recipes: arrayAt(item.recipes, '$.recipes', parseScanRecipe, { max: 3 }),
    facts: stringArrayAt(item.facts, '$.facts', { max: 5 }),
    created_at: dateTimeAt(item.created_at, '$.created_at'),
    chat_available: booleanAt(item.chat_available, '$.chat_available'),
    analysis_meta: parseAnalysisMeta(item.analysis_meta, '$.analysis_meta'),
  };
  if (Object.prototype.hasOwnProperty.call(item, 'nutrition')) {
    parsed.nutrition = parseNutrition(item.nutrition, '$.nutrition');
  }
  if (Object.prototype.hasOwnProperty.call(item, 'image_url')) {
    parsed.image_url = nullableStringAt(item.image_url, '$.image_url');
  }
  return parsed;
}
