import React from 'react';
import {View, Text, TouchableOpacity, FlatList, StyleSheet, Linking} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import licenses from '../constants/licenses';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Список сторонних данных/библиотек с обязательной атрибуцией
// (сейчас — GeoNames для городов). Новые пункты добавляются в
// src/constants/licenses.js — сюда ничего менять не нужно.
export default function LicensesScreen({onClose}) {
  const renderItem = ({item}) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.license}</Text>
        </View>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      <TouchableOpacity
        onPress={() => Linking.openURL(item.url)}
        testID={`license-link-${item.id}`}>
        <Text style={styles.link}>{item.url}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} testID="licenses-close-button">
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Лицензии</Text>
        {/* Пустой блок той же ширины, что и кнопка закрытия слева —
            чтобы заголовок был по центру, а не съезжал вправо. */}
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={licenses}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Сторонних лицензий пока нет</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeIcon: {fontSize: 22, color: colors.textPrimary},
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
  },
  headerSpacer: {width: 22},

  listContent: {padding: 16},
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {...typography.bodyBold, color: colors.textPrimary, fontSize: 16},
  badge: {
    backgroundColor: colors.chip,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {...typography.caption, fontSize: 12, color: colors.textSecondary},
  description: {...typography.body, color: colors.textSecondary, marginBottom: 8},
  link: {...typography.caption, fontSize: 13, color: colors.primary},
  emptyText: {
    ...typography.caption,
    color: colors.textPlaceholder,
    textAlign: 'center',
    marginTop: 40,
  },
});