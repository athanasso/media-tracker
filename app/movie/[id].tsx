/**
 * Movie Details Screen
 */

import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { strings } from '@/src/i18n/strings';
import { getMovieDetails } from '@/src/services/api';
import { getBackdropUrl, getPosterUrl, getProfileUrl } from '@/src/services/api/client';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { CastMember } from '@/src/types';

const Colors = {
  primary: '#E50914',
  background: '#0a0a0a',
  surface: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  success: '#22c55e',
};

export default function MovieDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = parseInt(id, 10);
  const language = useSettingsStore((state) => state.language);
  const t = strings[language] || strings.en;

  // Subscribe to the actual state arrays to trigger re-renders
  const trackedMovies = useWatchlistStore((state) => state.trackedMovies);
  const addMovie = useWatchlistStore((state) => state.addMovie);
  const removeMovie = useWatchlistStore((state) => state.removeMovie);
  const markMovieWatched = useWatchlistStore((state) => state.markMovieWatched);
  const markMovieUnwatched = useWatchlistStore((state) => state.markMovieUnwatched);
  const toggleMovieFavorite = useWatchlistStore((state) => state.toggleMovieFavorite);

  const { data: movie, isLoading } = useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => getMovieDetails(movieId),
    enabled: !!movieId,
  });

  // Derive tracked/watched state from the subscribed array
  const trackedMovie = trackedMovies.find((m) => m.movieId === movieId);
  const isTracked = !!trackedMovie;
  const watched = trackedMovie?.watchedAt !== null && trackedMovie?.watchedAt !== undefined;

  const handleToggleTracking = () => {
    if (isTracked) {
      removeMovie(movieId);
    } else if (movie) {
      addMovie({ movieId, movieTitle: movie.title, posterPath: movie.poster_path });
    }
  };

  const handleToggleWatched = () => {
    if (!isTracked && movie) {
      addMovie({ movieId, movieTitle: movie.title, posterPath: movie.poster_path });
    }
    if (watched) {
      markMovieUnwatched(movieId);
    } else {
      markMovieWatched(movieId);
    }
  };

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!movie) {
    return <View style={styles.loading}><Text style={styles.errorText}>{t.movieNotFound}</Text></View>;
  }

  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A';

  return (
    <>
      <Stack.Screen options={{ title: movie.title }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Backdrop */}
        <View style={styles.backdropContainer}>
          <Image source={{ uri: getBackdropUrl(movie.backdrop_path) || '' }} style={styles.backdrop} />
          <LinearGradient colors={['transparent', Colors.background]} style={styles.gradient} />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Image source={{ uri: getPosterUrl(movie.poster_path, 'medium') || '' }} style={styles.poster} />
          <View style={styles.infoText}>
            <Text style={styles.title}>{movie.title}</Text>
            <Text style={styles.meta}>{movie.release_date?.split('-')[0]} • {runtime}</Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{movie.vote_average?.toFixed(1)}</Text>
            </View>
            {movie.genres && (
              <View style={styles.genres}>
                {movie.genres.slice(0, 3).map(g => (
                  <View key={g.id} style={styles.genreBadge}>
                    <Text style={styles.genreText}>{g.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, isTracked && styles.trackedButton]} onPress={handleToggleTracking}>
            <Ionicons name={isTracked ? 'checkmark' : 'add'} size={20} color={Colors.text} />
            <Text style={styles.actionButtonText}>{isTracked ? t.inWatchlist : t.addToWatchlist}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.watchedButton, watched && styles.watchedActiveButton]} onPress={handleToggleWatched}>
            <Ionicons name={watched ? 'eye' : 'eye-outline'} size={20} color={Colors.text} />
            <Text style={styles.actionButtonText}>{watched ? t.watched : t.markWatched}</Text>
          </TouchableOpacity>
          {isTracked && (
             <TouchableOpacity
               style={[styles.favoriteButton, trackedMovie?.isFavorite && styles.favoriteButtonActive]}
               onPress={() => toggleMovieFavorite(movieId)}
             >
               <Ionicons 
                 name={trackedMovie?.isFavorite ? "heart" : "heart-outline"} 
                 size={24} 
                 color={trackedMovie?.isFavorite ? Colors.text : Colors.text} 
               />
             </TouchableOpacity>
           )}
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.overview}</Text>
          <Text style={styles.overview}>{movie.overview || t.noDesc}</Text>
        </View>

        {/* Cast */}
        {movie.credits?.cast && movie.credits.cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.cast}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList}>
              {movie.credits.cast.slice(0, 10).map((member: CastMember) => (
                <View key={member.id} style={styles.castItem}>
                  <Image source={{ uri: getProfileUrl(member.profile_path) || '' }} style={styles.castImage} />
                  <Text style={styles.castName} numberOfLines={1}>{member.name}</Text>
                  <Text style={styles.castChar} numberOfLines={1}>{member.character}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: 16 },
  backdropContainer: { height: 250 },
  backdrop: { width: '100%', height: 250, position: 'absolute' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  infoSection: { flexDirection: 'row', padding: 16, marginTop: -80, gap: 16 },
  poster: { width: 120, height: 180, borderRadius: 8 },
  infoText: { flex: 1, justifyContent: 'flex-end' },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  meta: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  ratingText: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  genreBadge: { backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  genreText: { fontSize: 11, color: Colors.textSecondary },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: 8 },
  trackedButton: { backgroundColor: Colors.success },
  watchedButton: { backgroundColor: Colors.surface },
  watchedActiveButton: { backgroundColor: '#3b82f6' },
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
  castList: { gap: 12 },
  castItem: { width: 80, alignItems: 'center' },
  castImage: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.surface },
  castName: { fontSize: 12, color: Colors.text, marginTop: 6, textAlign: 'center' },
  castChar: { fontSize: 10, color: Colors.textSecondary, textAlign: 'center' },
});
