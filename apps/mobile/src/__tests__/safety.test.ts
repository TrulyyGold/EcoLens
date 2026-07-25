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

test('hazardous non-food reads as definite, not as an unresolved identification', () => {
  const result = getDemoResult('bleach');
  const presentation = getSafetyPresentation(result);

  assert.equal(presentation.tone, 'danger');
  assert.equal(presentation.title, 'Not food — do not eat');
  assert.equal(presentation.shouldSuppressRecipes, true);
  assert.equal(result.safety.risk_level, 'high');
  // The whole point: no expert-review framing on an obvious hazard.
  assert.equal(result.identification.requires_expert_verification, false);
  assert.ok(!presentation.title.toLowerCase().includes('expert'));
});

test('mushroom copy does not offer expert guidance as a path to eating it', () => {
  const presentation = getSafetyPresentation(getDemoResult('mushroom'));

  assert.equal(presentation.tone, 'danger');
  assert.equal(presentation.title, 'Not safe to eat');
  // Regression: previously read "Expert verification required", implying that
  // with expert guidance the mushroom becomes edible.
  assert.notEqual(presentation.title, 'Expert verification required');
});

test('genuinely unidentified items still offer the expert path', () => {
  const base = getDemoResult('banana');
  const unidentified = {
    ...base,
    status: 'needs_review' as const,
    identification: { ...base.identification, category: 'unknown' as const, requires_expert_verification: true },
    safety: { ...base.safety, risk_level: 'unknown' as const, do_not_consume: true },
  };

  const presentation = getSafetyPresentation(unidentified);

  // Being decisive about known hazards must not erase real uncertainty.
  assert.equal(presentation.tone, 'danger');
  assert.equal(presentation.title, 'Do not consume');
  assert.notEqual(presentation.title, 'Not food — do not eat');
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
