import assert from 'node:assert/strict';
import test from 'node:test';

import { getDemoResult } from '../services/mockData';
import { getSafetyPresentation } from '../utils/safety';

test('mushroom fixture never exposes recipes or chat', () => {
  const result = getDemoResult('mushroom');

  assert.deepEqual(result.recipes, []);
  assert.equal(result.chat_available, false);
  assert.equal(result.safety.do_not_consume, true);
  assert.equal(result.identification.requires_expert_verification, true);
  assert.equal(getSafetyPresentation(result).shouldSuppressRecipes, true);
});

test('safe food allows recipes while packaged-food caution remains prominent', () => {
  const banana = getDemoResult('banana');
  const packagedFood = getDemoResult('doritos');

  assert.equal(getSafetyPresentation(banana).tone, 'safe');
  assert.equal(getSafetyPresentation(banana).shouldSuppressRecipes, false);
  assert.equal(getSafetyPresentation(packagedFood).tone, 'caution');
  assert.equal(getSafetyPresentation(packagedFood).shouldSuppressRecipes, false);
});

test('unknown safety state suppresses recipes', () => {
  const base = getDemoResult('banana');
  const unknown = {
    ...base,
    safety: { ...base.safety, risk_level: 'unknown' as const },
  };

  const presentation = getSafetyPresentation(unknown);
  assert.equal(presentation.tone, 'unknown');
  assert.equal(presentation.shouldSuppressRecipes, true);
  assert.equal(presentation.requiresProminentWarning, true);
});
