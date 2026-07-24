import type { ScanResult } from '../types/scan';
import { parseScanResult } from './scanParser';

export type DemoKind = 'banana' | 'mushroom' | 'doritos';

const banana: ScanResult = {
  scan_id: '11111111-1111-4111-8111-111111111111',
  status: 'complete',
  identification: {
    name: 'Cavendish banana',
    scientific_name: 'Musa acuminata',
    brand: null,
    category: 'food',
    confidence: 0.97,
    confidence_label: 'high',
    evidence: ['Elongated curved fruit', 'Yellow peel with light brown speckling', 'Cluster stem visible'],
    alternatives: [{ name: 'Plantain', reason: 'Similar shape, but plantains are usually larger with a thicker, more angular peel.' }],
    requires_expert_verification: false,
  },
  description: 'A ripe banana, a naturally sweet fruit with carbohydrate, fiber, and potassium. Brown speckles often develop as starches convert to sugars.',
  safety: {
    risk_level: 'low',
    headline: 'Generally safe when fresh and handled normally',
    warnings: ['Avoid if you have a banana or latex-associated food allergy.', 'Discard fruit with mold, a fermented smell, or leaking flesh.'],
    do_not_consume: false,
    emergency_guidance: null,
  },
  nutrition: {
    basis: 'general',
    serving_size: '1 medium banana (about 118 g)',
    calories: 105,
    protein_g: 1.3,
    carbs_g: 27,
    fat_g: 0.4,
    sugar_g: 14.4,
    sodium_mg: 1,
    notes: ['General reference values, not measured from this fruit.', 'Ripeness and size change the actual values.'],
  },
  recipes: [
    {
      title: 'Cinnamon banana oat bowl',
      time_minutes: 8,
      difficulty: 'easy',
      ingredients: ['1 banana', '1/2 cup rolled oats', '1 cup milk or plant drink', 'Pinch of cinnamon', '1 tbsp seeds'],
      steps: ['Cook oats with milk until creamy.', 'Slice the banana and place it over the oats.', 'Finish with cinnamon and seeds.'],
      dietary_notes: ['Use a certified gluten-free oat if needed.', 'Choose an unsweetened plant drink for a dairy-free option.'],
    },
    {
      title: 'Two-ingredient banana pancakes',
      time_minutes: 12,
      difficulty: 'easy',
      ingredients: ['1 ripe banana', '2 eggs', 'Neutral oil for the pan'],
      steps: ['Mash the banana, then whisk in the eggs.', 'Cook small rounds in a lightly oiled pan over medium-low heat.', 'Flip once the edges set; cook through before serving.'],
      dietary_notes: ['Contains egg.'],
    },
  ],
  facts: ['Bananas are botanically berries.', 'The peel continues to darken after the fruit reaches peak sweetness.', 'Cultivated Cavendish bananas are usually seedless.'],
  image_url: null,
  created_at: '2026-07-24T10:15:00.000Z',
  chat_available: true,
  analysis_meta: { model: 'ecolens-demo', prompt_version: 'mobile-v1', mock: true, latency_ms: 420 },
};

const mushroom: ScanResult = {
  scan_id: '22222222-2222-4222-a222-222222222222',
  status: 'needs_review',
  identification: {
    name: 'Wild gilled mushroom',
    scientific_name: null,
    brand: null,
    category: 'mushroom',
    confidence: 0.42,
    confidence_label: 'low',
    evidence: ['Pale convex cap', 'Closely spaced gills', 'Slender central stem', 'Base and spore print are not visible'],
    alternatives: [
      { name: 'Destroying angel group', reason: 'Some deadly Amanita species can appear pale and require examination of the stem base and other traits.' },
      { name: 'Field mushroom', reason: 'Some edible Agaricus species look similar, but gill color and bruising are not clear here.' },
    ],
    requires_expert_verification: true,
  },
  description: 'The photo shows a pale wild mushroom, but image-only identification cannot reliably separate edible species from toxic look-alikes.',
  safety: {
    risk_level: 'high',
    headline: 'Potentially poisonous wild mushroom',
    warnings: ['Do not taste or consume it.', 'Keep it away from children and pets.', 'A photo cannot confirm mushroom edibility.'],
    do_not_consume: true,
    emergency_guidance: 'If anyone may have eaten it, contact local poison control or emergency services now. Keep a sample for identification if safe to do so.',
  },
  nutrition: null,
  recipes: [],
  facts: ['Cap color alone is not enough to identify a mushroom.', 'The stem base, habitat, gills, bruising, and spore print can all matter.', 'Cooking does not make every poisonous mushroom safe.'],
  image_url: null,
  created_at: '2026-07-24T10:20:00.000Z',
  chat_available: false,
  analysis_meta: { model: 'ecolens-demo', prompt_version: 'mobile-v1', mock: true, latency_ms: 510 },
};

