/**
 * Settings Screen
 * App settings, import/export data, and about section
 */

import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { exportWatchlistData, getExportPreview, importWatchlistData } from '@/src/services/dataExport';
import { importFromTVTime } from '@/src/services/tvTimeImport';
import { useWatchlistStore } from '@/src/store';

// Theme colors
const Colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  primary: '#F5C518',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#3A3A3A',
};

export default function SettingsScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTVTimeImporting, setIsTVTimeImporting] = useState(false);
  const [tvTimeProgress, setTVTimeProgress] = useState({ current: 0, total: 0, title: '' });

  const { clearWatchlist } = useWatchlistStore();

  // Get current data stats
  const exportPreview = getExportPreview();

  const handleExport = async () => {
    if (exportPreview.showCount === 0 && exportPreview.movieCount === 0) {
      Alert.alert('No Data', 'You have no shows or movies to export.');
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

      if (result.shows > 0 || result.movies > 0) {
        let message = `Successfully imported:\n\n• ${result.shows} TV Shows\n• ${result.movies} Movies`;
        if (result.failed.length > 0) {
          message += `\n\n${result.failed.length} items could not be matched.`;
        }
        Alert.alert('Import Complete', message);
      } else if (result.failed.length > 0) {
        Alert.alert(
          'Import Failed',
          `Could not match ${result.failed.length} items from your TV Time data. Make sure the titles exist on TMDB.`
        );
      }
    } catch {
      setIsTVTimeImporting(false);
      Alert.alert('Import Error', 'An error occurred while importing. Please try again.');
    } finally {
      // Allow screen to sleep again
      deactivateKeepAwake('tvtime-import');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your tracked shows, movies, and watched episodes. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearWatchlist();
            Alert.alert('Done', 'All data has been cleared.');
          },
        },
      ]
    );
  };

  const handleOpenTMDB = () => {
    Linking.openURL('https://www.themoviedb.org/');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />

      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>

            {/* Current Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Your Library</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{exportPreview.showCount}</Text>
                  <Text style={styles.statLabel}>Shows</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{exportPreview.movieCount}</Text>
                  <Text style={styles.statLabel}>Movies</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{exportPreview.episodeCount}</Text>
                  <Text style={styles.statLabel}>Episodes</Text>
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
                <Text style={styles.menuTitle}>Export Data</Text>
                <Text style={styles.menuSubtitle}>Save your watchlist as a backup file</Text>
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
                <Text style={styles.menuTitle}>Import Data</Text>
                <Text style={styles.menuSubtitle}>Restore from a backup file</Text>
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
                <Text style={styles.menuTitle}>Import from TV Time</Text>
                <Text style={styles.menuSubtitle}>Import your TV Time JSON export</Text>
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
                <Text style={[styles.menuTitle, { color: Colors.error }]}>Clear All Data</Text>
                <Text style={styles.menuSubtitle}>Delete all shows, movies, and progress</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>

            <TouchableOpacity style={styles.menuItem} onPress={handleOpenTMDB}>
              <View style={[styles.iconContainer, { backgroundColor: '#01D277' + '20' }]}>
                <Ionicons name="film-outline" size={22} color="#01D277" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>TMDB</Text>
                <Text style={styles.menuSubtitle}>Data provided by The Movie Database</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Version</Text>
                <Text style={styles.menuSubtitle}>1.0.0</Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Made with ❤️ using React Native
            </Text>
            <Text style={styles.footerSubtext}>
              This app uses TMDB API but is not endorsed by TMDB
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
            <Text style={styles.modalTitle}>Importing from TV Time</Text>
            <Text style={styles.modalProgress}>
              {tvTimeProgress.current} / {tvTimeProgress.total}
            </Text>
            {tvTimeProgress.title ? (
              <Text style={styles.modalSubtext} numberOfLines={1}>
                {tvTimeProgress.title}
              </Text>
            ) : null}
            <Text style={styles.modalHint}>
              Searching TMDB for matches...
            </Text>
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
});
