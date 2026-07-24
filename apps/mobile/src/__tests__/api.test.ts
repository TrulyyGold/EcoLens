import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeImage,
  generateRecipes,
  getScanHistory,
  sendChatMessageDetailed,
} from '../services/api';
import { getDemoResult } from '../services/mockData';
import type { LocalImage, ScanResult } from '../types/scan';

function liveResult(kind: 'banana' | 'mushroom' | 'doritos' = 'banana'): ScanResult {
  const result = getDemoResult(kind);
  return { ...result, analysis_meta: { ...result.analysis_meta, mock: false } };
}

const image: LocalImage = {
  uri: 'file:///tmp/banana.jpg',
  width: 1200,
  height: 900,
  mimeType: 'image/jpeg',
  fileName: 'banana.jpg',
};

test('analyzeImage posts multipart field image to POST /analyze-image', async () => {
  const expected = liveResult();
  let calledUrl = '';
  let calledInit: RequestInit | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    calledUrl = String(input);
    calledInit = init;
    return new Response(JSON.stringify(expected), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const outcome = await analyzeImage(image, { apiUrl: 'https://api.example.test/', fetcher, timeoutMs: 500 });

  assert.equal(calledUrl, 'https://api.example.test/analyze-image');
  assert.equal(calledInit?.method, 'POST');
  assert.ok(calledInit?.body instanceof FormData);
  const multipart = calledInit.body as unknown as { keys: () => IterableIterator<string> };
  assert.deepEqual([...multipart.keys()], ['image']);
  assert.equal(outcome.source, 'api');
  assert.equal(outcome.result.scan_id, expected.scan_id);
});

test('sendChatMessageDetailed uses POST /chat and only {scan_id,message}', async () => {
  const result = liveResult();
  let calledUrl = '';
  let requestBody: unknown;
  const fetcher: typeof fetch = async (input, init) => {
    calledUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      scan_id: result.scan_id,
      answer: 'The curved shape and yellow peel support the match.',
      safety_notice: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const reply = await sendChatMessageDetailed(
    result,
    '  What did you see?  ',
    [{ role: 'assistant', content: 'History must not be sent.' }],
    { apiUrl: 'https://api.example.test', fetcher, timeoutMs: 500 },
  );

  assert.equal(calledUrl, 'https://api.example.test/chat');
  assert.deepEqual(requestBody, { scan_id: result.scan_id, message: 'What did you see?' });
  assert.equal(reply.source, 'api');
  assert.equal(reply.message, 'The curved shape and yellow peel support the match.');
});

test('getScanHistory calls GET /scan-history and parses every row', async () => {
  const results = [liveResult('doritos'), liveResult('banana')];
  let method: string | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.example.test/scan-history');
    method = init?.method;
    return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const parsed = await getScanHistory({ apiUrl: 'https://api.example.test/', fetcher, timeoutMs: 500 });

  assert.equal(method, 'GET');
  assert.deepEqual(parsed.map((item) => item.scan_id), results.map((item) => item.scan_id));
});

test('generateRecipes uses POST /generate-recipe with scan ID and preferences', async () => {
  const result = liveResult('banana');
  const recipe = result.recipes[0];
  assert.ok(recipe);
  let requestBody: unknown;
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(String(input), 'https://api.example.test/generate-recipe');
    assert.equal(init?.method, 'POST');
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      scan_id: result.scan_id,
      recipes: [recipe],
      suppressed: false,
      reason: null,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const generated = await generateRecipes(
    result,
    [' dairy-free ', '', 'quick'],
    { apiUrl: 'https://api.example.test', fetcher, timeoutMs: 500 },
  );

  assert.deepEqual(requestBody, { scan_id: result.scan_id, preferences: ['dairy-free', 'quick'] });
  assert.equal(generated.source, 'api');
  assert.equal(generated.suppressed, false);
  assert.deepEqual(generated.recipes, [recipe]);
});

test('mushroom recipe generation is suppressed without calling the API', async () => {
  const mushroom = liveResult('mushroom');
  let called = false;
  const fetcher: typeof fetch = async () => {
    called = true;
    throw new Error('Mushroom requests must be blocked on-device.');
  };

  const generated = await generateRecipes(mushroom, [], {
    apiUrl: 'https://api.example.test',
    fetcher,
    timeoutMs: 500,
  });

  assert.equal(called, false);
  assert.equal(generated.suppressed, true);
  assert.deepEqual(generated.recipes, []);
});