const doritos: ScanResult = {
  scan_id: '33333333-3333-4333-b333-333333333333',
  status: 'complete',
  identification: {
    name: 'Nacho Cheese flavored tortilla chips',
    scientific_name: null,
    brand: 'Doritos',
    category: 'packaged_food',
    confidence: 0.99,
    confidence_label: 'high',
    evidence: ['Doritos wordmark visible', 'Red Nacho Cheese package design', 'Triangular seasoned chips pictured'],
    alternatives: [],
    requires_expert_verification: false,
  },
  description: 'A packaged corn tortilla chip snack with cheese seasoning. Package labels can vary by country and product size, so the physical label is authoritative.',
  safety: {
    risk_level: 'caution',
    headline: 'Check the package for allergens and current ingredients',
    warnings: ['Common formulations contain milk.', 'May contain other allergens depending on the manufacturing region.', 'This is a sodium-dense snack; serving size matters.'],
    do_not_consume: false,
    emergency_guidance: null,
  },
  nutrition: {
    basis: 'estimated',
    serving_size: 'About 28 g (roughly 12 chips)',
    calories: 150,
    protein_g: 2,
    carbs_g: 18,
    fat_g: 8,
    sugar_g: 1,
    sodium_mg: 210,
    notes: ['Estimated from a common US product listing.', 'Read the label on your bag for exact ingredients, allergens, serving size, and values.'],
  },
  recipes: [
    {
      title: 'Crunchy bean salad topper',
      time_minutes: 10,
      difficulty: 'easy',
      ingredients: ['2 cups chopped lettuce', '1/2 cup black beans', 'Tomato and corn', 'Small handful tortilla chips', 'Lime'],
      steps: ['Combine lettuce, beans, tomato, and corn.', 'Crush a small amount of chips over the salad.', 'Finish with lime and serve immediately.'],
      dietary_notes: ['Check the package allergen statement.', 'Use plain corn chips for a simpler ingredient option.'],
    },
  ],
  facts: ['Tortilla chips are made from corn masa.', 'Package serving sizes may not match the amount people pour.', 'Ingredient formulations can differ across markets.'],
  image_url: null,
  created_at: '2026-07-24T10:25:00.000Z',
  chat_available: true,
  analysis_meta: { model: 'ecolens-demo', prompt_version: 'mobile-v1', mock: true, latency_ms: 460 },
};

const DEMO_RESULTS: Record<DemoKind, ScanResult> = { banana, mushroom, doritos };

export function getDemoResult(kind: DemoKind): ScanResult {
  const copy: unknown = JSON.parse(JSON.stringify(DEMO_RESULTS[kind]));
  const parsed = parseScanResult(copy);
  return {
    ...parsed,
    recipes: kind === 'mushroom' ? [] : parsed.recipes,
    chat_available: kind === 'mushroom' ? false : parsed.chat_available,
    created_at: new Date().toISOString(),
  };
}

export function inferDemoKind(hint?: string): DemoKind {
  const normalized = hint?.toLowerCase() ?? '';
  if (normalized.includes('mushroom') || normalized.includes('fung')) return 'mushroom';
  if (normalized.includes('dorito') || normalized.includes('chip') || normalized.includes('package')) return 'doritos';
  return 'banana';
}
