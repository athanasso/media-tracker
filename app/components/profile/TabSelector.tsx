import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors } from '@/src/theme/colors';

interface TabSelectorProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  t: any;
  showBooks: boolean;
  showManga: boolean;
  showFavorites: boolean;
}

const Colors = AppColors;

export const TabSelector = memo(({ 
  activeTab, 
  onTabChange, 
  t, 
  showBooks, 
  showManga, 
  showFavorites 
}: TabSelectorProps) => {
  return (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'shows' && styles.activeTab]} 
        onPress={() => onTabChange('shows')}
      >
        <Text style={[styles.tabText, activeTab === 'shows' && styles.activeTabText]}>{t.shows}</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'movies' && styles.activeTab]} 
        onPress={() => onTabChange('movies')}
      >
        <Text style={[styles.tabText, activeTab === 'movies' && styles.activeTabText]}>{t.movies}</Text>
      </TouchableOpacity>

      {showBooks && (
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'books' && styles.activeTab]} 
          onPress={() => onTabChange('books')}
        >
          <Text style={[styles.tabText, activeTab === 'books' && styles.activeTabText]}>{t.books}</Text>
        </TouchableOpacity>
      )}

      {showManga && (
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'manga' && styles.activeTab]} 
            onPress={() => onTabChange('manga')}
          >
            <Text style={[styles.tabText, activeTab === 'manga' && styles.activeTabText]}>{t.manga}</Text>
          </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.tab, activeTab === 'plan' && styles.activeTab]} 
        onPress={() => onTabChange('plan')}
      >
        <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>{t.planToWatch}</Text>
      </TouchableOpacity>

      {showFavorites && (
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'favorites' && styles.activeTab]} 
          onPress={() => onTabChange('favorites')}
        >
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>{t.favorites}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tabContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  tab: { minWidth: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.surface, borderRadius: 10 },
  activeTab: { borderWidth: 1, borderColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  activeTabText: { color: Colors.text },
});

export default TabSelector;
