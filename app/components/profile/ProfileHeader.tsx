import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors } from '@/src/theme/colors';

interface ProfileHeaderProps {
  title: string;
}

const Colors = AppColors;

export const ProfileHeader = memo(({ title }: ProfileHeaderProps) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity 
        onPress={() => router.push('/settings')}
        style={styles.settingsButton}
      >
        <Ionicons name="settings-outline" size={24} color={Colors.text} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.text },
  settingsButton: { padding: 8 },
});

export default ProfileHeader;
