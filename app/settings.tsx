/**
 * Settings Screen
 * App settings, import/export data, and about section
 */

import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
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

import { strings } from '@/src/i18n/strings';
import { getMovieDetails, getShowDetails } from '@/src/services/api';
import { getBackdropUrl, getPosterUrl } from '@/src/services/api/client';
import { exportWatchlistData, getExportPreview, importWatchlistData } from '@/src/services/dataExport';
import { importFromTVTime, PendingImportItem, processPendingImports } from '@/src/services/tvTimeImport';
import { useSettingsStore, useWatchlistStore } from '@/src/store';

// Theme colors
const Colors = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  primary: '#E50914',
  textPrimary: '#FFFFFF',
  textSecondary: '#a0a0a0',
  textMuted: '#666666',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  border: '#333333',
};


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
        <Image 
          source={{ uri: getBackdropUrl(item.backdrop_path) || '' }} 
          style={styles.detailBackdrop}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.detailContent}>
        <View style={styles.detailHeader}>
          <Image 
            source={{ uri: getPosterUrl(item.poster_path, 'medium') || '' }} 
            style={styles.detailPoster} 
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
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTVTimeImporting, setIsTVTimeImporting] = useState(false);
  const [tvTimeProgress, setTVTimeProgress] = useState({ current: 0, total: 0, title: '' });
  const [pendingImports, setPendingImports] = useState<PendingImportItem[]>([]);
  const [missedImports, setMissedImports] = useState<string[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [selectedPending, setSelectedPending] = useState<Set<number>>(new Set());
  const [detailsItem, setDetailsItem] = useState<PendingImportItem | null>(null);

  const { clearWatchlist } = useWatchlistStore();
  const { dateFormat, setDateFormat, customDateFormat, setCustomDateFormat, getFormattedDate, language, setLanguage } = useSettingsStore();
  
  const t = strings[language] || strings.en;

  // Get current data stats
  const exportPreview = getExportPreview();

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

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await importWatchlistData();
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

      setIsTVTimeImporting(false);

      if (result.pending.length > 0 || result.failed.length > 0) {
        setPendingImports(result.pending);
        setMissedImports(result.failed);
        // Select all pending by default
        setSelectedPending(new Set(result.pending.map((_, i) => i)));
        setShowPendingModal(true);
      } else if (result.shows > 0 || result.movies > 0) {
        let message = t.importSuccessBody
          .replace('{shows}', result.shows.toString())
          .replace('{movies}', result.movies.toString());
        Alert.alert(t.importComplete, message);
      } else {
        Alert.alert(t.importFailed, t.noData);
      }
    } catch {
      setIsTVTimeImporting(false);
      Alert.alert(t.importFailed, t.importGenericError);
    } finally {
      // Allow screen to sleep again
      deactivateKeepAwake('tvtime-import');
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
          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.dataManagement}</Text>

            {/* Current Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>{t.yourLibrary}</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{exportPreview.showCount}</Text>
                  <Text style={styles.statLabel}>{t.shows}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{exportPreview.movieCount}</Text>
                  <Text style={styles.statLabel}>{t.movies}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{exportPreview.episodeCount}</Text>
                  <Text style={styles.statLabel}>{t.episodes}</Text>
                </View>
              </View>
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
                <Text style={styles.menuSubtitle}>1.3.1</Text>
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
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
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
});
