import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ScanResult } from '../types/scan';
import { parseScanResult } from './scanParser';

const JOURNAL_KEY = '@ecolens/journal/v1';
const FAVORITES_KEY = '@ecolens/favorites/v1';
const MAX_JOURNAL_ITEMS = 50;

async function readResults(key: string): Promise<ScanResult[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      try {
        return [parseScanResult(entry)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

export async function readJournal(): Promise<ScanResult[]> {
  return readResults(JOURNAL_KEY);
}

export async function writeJournal(results: ScanResult[]): Promise<void> {
  await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(results.slice(0, MAX_JOURNAL_ITEMS)));
}

export async function readFavoriteIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function writeFavoriteIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}
