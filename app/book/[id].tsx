/**
 * Book Details Screen
 */

import { strings } from '@/src/i18n/strings';
import { getBookDetails } from '@/src/services/api/books';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { AppColors } from '@/src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';

// Use centralized colors
const Colors = AppColors;

export default function BookDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Book IDs are strings (Google Books)
  const bookId = id; 
  const language = useSettingsStore((state) => state.language);
  const t = strings[language] || strings.en;

  // Subscribe to store
  const trackedBooks = useWatchlistStore((state) => state.trackedBooks);
  const addBook = useWatchlistStore((state) => state.addBook);
  const removeBook = useWatchlistStore((state) => state.removeBook);
  const updateBookStatus = useWatchlistStore((state) => state.updateBookStatus);
  const toggleBookFavorite = useWatchlistStore((state) => state.toggleBookFavorite);

  // Fetch details
  const { data: book, isLoading } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBookDetails(bookId),
    enabled: !!bookId,
  });

  // Tracked state
  const trackedBook = trackedBooks.find((b) => b.id === bookId);
  const isTracked = !!trackedBook;
  const isRead = trackedBook?.status === 'completed';
  const isReading = trackedBook?.status === 'watching';

  const handleToggleTracking = () => {
    if (isTracked) {
      removeBook(bookId);
    } else if (book) {
      addBook({
        id: book.id,
        title: book.title,
        authors: book.authors ?? [],
        coverUrl: book.imageLinks?.thumbnail || null,
        totalPages: book.pageCount,
        currentPage: 0,
      });
    }
  };

  const handleToggleRead = () => {
    if (!isTracked && book) {
      // Add first as completed
      addBook({
        id: book.id,
        title: book.title,
        authors: book.authors ?? [],
        coverUrl: book.imageLinks?.thumbnail || null,
        totalPages: book.pageCount,
        currentPage: 0,
      });
      // setTimeout to ensure it's added before update? No, state update in store is synchronous usually or handled.
      // Actually addBook in store sets status to 'plan_to_watch' default.
      // We should call update immediately after.
      updateBookStatus(bookId, 'completed');
    } else {
      // If already Read, toggle to Plan to Watch (Unread)? or just toggle?
      // Movie logic: markMovieUnwatched sets to 'plan_to_watch' if it was in list.
      if (isRead) {
        updateBookStatus(bookId, 'plan_to_watch');
      } else {
        updateBookStatus(bookId, 'completed');
      }
    }
  };
  
  const handleToggleReading = () => {
      if (!isTracked && book) {
          addBook({
            id: book.id,
            title: book.title,
            authors: book.authors ?? [],
            coverUrl: book.imageLinks?.thumbnail || null,
            totalPages: book.pageCount,
            currentPage: 0,
          });
          updateBookStatus(bookId, 'watching');
      } else {
          if (isReading) {
              updateBookStatus(bookId, 'plan_to_watch');
          } else {
              updateBookStatus(bookId, 'watching');
          }
      }
  }

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!book) {
    return <View style={styles.loading}><Text style={styles.errorText}>{t.movieNotFound}</Text></View>; // Reuse error
  }

  return (
    <>
      <Stack.Screen options={{ title: book.title }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Info Section - No Backdrop for Books, just top padding */}
        <View style={styles.infoSection}>
          <Image 
            source={{ uri: book.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192?text=No+Cover' }} 
            style={styles.poster} 
            contentFit="cover"
          />
          <View style={styles.infoText}>
            <Text style={styles.title}>{book.title}</Text>
            {book.authors && (
                <Text style={styles.meta}>{t.by} {book.authors.join(', ')}</Text>
            )}
            <Text style={styles.meta}>
                {book.publishedDate?.split('-')[0]} 
                {book.pageCount ? ` • ${book.pageCount} ${t.pages}` : ''}
            </Text>
            {book.averageRating && (
                <View style={styles.rating}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{book.averageRating}</Text>
                </View>
            )}
            {/* Publisher */}
            {book.publisher && (
                 <Text style={[styles.meta, { fontSize: 12, marginTop: 6 }]}>{book.publisher}</Text>
            )}
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

           {/* Reading Button ? Optional but useful */}
           {!isRead && (
             <TouchableOpacity style={[styles.actionButton, styles.readButton, isReading && styles.readingActiveButton]} onPress={handleToggleReading}>
                <Ionicons name={isReading ? 'glasses' : 'glasses-outline'} size={20} color={Colors.text} />
                <Text style={styles.actionButtonText}>{isReading ? t.reading : t.startReading}</Text>
             </TouchableOpacity>
           )}

          {isTracked && (
             <TouchableOpacity
               style={[styles.favoriteButton, trackedBook?.isFavorite && styles.favoriteButtonActive]}
               onPress={() => toggleBookFavorite(bookId)}
             >
               <Ionicons 
                 name={trackedBook?.isFavorite ? "heart" : "heart-outline"} 
                 size={24} 
                 color={trackedBook?.isFavorite ? Colors.text : Colors.text} 
               />
             </TouchableOpacity>
           )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.overview}</Text>
           {/* Google Books descriptions often contain HTML tags */}
          <Text style={styles.overview}>
              {book.description?.replace(/<[^>]*>?/gm, '') || t.noDesc}
          </Text>
        </View>

        {/* External Link */}
        {book.infoLink && (
             <View style={styles.section}>
                <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(book.infoLink!)}>
                    <Text style={styles.linkButtonText}>{t.viewOnGoogleBooks}</Text>
                    <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
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
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: Colors.surface, borderRadius: 8, alignSelf: 'flex-start' },
  linkButtonText: { color: Colors.textSecondary, fontWeight: '600' },
});
