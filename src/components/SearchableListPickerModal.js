import React, {useMemo, useState, useEffect} from 'react';
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Keyboard,
  StyleSheet,
} from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Модальное окно выбора ОДНОГО значения из списка — версия для длинных
// списков (страны, города), где ни сетка колонками (как в
// SimpleListPickerModal), ни прокрутка "в слепую" сами по себе не
// удобны. Здесь оба способа выбора сразу, как и просили:
//   1) начать вводить текст — список сверху вниз сужается по совпадению
//      с началом или серединой названия;
//   2) ничего не вводить и просто пролистать — список изначально
//      отсортирован по алфавиту (это делает не компонент, а сами
//      данные в constants/countries.js и constants/cities.js), и
//      прокрутка работает как обычно.
// Один компонент используется для ОБОИХ полей (страна и город) —
// разница только в том, какой options и testIDPrefix ему передают.
//
// Окно всегда прижато к верхнему краю экрана (см. overlay.paddingTop
// ниже) — специально ПОСТОЯННО, а не только при появлении клавиатуры.
// Раньше окно было по центру, и когда открывалась клавиатура, Android
// пересчитывал доступную высоту экрана заново — окно, оставаясь
// центрированным, "прыгало" и сжималось. Раз верх всегда фиксирован
// (не зависит от того, открыта клавиатура или нет), пересчитывать и
// "замораживать" здесь больше нечего — при появлении клавиатуры просто
// уменьшается доступное место снизу, и card.maxHeight (посчитанный в %
// от него) сам становится меньше, подтягивая только нижний край.
export default function SearchableListPickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchPlaceholder = 'Начните вводить...',
  testIDPrefix,
}) {
  const [query, setQuery] = useState('');

  // Поле поиска очищается каждый раз при новом открытии модалки —
  // иначе при следующем открытии (например, сначала искали "Моск",
  // выбрали Москву, потом открыли пикер снова) список сразу оказался
  // бы отфильтрован по старому запросу, а не показывал бы всё сначала.
  useEffect(() => {
    if (visible) {
      setQuery('');
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter(option => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSelect = value => {
    Keyboard.dismiss();
    onSelect(value);
    onClose();
  };

return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        {/* Второй TouchableOpacity нужен, чтобы тап ВНУТРИ карточки (по
            полю поиска или строке списка) не закрывал модалку — событие
            не всплывает до overlay выше. */}
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textPlaceholder}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            testID={`${testIDPrefix}-search-input`}
          />

          <FlatList
            data={filteredOptions}
            keyExtractor={item => String(item.value)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Ничего не найдено</Text>
            }
            renderItem={({item}) => {
              const isActive = item.value === selectedValue;
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => handleSelect(item.value)}
                  testID={`${testIDPrefix}-option-${item.value}`}>
                  <Text style={[styles.rowText, isActive && styles.rowTextActive]}>
                    {item.label}
                  </Text>
                  {isActive ? <Text style={styles.checkmark}>✓</Text> : null}
                </TouchableOpacity>
              );
            }}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const PICKER_TOP_OFFSET = 180;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: PICKER_TOP_OFFSET,
  },
  card: {
    width: '86%',
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  title: {...typography.sectionTitle, fontSize: 16, color: colors.textPrimary, marginBottom: 12},
  searchInput: {
    height: 44,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  list: {flexGrow: 0, flexShrink: 1},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowText: {...typography.body, fontSize: 15, color: colors.textPrimary},
  rowTextActive: {color: colors.primary, fontWeight: 'bold'},
  checkmark: {...typography.body, fontSize: 15, color: colors.primary},
  emptyText: {
    ...typography.caption,
    color: colors.textPlaceholder,
    textAlign: 'center',
    paddingVertical: 20,
  },
});