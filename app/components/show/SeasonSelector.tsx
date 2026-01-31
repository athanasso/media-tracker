import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppColors } from '@/src/theme/colors';
import { Season } from '@/src/types';

interface SeasonSelectorProps {
  seasons: Season[];
  selectedSeason: number;
  onSelect: (seasonNumber: number) => void;
  t: any;
}

const Colors = AppColors;

export const SeasonSelector = memo(({ seasons, selectedSeason, onSelect, t }: SeasonSelectorProps) => {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.seasonScroll}
    >
      {seasons.map((s) => (
        <TouchableOpacity
            key={s.id}
            style={[styles.seasonChip, selectedSeason === s.season_number && styles.seasonChipActive]}
            onPress={() => onSelect(s.season_number)}
        >
            {(s.name !== `Season ${s.season_number}` && s.name !== `${t.season} ${s.season_number}`) ? (
                <View style={{ alignItems: 'center' }}>
                        <Text style={[
                            styles.seasonChipLabel, 
                            selectedSeason === s.season_number && styles.seasonChipTextActive
                        ]}>
                        {t.season} {s.season_number}
                        </Text>
                        <Text style={[
                            styles.seasonChipText, 
                            selectedSeason === s.season_number && styles.seasonChipTextActive,
                            { fontSize: 15 } // Slightly larger title for named seasons
                        ]}>
                        {s.name}
                        </Text>
                </View>
            ) : (
                <Text style={[styles.seasonChipText, selectedSeason === s.season_number && styles.seasonChipTextActive]}>
                    {s.name}
                </Text>
            )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  seasonScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  seasonChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  seasonChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  seasonChipLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  seasonChipTextActive: {
    color: Colors.text,
  },
});

export default SeasonSelector;
