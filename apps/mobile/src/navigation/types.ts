import type { AnalysisOutcome, LocalImage, ScanResult } from '../types/scan';

export type MainTabParamList = {
  Home: undefined;
  Journal: undefined;
  Favorites: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Scanner: { launchLibrary?: boolean } | undefined;
  Analyze: { image?: LocalImage; demoKind?: 'banana' | 'mushroom' | 'doritos' };
  Result: { outcome: AnalysisOutcome; image?: LocalImage };
  Chat: { result: ScanResult };
};
