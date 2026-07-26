import React from 'react';
import {Modal, Text, TouchableOpacity, FlatList, StyleSheet} from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Модальное окно выбора ОДНОГО значения из списка — сеткой в
// несколько колонок, без подложек и без разделительных линий у
// элементов (как в календаре: просто ряды чисел/названий). Тап по
// ячейке сразу выбирает значение и закрывает модалку. columns —
// сколько элементов в одном ряду (у месяцев и годов разное число,
// поэтому это параметр, а не зашитое значение).
export default function SimpleListPickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  columns = 3,
}) {
  // Ширина ячейки считается от числа колонок — так ряды выравниваются
  // одинаково независимо от того, короткое слово ("Май") или длинное
  // ("Сентябрь").
  const cellStyle = {flexBasis: `${100 / columns}%`};

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={options}
            numColumns={columns}
            keyExtractor={item => String(item.value)}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => {
              const isActive = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={[styles.cell, cellStyle]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  testID={`simple-picker-option-${item.value}`}>
                  <Text style={[styles.cellText, isActive && styles.cellTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '86%',
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  title: {...typography.sectionTitle, fontSize: 16, color: colors.textPrimary, marginBottom: 12},
  // Ячейка сетки — без фона и без рамок, просто текст по центру, как
  // числа в календаре.
  cell: {alignItems: 'center', paddingVertical: 12},
  cellText: {...typography.body, fontSize: 15, color: colors.textPrimary},
  cellTextActive: {color: colors.primary, fontWeight: 'bold'},
});