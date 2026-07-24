import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import type { ScanResult } from '../types/scan';
import { getScanHistory, hasConfiguredApiUrl } from '../services/api';
import { readFavoriteIds, readJournal, writeFavoriteIds, writeJournal } from '../services/storage';

interface AppDataValue {
  journal: ScanResult[];
  favorites: ScanResult[];
  favoriteIds: ReadonlySet<string>;
  loading: boolean;
  syncing: boolean;
  storageError: string | null;
  syncError: string | null;
  addDiscovery: (result: ScanResult) => Promise<void>;
  toggleFavorite: (scanId: string) => Promise<void>;
  isFavorite: (scanId: string) => boolean;
  refreshHistory: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

function mergeDiscoveries(remote: ScanResult[], local: ScanResult[]): ScanResult[] {
  const byId = new Map<string, ScanResult>();
  for (const result of [...remote, ...local]) {
    if (!byId.has(result.scan_id)) byId.set(result.scan_id, result);
  }
  return [...byId.values()].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
}

export function AppDataProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [journal, setJournal] = useState<ScanResult[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [savedJournal, savedFavorites] = await Promise.all([readJournal(), readFavoriteIds()]);
      if (!active) return;
      setJournal(savedJournal);
      setFavoriteIds(new Set(savedFavorites));
      setLoading(false);

      if (!hasConfiguredApiUrl()) return;
      setSyncing(true);
      try {
        const remote = await getScanHistory();
        if (!active) return;
        const merged = mergeDiscoveries(remote, savedJournal);
        setJournal(merged);
        await writeJournal(merged);
        if (active) setSyncError(null);
      } catch {
        if (active) setSyncError('Saved discoveries are available, but server history could not be refreshed.');
      } finally {
        if (active) setSyncing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!hasConfiguredApiUrl()) {
      setSyncError(null);
      return;
    }
    setSyncing(true);
    try {
      const remote = await getScanHistory();
      const merged = mergeDiscoveries(remote, journal);
      setJournal(merged);
      await writeJournal(merged);
      setSyncError(null);
    } catch {
      setSyncError('Could not refresh server history. Check the connection and try again.');
    } finally {
      setSyncing(false);
    }
  }, [journal]);

  const addDiscovery = useCallback(async (result: ScanResult) => {
    const next = [result, ...journal.filter((item) => item.scan_id !== result.scan_id)];
    setJournal(next);
    try {
      await writeJournal(next);
      setStorageError(null);
    } catch {
      setStorageError('This discovery is visible now but could not be saved on this device.');
    }
  }, [journal]);

  const toggleFavorite = useCallback(async (scanId: string) => {
    const next = new Set(favoriteIds);
    if (next.has(scanId)) next.delete(scanId);
    else next.add(scanId);
    setFavoriteIds(next);
    try {
      await writeFavoriteIds([...next]);
      setStorageError(null);
    } catch {
      setStorageError('Favorites could not be saved on this device.');
    }
  }, [favoriteIds]);

  const value = useMemo<AppDataValue>(() => ({
    journal,
    favorites: journal.filter((item) => favoriteIds.has(item.scan_id)),
    favoriteIds,
    loading,
    syncing,
    storageError,
    syncError,
    addDiscovery,
    toggleFavorite,
    isFavorite: (scanId: string) => favoriteIds.has(scanId),
    refreshHistory,
  }), [addDiscovery, favoriteIds, journal, loading, refreshHistory, storageError, syncError, syncing, toggleFavorite]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside AppDataProvider.');
  return value;
}
