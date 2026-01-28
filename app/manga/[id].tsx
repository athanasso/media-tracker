/**
 * Manga Details Screen
 */

import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { strings } from '@/src/i18n/strings';
import { getMangaDetails } from '@/src/services/api/manga';
import { useSettingsStore, useWatchlistStore } from '@/src/store';

const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#22c55e',
  blue: '#3b82f6',
};

export default function MangaDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mangaId = parseInt(id, 10);
  const language = useSettingsStore((state) => state.language);
  const t = strings[language] || strings.en;

  // Subscribe to store
  const trackedManga = useWatchlistStore((state) => state.trackedManga);
  const addManga = useWatchlistStore((state) => state.addManga);
  const removeManga = useWatchlistStore((state) => state.removeManga);
  const updateMangaStatus = useWatchlistStore((state) => state.updateMangaStatus);
  const updateMangaProgress = useWatchlistStore((state) => state.updateMangaProgress);
  const toggleMangaFavorite = useWatchlistStore((state) => state.toggleMangaFavorite);

  // Fetch details
  const { data: manga, isLoading } = useQuery({
    queryKey: ['manga', mangaId],
    queryFn: () => getMangaDetails(mangaId),
    enabled: !!mangaId,
  });

  // Tracked state
  const trackedItem = trackedManga.find((m) => m.id === mangaId);
  const isTracked = !!trackedItem;
  const isRead = trackedItem?.status === 'completed';
  const isReading = trackedItem?.status === 'watching';

  const title = manga ? (manga.title.english || manga.title.romaji || manga.title.native || '') : '';

  const handleToggleTracking = () => {
    if (isTracked) {
      removeManga(mangaId);
    } else if (manga) {
      addManga({
        id: manga.id,
        title: title || 'Unknown Title',
        coverUrl: manga.coverImage?.large || manga.coverImage?.medium || null,
        totalChapters: manga.chapters || 0,
        totalVolumes: manga.volumes || 0,
        currentChapter: 0,
        currentVolume: 0,
      });
    }
  };

  const handleToggleRead = () => {
    if (!isTracked && manga) {
       addManga({
        id: manga.id,
        title: title || 'Unknown Title',
        coverUrl: manga.coverImage?.large || manga.coverImage?.medium || null,
        totalChapters: manga.chapters || 0,
        totalVolumes: manga.volumes || 0,
        currentChapter: 0,
        currentVolume: 0,
      });
      updateMangaStatus(mangaId, 'completed');
    } else {
      if (isRead) {
        updateMangaStatus(mangaId, 'plan_to_watch');
      } else {
        updateMangaStatus(mangaId, 'completed');
      }
    }
  };
  
  const handleToggleReading = () => {
      if (!isTracked && manga) {
           addManga({
            id: manga.id,
            title: title || 'Unknown Title',
            coverUrl: manga.coverImage?.large || manga.coverImage?.medium || null,
            totalChapters: manga.chapters || 0,
            totalVolumes: manga.volumes || 0,
            currentChapter: 0,
            currentVolume: 0,
          });
          updateMangaStatus(mangaId, 'watching');
      } else {
          if (isReading) {
              updateMangaStatus(mangaId, 'plan_to_watch');
          } else {
              updateMangaStatus(mangaId, 'watching');
          }
      }
  }

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!manga) {
    return <View style={styles.loading}><Text style={styles.errorText}>{t.movieNotFound}</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: title }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Image 
            source={{ uri: manga.coverImage?.large || manga.coverImage?.medium || 'https://via.placeholder.com/128x192?text=No+Cover' }} 
            style={styles.poster} 
            resizeMode="cover"
          />
          <View style={styles.infoText}>
            <Text style={styles.title}>{title}</Text>
             {/* Native Title */}
            {manga.title.native && manga.title.native !== title && (
                 <Text style={[styles.meta, { fontSize: 13 }]}>{manga.title.native}</Text>
            )}

            <Text style={styles.meta}>
                {manga.startDate?.year || 'TBA'}
                {manga.chapters ? ` • ${manga.chapters} ${t.chapters}` : ''}
                {manga.volumes ? ` • ${manga.volumes} ${t.volumes}` : ''}
            </Text>
            {manga.averageScore && (
                <View style={styles.rating}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{(manga.averageScore / 10).toFixed(1)}</Text>
                </View>
            )}
             {/* Status logic */}
             <Text style={[styles.meta, { color: Colors.primary, marginTop: 6, fontWeight: 'bold' }]}>
                 {manga.status}
             </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, isTracked && styles.trackedButton]} onPress={handleToggleTracking}>
            <Ionicons name={isTracked ? 'checkmark' : 'add'} size={20} color={Colors.text} />
            <Text style={styles.actionButtonText}>{isTracked ? t.inWatchlist : t.addToWatchlist}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.readButton, isRead && styles.readActiveButton]} onPress={handleToggleRead}>
            <Ionicons name={isRead ? 'book' : 'book-outline'} size={20} color={Colors.text} />
            <Text style={styles.actionButtonText}>{isRead ? t.read : t.markRead}</Text>
          </TouchableOpacity>

           {/* Reading Button */}
           {!isRead && (
             <TouchableOpacity style={[styles.actionButton, styles.readButton, isReading && styles.readingActiveButton]} onPress={handleToggleReading}>
                <Ionicons name={isReading ? 'glasses' : 'glasses-outline'} size={20} color={Colors.text} />
                <Text style={styles.actionButtonText}>{isReading ? t.reading : t.startReading}</Text>
             </TouchableOpacity>
           )}

          {isTracked && (
             <TouchableOpacity
               style={[styles.favoriteButton, trackedItem?.isFavorite && styles.favoriteButtonActive]}
               onPress={() => toggleMangaFavorite(mangaId)}
             >
               <Ionicons 
                 name={trackedItem?.isFavorite ? "heart" : "heart-outline"} 
                 size={24} 
                 color={trackedItem?.isFavorite ? Colors.text : Colors.text} 
               />
             </TouchableOpacity>
           )}
        </View>

        {/* Progress Section */}
        {isTracked && trackedItem && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.progress || 'Progress'}</Text>
            
            {/* Chapters */}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{t.chapters}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity onPress={() => updateMangaProgress(mangaId, Math.max(0, trackedItem.currentChapter - 1), trackedItem.currentVolume)}>
                  <Ionicons name="remove-circle-outline" size={32} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.counterText}>
                  {trackedItem.currentChapter} <Text style={styles.counterSubText}>/ {manga.chapters || '?'}</Text>
                </Text>
                <TouchableOpacity onPress={() => updateMangaProgress(mangaId, (manga.chapters && trackedItem.currentChapter >= manga.chapters) ? trackedItem.currentChapter : trackedItem.currentChapter + 1, trackedItem.currentVolume)}>
                  <Ionicons name="add-circle-outline" size={32} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Volumes */}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{t.volumes}</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity onPress={() => updateMangaProgress(mangaId, trackedItem.currentChapter, Math.max(0, trackedItem.currentVolume - 1))}>
                  <Ionicons name="remove-circle-outline" size={32} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.counterText}>
                  {trackedItem.currentVolume} <Text style={styles.counterSubText}>/ {manga.volumes || '?'}</Text>
                </Text>
                <TouchableOpacity onPress={() => updateMangaProgress(mangaId, trackedItem.currentChapter, (manga.volumes && trackedItem.currentVolume >= manga.volumes) ? trackedItem.currentVolume : trackedItem.currentVolume + 1)}>
                  <Ionicons name="add-circle-outline" size={32} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.overview}</Text>
           {/* Strip HTML */}
          <Text style={styles.overview}>
              {manga.description?.replace(/<[^>]*>?/gm, '') || t.noDesc}
          </Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: 16 },
  infoSection: { flexDirection: 'row', padding: 16, marginTop: 10, gap: 16 },
  poster: { width: 120, height: 180, borderRadius: 8, backgroundColor: Colors.surface },
  infoText: { flex: 1, justifyContent: 'flex-start' },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  meta: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  ratingText: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: '30%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8 },
  trackedButton: { backgroundColor: Colors.success },
  readButton: { backgroundColor: Colors.surface },
  readActiveButton: { backgroundColor: Colors.blue },
  readingActiveButton: { backgroundColor: Colors.success },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  favoriteButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
  overview: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressLabel: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  counterContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterText: { fontSize: 18, color: Colors.text, fontWeight: 'bold' },
  counterSubText: { fontSize: 14, color: Colors.textSecondary, fontWeight: 'normal' },
});
