import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { TrackedBook, TrackingStatus } from '@/src/types';

interface BookItemProps {
  item: TrackedBook;
  activeTab: string;
  booksSubTab: string;
  getStatusColor: (status: TrackingStatus) => string;
  getFormattedDate: (date: Date) => string;
  t: any;
  onStatusChange: (id: string, currentStatus: TrackingStatus) => void;
  onRemove: (id: string) => void;
  onUpdateProgress?: (id: string, page: number) => void;
}

const BookItem = memo(({ 
  item, 
  activeTab, 
  booksSubTab, 
  getStatusColor, 
  getFormattedDate, 
  t, 
  onStatusChange, 
  onRemove,
  onUpdateProgress
}: BookItemProps) => {
  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: item.coverUrl || 'https://via.placeholder.com/100x150?text=No+Cover' }} 
        style={styles.poster}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity onPress={() => onRemove(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.author} numberOfLines={1}>{item.authors.join(', ')}</Text>
        
        <View style={styles.progressContainer}>
           <View style={styles.progressRow}>
             <Text style={styles.progressText}>
               {item.currentPage} / {item.totalPages > 0 ? item.totalPages : '?'} {t.pages}
             </Text>
             {onUpdateProgress && (
               <View style={styles.miniControls}>
                 <TouchableOpacity hitSlop={{top: 10, bottom: 10, left: 10, right: 10}} onPress={() => onUpdateProgress(item.id, Math.max(0, item.currentPage - 1))}>
                   <Ionicons name="remove-circle-outline" size={20} color="#a0a0a0" />
                 </TouchableOpacity>
                 <TouchableOpacity hitSlop={{top: 10, bottom: 10, left: 10, right: 10}} onPress={() => onUpdateProgress(item.id, item.currentPage + 1)}>
                   <Ionicons name="add-circle-outline" size={20} color="#a0a0a0" />
                 </TouchableOpacity>
               </View>
             )}
           </View>

           {item.totalPages > 0 && (
             <View style={styles.progressBarBg}>
               <View 
                 style={[
                   styles.progressBarFill, 
                   { width: `${Math.min(100, Math.round((item.currentPage / item.totalPages) * 100))}%` }
                 ]} 
               />
             </View>
           )}
        </View>
        
        <View style={styles.footer}>
           <TouchableOpacity 
             style={[styles.statusButton, { borderColor: getStatusColor(item.status) }]}
             onPress={() => onStatusChange(item.id, item.status)}
           >
             <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
               {/* Helper to translate status */}
               {item.status === 'watching' ? t.reading : 
                item.status === 'completed' ? t.read :
                item.status === 'plan_to_watch' ? t.planToRead :
                item.status === 'dropped' ? t.statusDropped : item.status}
             </Text>
           </TouchableOpacity>
           
           <Text style={styles.date}>
             {t.sortAdded}: {getFormattedDate(new Date(item.addedAt))}
           </Text>
        </View>
      </View>
    </View>
  );
});

import { AppColors } from '@/src/theme/colors';

const Colors = AppColors;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    height: 140,
  },
  poster: {
    width: 93,
    height: 140,
    backgroundColor: Colors.surfaceElevated,
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusButton: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniControls: {
    flexDirection: 'row',
    gap: 8,
  },
  date: {
    color: Colors.textMuted,
    fontSize: 10,
  },
});

export default BookItem;
