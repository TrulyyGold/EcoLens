import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { Card } from '../components/Card';
import { DiscoveryRow } from '../components/DiscoveryRow';
import { EmptyState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { PageHeader, Screen } from '../components/Layout';
import { useAppData } from '../context/AppDataContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing, type } from '../theme/theme';

export function FavoritesScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, loading, storageError } = useAppData();

  return (
    <Screen scroll={false} contentStyle={styles.screen}>
      <PageHeader
        eyebrow="Keep close"
        title="Favorites"
        description={`${favorites.length} saved ${favorites.length === 1 ? 'reference' : 'references'} for quick review`}
        showMark
      />
      {storageError ? <InlineNotice title="Favorites save issue" body={storageError} tone="error" /> : null}

      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading favorites" style={styles.loading}>
          <ActivityIndicator size="large" color={colors.moss} />
          <Text style={styles.loadingText}>Gathering saved references…</Text>
        </View>
      ) : (
        <FlatList
          accessibilityLabel="Favorite discoveries"
          data={favorites}
          keyExtractor={(item) => item.scan_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, favorites.length === 0 && styles.emptyList]}
          ListHeaderComponent={favorites.length > 0 ? (
            <Card tone="soft" style={styles.note}>
              <Text style={styles.noteTitle}>Saved for review—not proof</Text>
              <Text style={styles.noteBody}>A favorite preserves the original uncertainty and warnings. Recheck labels, freshness, and expert guidance when conditions change.</Text>
            </Card>
          ) : null}
          renderItem={({ item }) => (
            <DiscoveryRow
              result={item}
              favorite
              onPress={() => navigation.navigate('Result', { outcome: { result: item, source: item.analysis_meta.mock ? 'demo' : 'api' } })}
            />
          )}
          ListEmptyComponent={(
            <EmptyState
              title="No favorites yet"
              body="Open a discovery and select the heart to keep it here."
              action={<AppButton label="Start a new scan" onPress={() => navigation.navigate('Scanner')} />}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 0 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...type.body, color: colors.inkMuted },
  list: { paddingBottom: spacing.xxl + spacing.lg },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  note: { marginBottom: spacing.md },
  noteTitle: { ...type.h3, color: colors.ink },
  noteBody: { ...type.small, color: colors.inkMuted, marginTop: spacing.xs },
});
