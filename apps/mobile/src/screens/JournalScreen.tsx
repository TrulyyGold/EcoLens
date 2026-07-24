import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { DiscoveryRow } from '../components/DiscoveryRow';
import { EmptyState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { PageHeader, Screen } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing, type } from '../theme/theme';

export function JournalScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { journal, loading, syncing, storageError, syncError, refreshHistory, isFavorite } = useAppData();

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <PageHeader
        eyebrow="Your field notes"
        title="Discovery journal"
        description={`${journal.length} ${journal.length === 1 ? 'discovery' : 'discoveries'} saved locally`}
        action={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh scan history"
            disabled={syncing}
            onPress={() => void refreshHistory()}
            style={({ pressed }) => [styles.refresh, { opacity: pressed || syncing ? 0.55 : 1 }]}
          >
            {syncing ? <ActivityIndicator color={colors.forest} /> : <Text style={styles.refreshGlyph}>↻</Text>}
          </Pressable>
        )}
      />

      {storageError ? <InlineNotice title="Device save issue" body={storageError} tone="error" /> : null}
      {syncError ? (
        <View>
          <InlineNotice title="Could not refresh history" body={syncError} tone="error" />
          <AppButton label="Retry history refresh" variant="secondary" compact loading={syncing} onPress={() => void refreshHistory()} />
        </View>
      ) : null}

      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading journal" style={styles.loading}>
          <ActivityIndicator size="large" color={colors.moss} />
          <Text style={styles.loadingTitle}>Opening your journal…</Text>
          <Text style={styles.loadingBody}>Checking discoveries stored on this device.</Text>
        </View>
      ) : (
        <FlatList
          accessibilityLabel="Saved discovery journal"
          data={journal}
          keyExtractor={(item) => item.scan_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, journal.length === 0 && styles.emptyList]}
          refreshing={syncing}
          onRefresh={() => void refreshHistory()}
          renderItem={({ item }) => (
            <DiscoveryRow
              result={item}
              favorite={isFavorite(item.scan_id)}
              onPress={() => navigation.navigate('Result', { outcome: { result: item, source: item.analysis_meta.mock ? 'demo' : 'api' } })}
            />
          )}
          ListHeaderComponent={journal.length > 0 ? (
            <View style={styles.listIntro}>
              <Text style={styles.listIntroTitle}>Newest first</Text>
              <Text style={styles.listIntroBody}>Pull down to refresh from the configured EcoLens service.</Text>
            </View>
          ) : null}
          ListEmptyComponent={(
            <EmptyState
              title="No discoveries yet"
              body="Take a clear photo to start an evidence-led journal entry."
              action={<AppButton label="Start a scan" onPress={() => navigation.navigate('Scanner')} />}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 0 },
  refresh: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mossPale, borderWidth: 1, borderColor: colors.line },
  refreshGlyph: { color: colors.forest, fontSize: 27, lineHeight: 30 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl },
  loadingTitle: { ...type.h3, color: colors.ink, marginTop: spacing.md },
  loadingBody: { ...type.body, color: colors.inkMuted, marginTop: spacing.xs },
  list: { paddingBottom: spacing.xxl + spacing.lg },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  listIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, backgroundColor: colors.cream, borderRadius: radii.md, padding: spacing.sm, marginBottom: spacing.md },
  listIntroTitle: { ...type.bodyStrong, color: colors.ink },
  listIntroBody: { ...type.small, color: colors.inkMuted, textAlign: 'right', flex: 1 },
});
