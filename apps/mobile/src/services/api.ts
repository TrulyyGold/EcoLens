import type { AnalysisOutcome, LocalImage, ScanRecipe, ScanResult } from '../types/scan';
import { getSafetyPresentation } from '../utils/safety';
import { getDemoResult, inferDemoKind, type DemoKind } from './mockData';
import { parseScanRecipe, parseScanResult, ScanResultParseError } from './scanParser';

const DEFAULT_TIMEOUT_MS = 18_000;

type Fetcher = typeof fetch;

type FallbackReason = NonNullable<AnalysisOutcome['fallbackReason']>;

interface AnalyzeOptions {
  apiUrl?: string | null;
  demoKind?: DemoKind;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

class ApiFailure extends Error {
  constructor(readonly reason: FallbackReason, message: string) {
    super(message);
    this.name = 'ApiFailure';
  }
}

function configuredApiUrl(): string | null {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  return value ? value.replace(/\/+$/, '') : null;
}

export function hasConfiguredApiUrl(): boolean {
  return configuredApiUrl() !== null;
}

export function parseAnalysisResponse(payload: unknown): ScanResult {
  if (typeof payload === 'object' && payload !== null && 'result' in payload) {
    return parseScanResult((payload as { result: unknown }).result);
  }
  return parseScanResult(payload);
}

function fallback(kind: DemoKind, reason: FallbackReason): AnalysisOutcome {
  return { result: getDemoResult(kind), source: 'demo', fallbackReason: reason };
}

export async function analyzeImage(image: LocalImage | undefined, options: AnalyzeOptions = {}): Promise<AnalysisOutcome> {
  const hint = options.demoKind ?? inferDemoKind(image?.fileName ?? image?.uri);
  if (!image && options.demoKind) {
    return { result: getDemoResult(options.demoKind), source: 'demo' };
  }
  const apiUrl = apiUrlFromOption(options.apiUrl);
  if (!apiUrl || !image) {
    return fallback(hint, !apiUrl ? 'missing_api_url' : 'network');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const body = new FormData();
    body.append('image', {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    } as unknown as Blob);

    const response = await (options.fetcher ?? fetch)(`${apiUrl}/analyze-image`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiFailure('server', `Analysis failed with status ${response.status}.`);
    }
    const payload: unknown = await response.json();
    return { result: parseAnalysisResponse(payload), source: 'api' };
  } catch (error) {
    if (error instanceof ApiFailure) return fallback(hint, error.reason);
    if (error instanceof ScanResultParseError || error instanceof SyntaxError) return fallback(hint, 'invalid_response');
    if (error instanceof Error && error.name === 'AbortError') return fallback(hint, 'timeout');
    return fallback(hint, 'network');
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatReply {
  message: string;
  safetyNotice: string | null;
  source: 'api' | 'local';
  liveError?: string;
}

export interface RecipeGenerationResult {
  scanId: string;
  recipes: ScanRecipe[];
  suppressed: boolean;
  reason: string | null;
  source: 'api' | 'local';
}

interface RequestOptions {
  apiUrl?: string | null;
  fetcher?: Fetcher;
  timeoutMs?: number;
}

function apiUrlFromOption(value: string | null | undefined): string | null {
  const resolved = value === undefined ? configuredApiUrl() : value?.trim() || null;
  return resolved ? resolved.replace(/\/+$/, '') : null;
}

function objectPayload(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} response was invalid.`);
  }
  return value as Record<string, unknown>;
}

function localChatAnswer(result: ScanResult, question: string): string {
  const lower = question.toLowerCase();
  if (result.identification.category === 'mushroom') {
    if (lower.includes('eat') || lower.includes('edible') || lower.includes('cook')) {
      return 'Do not eat or cook this wild mushroom. A photo cannot establish edibility, and toxic look-alikes can be deadly. Ask a qualified local mycologist; contact poison control now if it may have been eaten.';
    }
    return `This scan only supports “${result.identification.name}” as a tentative description. Key missing evidence includes the stem base, habitat, bruising, and a spore print. Do not consume it.`;
  }
  if (lower.includes('nutrition') || lower.includes('calorie') || lower.includes('protein')) {
    if (!result.nutrition) return 'Nutrition information is unavailable for this discovery.';
    return `The ${result.nutrition.basis} nutrition entry lists ${result.nutrition.calories ?? 'unknown'} calories for ${result.nutrition.serving_size ?? 'the noted serving'}. These values are not a measurement of the photographed item; check the provenance note.`;
  }
  if (lower.includes('safe') || lower.includes('allerg')) {
    return `${result.safety.headline}. ${result.safety.warnings.join(' ')}`;
  }
  return `I can explain the identification, visible evidence, safety warnings, nutrition provenance, or ideas for ${result.identification.name}. This offline answer is limited to this scan.`;
}

/** POST /chat with exactly the backend contract: { scan_id, message }. */
export async function sendChatMessageDetailed(
  result: ScanResult,
  question: string,
  _history: ChatTurn[] = [],
  options: RequestOptions = {},
): Promise<ChatReply> {
  const message = question.trim();
  if (!message) throw new Error('Enter a question before sending.');

  const apiUrl = apiUrlFromOption(options.apiUrl);
  if (!apiUrl || result.analysis_meta.mock) {
    return { message: localChatAnswer(result, message), safetyNotice: null, source: 'local' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetcher ?? fetch)(`${apiUrl}/chat`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan_id: result.scan_id, message }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Chat request failed with status ${response.status}.`);
    const payload = objectPayload(await response.json(), 'Chat');
    if (payload.scan_id !== result.scan_id || typeof payload.answer !== 'string' || !payload.answer.trim()) {
      throw new Error('Chat response was invalid.');
    }
    if (payload.safety_notice !== undefined && payload.safety_notice !== null && typeof payload.safety_notice !== 'string') {
      throw new Error('Chat response was invalid.');
    }
    return {
      message: payload.answer,
      safetyNotice: typeof payload.safety_notice === 'string' ? payload.safety_notice : null,
      source: 'api',
    };
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError'
      ? 'Live chat timed out. Showing an answer grounded in the saved scan.'
      : 'Live chat was unavailable. Showing an answer grounded in the saved scan.';
    return {
      message: localChatAnswer(result, message),
      safetyNotice: null,
      source: 'local',
      liveError: reason,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendChatMessage(result: ScanResult, question: string, history: ChatTurn[] = []): Promise<string> {
  return (await sendChatMessageDetailed(result, question, history)).message;
}

/** GET /scan-history, returning only canonical scan results. */
export async function getScanHistory(options: RequestOptions = {}): Promise<ScanResult[]> {
  const apiUrl = apiUrlFromOption(options.apiUrl);
  if (!apiUrl) throw new Error('No API URL is configured for history sync.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetcher ?? fetch)(`${apiUrl}/scan-history`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`History request failed with status ${response.status}.`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error('History response was invalid.');
    return payload.map((item) => parseScanResult(item));
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseRecipeGenerationResponse(value: unknown, result: ScanResult): RecipeGenerationResult {
  const payload = objectPayload(value, 'Recipe');
  if (typeof payload.scan_id !== 'string' || payload.scan_id !== result.scan_id || typeof payload.suppressed !== 'boolean') {
    throw new Error('Recipe response was invalid.');
  }
  if (!Array.isArray(payload.recipes)) throw new Error('Recipe response was invalid.');
  if (payload.reason !== undefined && payload.reason !== null && typeof payload.reason !== 'string') {
    throw new Error('Recipe response was invalid.');
  }

  const safety = getSafetyPresentation(result);
  const suppressed = payload.suppressed || safety.shouldSuppressRecipes;
  return {
    scanId: payload.scan_id,
    recipes: suppressed ? [] : payload.recipes.map((recipe, index) => parseScanRecipe(recipe, `$.recipes[${index}]`)),
    suppressed,
    reason: typeof payload.reason === 'string'
      ? payload.reason
      : safety.shouldSuppressRecipes
        ? safety.action
        : null,
    source: 'api',
  };
}

/** POST /generate-recipe with exactly the backend contract: { scan_id, preferences }. */
export async function generateRecipes(
  result: ScanResult,
  preferences: string[] = [],
  options: RequestOptions = {},
): Promise<RecipeGenerationResult> {
  const safety = getSafetyPresentation(result);
  if (safety.shouldSuppressRecipes) {
    return {
      scanId: result.scan_id,
      recipes: [],
      suppressed: true,
      reason: safety.action,
      source: 'local',
    };
  }

  const normalizedPreferences = preferences.map((preference) => preference.trim()).filter(Boolean).slice(0, 10);
  const apiUrl = apiUrlFromOption(options.apiUrl);
  if (!apiUrl || result.analysis_meta.mock) {
    return {
      scanId: result.scan_id,
      recipes: result.recipes,
      suppressed: false,
      reason: null,
      source: 'local',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const response = await (options.fetcher ?? fetch)(`${apiUrl}/generate-recipe`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan_id: result.scan_id, preferences: normalizedPreferences }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Recipe request failed with status ${response.status}.`);
    return parseRecipeGenerationResponse(await response.json(), result);
  } finally {
    clearTimeout(timeoutId);
  }
}
