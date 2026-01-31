import { strings } from '@/src/i18n/strings';
import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { getBackdropUrl, getPosterUrl } from '@/src/services/api/client';
import { exportWatchlistData, getExportPreview, importWatchlistData } from '@/src/services/dataExport';
import { startOAuthFlow, signOut, isAuthenticated, getUserInfo, UserInfo } from '@/src/services/googleAuth';
import { uploadBackup, syncFromDrive, listBackups } from '@/src/services/googleDrive';
import { importFromTVTime, PendingImportItem, processPendingImports } from '@/src/services/tvTimeImport';
import { useSettingsStore, useWatchlistStore } from '@/src/store';
import { AppColors } from '@/src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


// Use centralized colors
const Colors = AppColors;

function MatchDetailView({ id, type }: { id: number, type: 'movie' | 'show' }) {
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
        <ExpoImage 
          source={{ uri: getBackdropUrl(item.backdrop_path) || '' }} 
          style={styles.detailBackdrop}
          contentFit="cover"
        />
      )}
      
      <View style={styles.detailContent}>
        <View style={styles.detailHeader}>
          <ExpoImage 
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

export default function SettingsScreen() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTVTimeImporting, setIsTVTimeImporting] = useState(false);
  const [tvTimeProgress, setTVTimeProgress] = useState({ current: 0, total: 0, title: '' });
  const [pendingImports, setPendingImports] = useState<PendingImportItem[]>([]);
  const [missedImports, setMissedImports] = useState<string[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [selectedPending, setSelectedPending] = useState<Set<number>>(new Set());
  const [detailsItem, setDetailsItem] = useState<PendingImportItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Google Drive State
  const [googleUser, setGoogleUser] = useState<UserInfo | null>(null);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const { clearWatchlist, trackedShows, trackedMovies, updateShowStatus, bulkUpdateShowStatus } = useWatchlistStore();
  const { dateFormat, setDateFormat, customDateFormat, setCustomDateFormat, getFormattedDate, language, setLanguage, showDroppedTab, toggleShowDroppedTab, showBooks, toggleShowBooks, showManga, toggleShowManga, showFavorites, toggleShowFavorites } = useSettingsStore();
  
  const t = strings[language] || strings.en;
  
  // Calculate accurate episode count using cached details if available
  // We utilize the cached data from React Query to avoid redundant fetches
  const showDetailsQueriesResult = useQueries({
    queries: trackedShows.map(show => ({
      queryKey: ['show-details', show.showId, 'minimal'],
      queryFn: () => getShowDetails(show.showId, []),
      staleTime: 1000 * 60 * 60, // 1 hour
    }))
  });

  const exportPreview = React.useMemo(() => {
     let epCount = 0;
     const showDetailsMap = new Map();
     showDetailsQueriesResult.forEach(q => {
        if (q.data) showDetailsMap.set(q.data.id, q.data);
     });

     trackedShows.forEach(show => {
        const details = showDetailsMap.get(show.showId);
        const totalEpisodes = details?.number_of_episodes || 0;
        const watchedCount = show.watchedEpisodes.length;
        
        const lastWatched = [...show.watchedEpisodes].sort((a, b) => 
            (a.seasonNumber - b.seasonNumber) || (a.episodeNumber - b.episodeNumber)
        ).pop();
        const { seasonNumber: currentSeason = 1, episodeNumber: currentEpNum = 0 } = lastWatched || {};

        const episodesFromPastSeasons = (details?.seasons || [])
            .filter((s: any) => s.season_number > 0 && s.season_number < currentSeason)
            .reduce((sum: number, s: any) => sum + (s.episode_count || 0), 0);

        let displayCount = episodesFromPastSeasons + currentEpNum;

        if (currentSeason === 1 || !details?.seasons) {
            displayCount = currentEpNum || watchedCount || 0;
        }
        
        const finalCount = totalEpisodes > 0 ? Math.min(displayCount, totalEpisodes) : displayCount;
        epCount += finalCount;
     });
     
     return {
         showCount: trackedShows.length,
         movieCount: trackedMovies.length,
         episodeCount: epCount
     };
  }, [trackedShows, trackedMovies, showDetailsQueriesResult]);

  // Check auth status on focus
  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [])
  );

  const checkAuth = () => {
    if (isAuthenticated()) {
      setGoogleUser(getUserInfo());
    } else {
      setGoogleUser(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
        setIsAuthLoading(true);
        await startOAuthFlow();
        // Auth completes via deep link. The useFocusEffect will update state when app returns.
    } catch (error) {
        Alert.alert('Error', 'Failed to sign in with Google');
        console.error(error);
    } finally {
        setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    Alert.alert(
        t.signOut || 'Sign Out', 
        t.signOutConfirm || 'Are you sure you want to sign out?',
        [
            { text: t.cancel, style: 'cancel' },
            { 
                text: t.signOut || 'Sign Out', 
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    setGoogleUser(null);
                }
            }
        ]
    );
  };

  const handleDriveBackup = async () => {
    if (!googleUser) return;
    setIsBackupLoading(true);
    try {
        await uploadBackup();
        Alert.alert(t.success || 'Success', t.backupComplete || 'Backup successfully uploaded to Google Drive!');
    } catch (error) {
        Alert.alert('Error', 'Failed to upload backup to Google Drive');
        console.error(error);
    } finally {
        setIsBackupLoading(false);
    }
  };

  const handleDriveRestore = async () => {
    if (!googleUser) return;
    setIsRestoreLoading(true);
    try {
        // Check if backups exist
        try {
            const backups = await listBackups();
            if (backups.length === 0) {
                Alert.alert(t.noBackup || 'No Backup', t.noBackupFound || 'No backup found in Google Drive.');
                return;
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to list backups');
            return;
        }

        Alert.alert(
            t.restoreBackup || 'Restore Backup',
            t.restoreConfirm || 'Do you want to merge with existing data or replace it entirely?',
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.merge || 'Merge',
                    onPress: async () => {
                        try {
                            setIsRestoreLoading(true);
                            await syncFromDrive('merge');
                            
                            // Auto-scan
                            const completedCount = await scanForCompletedShows();
                            
                            let msg = t.restoreComplete || 'Data restored successfully!';
                            if (completedCount > 0) {
                                msg += `\n\n${completedCount} ${t.scanCompletedShowsSuccess}`;
                            }
                            Alert.alert(t.success || 'Success', msg);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to restore backup');
                        } finally {
                            setIsRestoreLoading(false);
                        }
                    }
                },
                {
                    text: t.replace || 'Replace',
                    style: 'destructive',
                    onPress: async () => {
                         try {
                            setIsRestoreLoading(true);
                            await syncFromDrive('replace');
                            
                            // Auto-scan
                            const completedCount = await scanForCompletedShows();
                            
                            let msg = t.restoreComplete || 'Data restored successfully!';
                            if (completedCount > 0) {
                                msg += `\n\n${completedCount} ${t.scanCompletedShowsSuccess}`;
                            }
                            Alert.alert(t.success || 'Success', msg);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to restore backup');
                        } finally {
                            setIsRestoreLoading(false);
                        }
                    }
                }
            ]
        );
    } catch (error) {
        Alert.alert('Error', 'Failed to initiate restore');
    } finally {
        setIsRestoreLoading(false);
    }
  };

  const handleExport = async () => {
    if (exportPreview.showCount === 0 && exportPreview.movieCount === 0) {
      Alert.alert(t.noData, t.noDataMessage);
      return;
    }

    setIsExporting(true);
    try {
      await exportWatchlistData();
    } finally {
      setIsExporting(false);
    }
  };

  const scanForCompletedShows = async (): Promise<number> => {
    setIsScanning(true);
    // Prevent screen from sleeping during scan
    await activateKeepAwakeAsync('scan-completed');
    let completedCount = 0;
    
    try {
        // Use direct store state to ensure we have latest data after import
        const currentTrackedShows = useWatchlistStore.getState().trackedShows;
        // Filter out shows that are already completed, dropped, OR have no watched episodes
        // If no episodes are watched, it can't be completed (optimization)
        const watchingShows = currentTrackedShows.filter(s => 
            s.status !== 'completed' && 
            s.status !== 'dropped' && 
            s.watchedEpisodes.length > 0
        );
        
        // Process with a concurrency pool for maximum efficiency
        // Increased concurrency to speed up large library scans
        const CONCURRENCY = 25;
        const processing = new Set<Promise<void>>();
        const updates: { showId: number; status: 'completed' }[] = [];
        
        for (const show of watchingShows) {
            const task = (async () => {
                try {
                    // Fetch minimal details (no credits/similar/videos) for speed
                    const details = await getShowDetails(show.showId, []);
                    const totalEpisodes = (details.seasons || [])
                        .filter((s:any) => s.season_number > 0)
                        .reduce((acc:number, s:any) => acc + s.episode_count, 0);
                    
                    const watchedCount = show.watchedEpisodes.length;
                    
                    if (watchedCount > 0 && watchedCount >= totalEpisodes && totalEpisodes > 0) {
                        updates.push({ showId: show.showId, status: 'completed' });
                    }
                } catch (e) {
                    console.warn(`Failed to check completion for show ${show.showId}`, e);
                }
            })();

            processing.add(task);
            task.then(() => processing.delete(task));

            if (processing.size >= CONCURRENCY) {
                await Promise.race(processing);
            }
        }
        
        // Wait for remaining tasks
        await Promise.all(processing);
        
        // Perform bulk update to minimize store writes/re-renders
        if (updates.length > 0) {
            bulkUpdateShowStatus(updates);
        }
        
        return updates.length;
    } catch (e) {
        console.error('Scan failed', e);
        return 0;
    } finally {
        await deactivateKeepAwake('scan-completed');
        setIsScanning(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const success = await importWatchlistData();
      if (success) {
          const completedCount = await scanForCompletedShows();
          if (completedCount > 0) {
              Alert.alert(t.success || 'Success', `${t.importComplete || 'Import successful'}\n\n${completedCount} ${t.scanCompletedShowsSuccess}`);
          } else {
              Alert.alert(t.success || 'Success', t.importComplete || 'Import successful');
          }
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleTVTimeImport = async () => {
    setIsTVTimeImporting(true);
    setTVTimeProgress({ current: 0, total: 0, title: '' });

    // Keep screen awake during import
    await activateKeepAwakeAsync('tvtime-import');

    try {
      const result = await importFromTVTime((current, total, title) => {
        setTVTimeProgress({ current, total, title });
      });

      // Auto-scan for completed shows after import
      const completedCount = await scanForCompletedShows();

      setIsTVTimeImporting(false);

      if (result.pending.length > 0 || result.failed.length > 0) {
        setPendingImports(result.pending);
        setMissedImports(result.failed);
        // Select all pending by default
        setSelectedPending(new Set(result.pending.map((_, i) => i)));
        setShowPendingModal(true);
      } else {
         let msg = t.tvTimeImportSuccess || 'Import successful';
         if (completedCount > 0) {
             msg += `\n\n${completedCount} ${t.scanCompletedShowsSuccess}`;
         }
         Alert.alert(t.success || 'Success', msg);
      }
    } catch (error) {
       setIsTVTimeImporting(false);
       Alert.alert(t.error || 'Error', t.importGenericError || 'Import failed');
    } finally {
       await deactivateKeepAwake('tvtime-import');
    }
  };

  const handleConfirmPending = () => {
    const itemsToImport = pendingImports.filter((_, i) => selectedPending.has(i));
    const result = processPendingImports(itemsToImport);
    
    setShowPendingModal(false);
    setPendingImports([]);
    setMissedImports([]);
    setSelectedPending(new Set());

    Alert.alert(
      t.importComplete,
      t.importSuccessBody
        .replace('{shows}', result.shows.toString())
        .replace('{movies}', result.movies.toString())
    );
  };

  const togglePendingItem = (index: number) => {
    const newSelected = new Set(selectedPending);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPending(newSelected);
  };

  const handleShareMissed = async () => {
    if (missedImports.length === 0) return;
    
    try {
      const message = missedImports.join('\n');
      await Share.share({
        message,
        title: t.missedMatches,
      });
    } catch (error) {
      console.error('Error sharing missed items:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t.clearAllData,
      t.clearDataConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.clearAllData,
          style: 'destructive',
          onPress: () => {
            clearWatchlist();
            Alert.alert(t.done, t.dataCleared);
          },
        },
      ]
    );
  };

  const handleOpenTMDB = () => {
    Linking.openURL('https://www.themoviedb.org/');
  };

  // New handler for opening the repo
  const handleOpenRepo = () => {
    Linking.openURL('https://github.com/athanasso/media-tracker');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t.settings,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* Cloud Sync Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.cloudSync || 'Google Sync'}</Text>
            
            {!googleUser ? (
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleGoogleSignIn}
                    disabled={isAuthLoading}
                >
                    <View style={[styles.iconContainer, { backgroundColor: '#4285F4' + '20' }]}>
                        <Ionicons name="logo-google" size={22} color="#4285F4" />
                    </View>
                    <View style={styles.menuContent}>
                        <Text style={styles.menuTitle}>{t.signInWithGoogle || 'Sign In with Google'}</Text>
                        <Text style={styles.menuSubtitle}>{t.syncDescription || 'Sync your watchlist to Google Drive'}</Text>
                    </View>
                    {isAuthLoading ? (
                        <ActivityIndicator size="small" color="#4285F4" />
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                    )}
                </TouchableOpacity>
            ) : (
                <View style={styles.statsCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                         {googleUser.picture ? (
                           <Image source={{ uri: googleUser.picture }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                         ) : (
                           <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                             <Text style={{ color: Colors.textPrimary, fontWeight: 'bold' }}>{googleUser.name?.charAt(0)}</Text>
                           </View>
                         )}
                         <View style={{ flex: 1 }}>
                            <Text style={{ color: Colors.textPrimary, fontWeight: '600', fontSize: 16 }}>{googleUser.name}</Text>
                            <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{googleUser.email}</Text>
                         </View>
                         <TouchableOpacity onPress={handleGoogleSignOut} style={{ padding: 8 }}>
                            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
                         </TouchableOpacity>
                    </View>
                    
                    <View style={{ gap: 10 }}>
                        <TouchableOpacity 
                            style={[styles.menuItem, { backgroundColor: Colors.surfaceLight, marginBottom: 0 }]}
                            onPress={handleDriveBackup}
                            disabled={isBackupLoading}
                        >
                            <Ionicons name="cloud-upload" size={20} color={Colors.success} />
                            <Text style={[styles.menuTitle, { flex: 1, marginLeft: 12, fontSize: 14 }]}>{t.backupNow || 'Backup to Drive'}</Text>
                            {isBackupLoading && <ActivityIndicator size="small" color={Colors.textMuted} />}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.menuItem, { backgroundColor: Colors.surfaceLight, marginBottom: 0 }]}
                            onPress={handleDriveRestore}
                            disabled={isRestoreLoading}
                        >
                            <Ionicons name="cloud-download" size={20} color={Colors.primary} />
                             <Text style={[styles.menuTitle, { flex: 1, marginLeft: 12, fontSize: 14 }]}>{t.restoreNow || 'Restore from Drive'}</Text>
                             {isRestoreLoading && <ActivityIndicator size="small" color={Colors.textMuted} />}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
          </View>

          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.dataManagement}</Text>

            {/* Current Stats */}
            <View style={styles.statsCardContainer}>
              <TouchableOpacity 
                style={styles.statsCardItem}
                onPress={() => router.push({ pathname: '/stats', params: { type: 'shows' } })}
              >
                <Text style={styles.statNumber}>{exportPreview.showCount}</Text>
                <Text style={styles.statLabel}>{t.shows}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.statsCardItem}
                onPress={() => router.push({ pathname: '/stats', params: { type: 'movies' } })}
              >
                <Text style={styles.statNumber}>{exportPreview.movieCount}</Text>
                <Text style={styles.statLabel}>{t.movies}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.statsCardItem}
                onPress={() => router.push({ pathname: '/stats', params: { type: 'episodes' } })}
              >
                <Text style={styles.statNumber}>{exportPreview.episodeCount}</Text>
                <Text style={styles.statLabel}>{t.episodes}</Text>
              </TouchableOpacity>
            </View>

            {/* Export Button */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleExport}
              disabled={isExporting}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="download-outline" size={22} color={Colors.success} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{t.exportData}</Text>
                <Text style={styles.menuSubtitle}>{t.exportSubtitle}</Text>
              </View>
              {isExporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>

            {/* Import Button */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleImport}
              disabled={isImporting}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="cloud-upload-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{t.importData}</Text>
                <Text style={styles.menuSubtitle}>{t.importSubtitle}</Text>
              </View>
              {isImporting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>

            {/* TV Time Import Button */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleTVTimeImport}
              disabled={isTVTimeImporting}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Ionicons name="time-outline" size={22} color="#8B5CF6" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{t.importTVTime}</Text>
                <Text style={styles.menuSubtitle}>{t.importTVTimeSubtitle}</Text>
              </View>
              {isTVTimeImporting ? (
                <ActivityIndicator size="small" color="#8B5CF6" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              )}
            </TouchableOpacity>



            {/* Clear Data Button */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleClearData}
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.error + '20' }]}>
                <Ionicons name="trash-outline" size={22} color={Colors.error} />
              </View>
              <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, { color: Colors.error }]}>{t.clearAllData}</Text>
                <Text style={styles.menuSubtitle}>{t.clearAllSubtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>



          {/* UI Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.uiSettings}</Text>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionItem, showDroppedTab && styles.optionItemActive]}
                onPress={toggleShowDroppedTab}
              >
                <Text style={[styles.optionText, showDroppedTab && styles.optionTextActive]}>
                  {t.showDroppedTab}
                </Text>
                <Ionicons 
                  name={showDroppedTab ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={showDroppedTab ? Colors.primary : Colors.textSecondary} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, showBooks && styles.optionItemActive]}
                onPress={toggleShowBooks}
              >
                <Text style={[styles.optionText, showBooks && styles.optionTextActive]}>
                  {t.showBooksTab}
                </Text>
                <Ionicons 
                  name={showBooks ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={showBooks ? Colors.primary : Colors.textSecondary} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, showManga && styles.optionItemActive]}
                onPress={toggleShowManga}
              >
                <Text style={[styles.optionText, showManga && styles.optionTextActive]}>
                  {t.showMangaTab}
                </Text>
                <Ionicons 
                  name={showManga ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={showManga ? Colors.primary : Colors.textSecondary} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, showFavorites && styles.optionItemActive]}
                onPress={toggleShowFavorites}
              >
                <Text style={[styles.optionText, showFavorites && styles.optionTextActive]}>
                  {t.showFavoritesTab}
                </Text>
                <Ionicons 
                  name={showFavorites ? "checkbox" : "square-outline"} 
                  size={20} 
                  color={showFavorites ? Colors.primary : Colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Language Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.language} / Γλώσσα</Text>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionItem, language === 'en' && styles.optionItemActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
                  English
                </Text>
                {language === 'en' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, language === 'el' && styles.optionItemActive]}
                onPress={() => setLanguage('el')}
              >
                <Text style={[styles.optionText, language === 'el' && styles.optionTextActive]}>
                  Greek (Ελληνικά)
                </Text>
                {language === 'el' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Format Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.dateFormat}</Text>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionItem, dateFormat === 'eu' && styles.optionItemActive]}
                onPress={() => setDateFormat('eu')}
              >
                <Text style={[styles.optionText, dateFormat === 'eu' && styles.optionTextActive]}>
                  {t.european}
                </Text>
                {dateFormat === 'eu' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, dateFormat === 'us' && styles.optionItemActive]}
                onPress={() => setDateFormat('us')}
              >
                <Text style={[styles.optionText, dateFormat === 'us' && styles.optionTextActive]}>
                  {t.american}
                </Text>
                {dateFormat === 'us' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, dateFormat === 'custom' && styles.optionItemActive]}
                onPress={() => setDateFormat('custom')}
              >
                <Text style={[styles.optionText, dateFormat === 'custom' && styles.optionTextActive]}>
                  {t.custom}
                </Text>
                {dateFormat === 'custom' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>

              {dateFormat === 'custom' && (
                <View style={styles.customFormatContainer}>
                  <Text style={styles.customFormatLabel}>{t.formatPattern}</Text>
                  <View style={styles.customInputContainer}>
                    <TextInput
                      style={styles.customInput}
                      value={customDateFormat}
                      onChangeText={setCustomDateFormat}
                      placeholder={t.dateFormatPlaceholder}
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>
                  <Text style={styles.previewText}>
                    {t.preview} {getFormattedDate(new Date())}
                  </Text>
                  <Text style={styles.helpText}>
                    {t.dateFormatHelp}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.about}</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleOpenTMDB}>
              <View style={[styles.iconContainer, { backgroundColor: '#01D277' + '20' }]}>
                <Ionicons name="film-outline" size={22} color="#01D277" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>TMDB</Text>
                <Text style={styles.menuSubtitle}>{t.tmdbAttribution}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* GitHub Repository Link - ADDED HERE */}
            <TouchableOpacity style={styles.menuItem} onPress={handleOpenRepo}>
              <View style={[styles.iconContainer, { backgroundColor: Colors.textPrimary + '20' }]}>
                <Ionicons name="logo-github" size={22} color={Colors.textPrimary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{t.github}</Text>
                <Text style={styles.menuSubtitle}>athanasso/media-tracker</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{t.version}</Text>
                <Text style={styles.menuSubtitle}>3.2.2</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t.madeWith}
            </Text>
            <Text style={styles.footerSubtext}>
              {t.tmdbDisclaimer}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* TV Time Import Progress Modal */}
      <Modal
        visible={isTVTimeImporting}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.modalTitle}>{t.importingTVTimeProgress}</Text>
            <Text style={styles.modalProgress}>
              {tvTimeProgress.current} / {tvTimeProgress.total}
            </Text>
            {tvTimeProgress.title ? (
              <Text style={styles.modalSubtext} numberOfLines={1}>
                {tvTimeProgress.title}
              </Text>
            ) : null}
            <Text style={styles.modalHint}>
              {t.searchingMatches}
            </Text>
          </View>
        </View>
      </Modal>

      {/* Pending Imports Review Modal */}
      <Modal
        visible={showPendingModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>{t.reviewMatches || 'Review Matches'}</Text>
            <TouchableOpacity onPress={() => setShowPendingModal(false)}>
              <Text style={styles.modalCloseText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalSubHeader}>
            {t.reviewMatchesDescription || 'Some items could not be matched exactly. Please review suggested matches.'}
          </Text>

          <ScrollView style={styles.pendingList} contentContainerStyle={{ paddingBottom: 100 }}>
            {pendingImports.length > 0 && (
              <>
                <Text style={styles.listSectionTitle}>{t.pendingMatches || 'Pending Matches'}</Text>
                {pendingImports.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pendingItem,
                      selectedPending.has(index) && styles.pendingItemSelected
                    ]}
                    onPress={() => togglePendingItem(index)}
                  >
                    <View style={styles.checkbox}>
                      {selectedPending.has(index) && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                    
                    <View style={styles.pendingContent}>
                      <Text style={styles.pendingLabel}>Original:</Text>
                      <Text style={styles.pendingTitle}>{item.original.title}</Text>
                      
                      <View style={styles.matchContainer}>
                        <Ionicons name="arrow-forward" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.pendingLabel}>Match:</Text>
                            <Text style={styles.pendingMatchTitle}>
                              {item.match.title} 
                              {item.match.releaseDate ? ` (${item.match.releaseDate.substring(0,4)})` : ''}
                            </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={styles.infoButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setDetailsItem(item);
                      }}
                    >
                      <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {missedImports.length > 0 && (
              <>
                <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
                   <Text style={[styles.listSectionTitle, { color: Colors.error, marginBottom: 0 }]}>
                    {t.missedMatches || 'Not Matched'} ({missedImports.length})
                  </Text>
                  <TouchableOpacity onPress={handleShareMissed} style={styles.shareButton}>
                    <Ionicons name="share-outline" size={16} color={Colors.error} />
                    <Text style={styles.shareButtonText}>{t.shareList}</Text>
                  </TouchableOpacity>
                </View>
                
                {missedImports.map((title, index) => (
                  <View key={`missed-${index}`} style={styles.missedItem}>
                    <Ionicons name="alert-circle-outline" size={20} color={Colors.error} />
                    <Text style={styles.missedTitle}>{title}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
             <TouchableOpacity 
               style={styles.confirmButton}
               onPress={handleConfirmPending}
             >
               <Text style={styles.confirmButtonText}>
                 {t.importSelected || 'Import Selected'} ({selectedPending.size})
                </Text>
             </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Item Details Review Modal */}
      <Modal
        visible={!!detailsItem}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailsItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
               <Text style={styles.modalTitle}>{t.viewDetails}</Text>
               <TouchableOpacity onPress={() => setDetailsItem(null)}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
               </TouchableOpacity>
            </View>

            <ScrollView style={{ width: '100%', marginTop: 16 }}>
              {detailsItem && (
                <>
                  <Text style={[styles.listSectionTitle, { color: Colors.success }]}>Match (TMDB)</Text>
                  
                  <MatchDetailView 
                    id={detailsItem.match.id} 
                    type={detailsItem.match.media_type === 'tv' ? 'show' : 'movie'} 
                  />

                  <View style={[styles.codeBlock, { borderColor: Colors.success, marginTop: 8 }]}>
                    <Text style={[styles.codeText, { fontSize: 10 }]}>
                      Match Confidence: {detailsItem.match.title === detailsItem.original.title ? 'High (Exact Title)' : 'Medium (Similar Title)'}
                      {'\n'}TMDB ID: {detailsItem.match.id}
                    </Text>
                  </View>

                  <Text style={[styles.listSectionTitle, { color: Colors.textPrimary, marginTop: 24 }]}>Original (TV Time)</Text>
                  <View style={styles.codeBlock}>
                    <Text style={styles.codeText}>
                      {JSON.stringify(detailsItem.original, null, 2)}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  modalProgress: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionItemActive: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  optionTextActive: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  customFormatContainer: {
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  customFormatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  customInputContainer: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  customInput: {
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'System', // Ensure monospace-like look if possible, or default
  },
  previewText: {
    fontSize: 13,
    color: Colors.success,
    marginBottom: 4,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.primary,
  },
  modalSubHeader: {
    padding: 16,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  pendingList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pendingItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  pendingItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  pendingContent: {
    flex: 1,
  },
  pendingLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  pendingMatchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  listSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  missedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  missedTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  infoButton: {
    padding: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBlock: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  codeText: {
    fontFamily: 'monospace',
    color: Colors.textSecondary,
    fontSize: 12,
  },
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
  statsCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  statsCardItem: {
    flex: 1,
    alignItems: 'center',
    cursor: 'pointer',
  },

});
