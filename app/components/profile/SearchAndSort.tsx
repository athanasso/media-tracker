import React, { memo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/src/theme/colors';

interface SearchAndSortProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  isSortMenuOpen: boolean;
  onToggleSortMenu: () => void;
}

const Colors = AppColors;

export const SearchAndSort = memo(({ 
  value, 
  onChangeText, 
  placeholder, 
  isSortMenuOpen, 
  onToggleSortMenu 
}: SearchAndSortProps) => {
  return (
    <View style={styles.searchSortContainer}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
        />
        {value ? (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.sortButton, isSortMenuOpen && styles.sortButtonActive]}
        onPress={onToggleSortMenu}
      >
        <Ionicons 
            name={isSortMenuOpen ? "options" : "options-outline"} 
            size={20} 
            color={isSortMenuOpen ? Colors.text : Colors.text} // Maintained logic 
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  searchSortContainer: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  sortButton: { padding: 8, backgroundColor: Colors.surface, borderRadius: 8 },
  sortButtonActive: { backgroundColor: Colors.surfaceLight },
});

export default SearchAndSort;
