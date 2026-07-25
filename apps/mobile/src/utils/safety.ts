import type { ScanResult } from '../types/scan';

export type SafetyTone = 'safe' | 'caution' | 'danger' | 'unknown';

export interface SafetyPresentation {
  tone: SafetyTone;
  title: string;
  action: string;
  shouldSuppressRecipes: boolean;
  requiresProminentWarning: boolean;
}

export function getSafetyPresentation(result: ScanResult): SafetyPresentation {
  const isMushroom = result.identification.category === 'mushroom';
  const isWildSpecies = isMushroom || result.identification.category === 'plant';
  const isHazardousNonFood = result.identification.category === 'hazardous_nonfood';
  // Never-consumable is a stronger claim than do-not-consume: no verification clears it.
  const isNeverConsumable = result.safety.never_consumable === true || isHazardousNonFood || isMushroom;
  const isDangerous = result.safety.do_not_consume || result.safety.risk_level === 'high';
  const isCaution =
    result.safety.risk_level === 'caution' ||
    result.identification.requires_expert_verification ||
    result.status === 'needs_review';
  const mustSuppressRecipes =
    isWildSpecies ||
    isHazardousNonFood ||
    result.identification.requires_expert_verification ||
    result.status === 'needs_review' ||
    result.safety.risk_level === 'unknown';

  // Checked before the generic danger branch so the copy states the stronger,
  // more useful fact instead of offering verification that cannot help.
  if (isNeverConsumable) {
    return {
      tone: 'danger',
      title: isHazardousNonFood ? 'Not food — do not eat' : 'Not safe to eat',
      action:
        result.safety.emergency_guidance ??
        (isHazardousNonFood
          ? 'This is not food. Keep it away from children and pets, and never transfer it to a drink container.'
          : 'Do not eat this. No expert consultation makes a wild mushroom safe to eat from a photo.'),
      shouldSuppressRecipes: true,
      requiresProminentWarning: true,
    };
  }

  if (isDangerous) {
    return {
      tone: 'danger',
      title: 'Do not consume',
      action: result.safety.emergency_guidance ?? 'Avoid contact or consumption and seek qualified guidance.',
      shouldSuppressRecipes: true,
      requiresProminentWarning: true,
    };
  }

  if (isWildSpecies || isCaution) {
    return {
      tone: 'caution',
      title: isWildSpecies ? 'Expert verification required' : 'Use caution',
      action: isWildSpecies
        ? 'Never eat a wild plant based on an image identification. Consult a qualified local expert.'
        : 'Review the evidence and warnings before making a health or consumption decision.',
      shouldSuppressRecipes: mustSuppressRecipes,
      requiresProminentWarning: true,
    };
  }

  if (result.safety.risk_level === 'low') {
    return {
      tone: 'safe',
      title: 'Low identified risk',
      action: 'Check freshness, allergies, preparation, and package guidance before consuming.',
      shouldSuppressRecipes: false,
      requiresProminentWarning: false,
    };
  }

  return {
    tone: 'unknown',
    title: 'Safety is uncertain',
    action: 'Do not rely on this identification for a safety-critical decision.',
    shouldSuppressRecipes: true,
    requiresProminentWarning: true,
  };
}
