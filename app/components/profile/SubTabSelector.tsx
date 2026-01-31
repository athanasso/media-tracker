import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors } from '@/src/theme/colors';

interface SubTabOption {
  value: string;
  label: string;
}

interface SubTabSelectorProps {
  options: SubTabOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

const Colors = AppColors;

export const SubTabSelector = memo(({ options, selectedValue, onValueChange }: SubTabSelectorProps) => {
  if (!options || options.length === 0) return null;

  return (
    <View style={styles.subTabContainer}>
      {options.map((option) => (
        <TouchableOpacity 
          key={option.value}
          style={[styles.subTab, selectedValue === option.value && styles.activeSubTab]} 
          onPress={() => onValueChange(option.value)}
        >
          <Text style={[styles.subTabText, selectedValue === option.value && styles.activeSubTabText]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  subTabContainer: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  subTab: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: Colors.surface, borderRadius: 8, minWidth: 80 },
  activeSubTab: { borderWidth: 1, borderColor: Colors.primary },
  subTabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  activeSubTabText: { color: Colors.text },
});

export default SubTabSelector;
