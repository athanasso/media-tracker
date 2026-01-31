import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { AppColors } from '@/src/theme/colors';
import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { getBackdropUrl, getPosterUrl } from '@/src/services/api/client';

interface MatchDetailViewProps {
  id: number;
  type: 'movie' | 'show';
}

const Colors = AppColors;

export function MatchDetailView({ id, type }: MatchDetailViewProps) {
  const { data: item, isLoading } = useQuery<any>({
    queryKey: ['pending_detail', type, id],
    queryFn: () => type === 'movie' ? getMovieDetails(id) : getShowDetails(id)
  });

  if (isLoading) {
    return <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} />;
  }

  if (!item) {
    return <Text style={{ color: Colors.textSecondary }}>Failed to load details.</Text>;
  }

  const title = (item as any).title || (item as any).name;
  const releaseDate = (item as any).release_date || (item as any).first_air_date;
  const runtime = (item as any).runtime ? `${Math.floor((item as any).runtime / 60)}h ${(item as any).runtime % 60}m` : null;

  return (
    <View style={styles.detailCard}>
      {/* Backdrop */}
      {item.backdrop_path && (
        <Image 
          source={{ uri: getBackdropUrl(item.backdrop_path) || '' }} 
          style={styles.detailBackdrop}
          contentFit="cover"
        />
      )}
      
      <View style={styles.detailContent}>
        <View style={styles.detailHeader}>
          <Image 
            source={{ uri: getPosterUrl(item.poster_path, 'medium') || '' }} 
            style={styles.detailPoster}
            contentFit="cover"
          />
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailTitle}>{title}</Text>
            <Text style={styles.detailMeta}>
              {releaseDate ? releaseDate.substring(0, 4) : 'N/A'} • {type === 'movie' ? 'Movie' : 'TV Show'}
            </Text>
            {runtime && <Text style={styles.detailMeta}>{runtime}</Text>}
            <View style={styles.detailRatingContainer}>
               <Ionicons name="star" size={14} color="#FFD700" />
               <Text style={styles.detailRating}>{item.vote_average?.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.detailOverviewLabel}>Overview</Text>
        <Text style={styles.detailOverview}>{item.overview || 'No description available.'}</Text>
        
        <Text style={[styles.detailOverviewLabel, { marginTop: 12 }]}>Genres</Text>
        <View style={styles.detailGenres}>
            {item.genres?.map((g: any) => (
                <View key={g.id} style={styles.detailGenreBadge}>
                    <Text style={styles.detailGenreText}>{g.name}</Text>
                </View>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailBackdrop: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceLight,
  },
  detailContent: {
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    marginTop: -40, // Overlap backdrop
    marginBottom: 16, 
  },
  detailPoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  detailHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailRating: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  detailOverviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  detailOverview: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  detailGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  detailGenreBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailGenreText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});

export default MatchDetailView;
