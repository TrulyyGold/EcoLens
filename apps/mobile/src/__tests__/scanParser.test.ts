import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAnalysisResponse } from '../services/api';
import { getDemoResult } from '../services/mockData';
import { parseScanRecipe, parseScanResult, ScanResultParseError } from '../services/scanParser';

function clone(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

test('parseScanResult accepts every existing canonical demo fixture', () => {
  for (const kind of ['banana', 'mushroom', 'doritos'] as const) {
    const result = getDemoResult(kind);
    assert.deepEqual(parseScanResult(clone(result)), result);
  }
});

test('parseAnalysisResponse accepts direct and wrapped scan responses', () => {
  const result = getDemoResult('banana');
  assert.deepEqual(parseAnalysisResponse(clone(result)), result);
  assert.deepEqual(parseAnalysisResponse({ result: clone(result) }), result);
});

test('parser rejects unknown contract fields with a useful path', () => {
  const payload = clone(getDemoResult('banana')) as Record<string, unknown>;
  payload.unexpected = true;

  assert.throws(
    () => parseScanResult(payload),
    (error: unknown) => error instanceof ScanResultParseError && error.path === '$.unexpected',
  );
});

test('parseScanRecipe validates generated recipe payloads', () => {
  const recipe = getDemoResult('banana').recipes[0];
  assert.ok(recipe);
  assert.deepEqual(parseScanRecipe(clone(recipe)), recipe);

  const invalid = { ...recipe, time_minutes: 0 };
  assert.throws(() => parseScanRecipe(invalid), ScanResultParseError);
});
