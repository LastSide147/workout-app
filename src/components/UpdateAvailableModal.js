import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator} from 'react-native';
import {useUpdatesContext} from '../context/UpdatesContext';import colors from '../theme/colors';
import typography from '../theme/typography';

// Модалка "доступно обновление" — один раз при входе в приложение,
// если обновление скачано и пользователь ещё не закрывал именно ЭТО
// обновление (id запоминается в AsyncStorage, см. appUpdates.js).
// Раньше вместо неё была узкая плашка сверху экрана — убрали, ломала
// вёрстку.
export default function UpdateAvailableModal() {
  const {showUpdateModal, dismissUpdateModal, applyUpdate} = useUpdatesContext();
  // Скачивание (fetchUpdateAsync) может идти заметное время, а после
  // него приложение просто перезапускается само (reloadAsync) — раньше
  // между нажатием и этим моментом не было вообще никакой индикации,
  // из-за чего казалось, что кнопка "не сработала". applying просто
  // включает спиннер вместо текста и блокирует обе кнопки на это время;
  // сбрасывать его в случае успеха не нужно — приложение и так вот-вот
  // перезапустится.
  const [applying, setApplying] = React.useState(false);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applyUpdate();
    } catch (error) {
      setApplying(false);
      Alert.alert('Не удалось скачать обновление', String(error));
    }
  };

  return (
    <Modal
      visible={showUpdateModal}
      transparent
      animationType="fade"
      onRequestClose={applying ? undefined : dismissUpdateModal}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Доступно обновление</Text>
          <Text style={styles.text}>
            Вышла новая версия приложения. Обновить сейчас или напомнить позже?
          </Text>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleApply}
            disabled={applying}
            testID="update-modal-apply-button">
            {applying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.updateButtonText}>Обновить</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={dismissUpdateModal}
            disabled={applying}
            testID="update-modal-later-button">
            <Text style={styles.laterButtonText}>Позже</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {...typography.sectionTitle, fontSize: 18, color: colors.textPrimary, marginBottom: 8},
  text: {...typography.body, color: colors.textSecondary, marginBottom: 20},
  updateButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButtonText: {...typography.button, fontSize: 15, color: colors.white},
  laterButton: {paddingVertical: 10, alignItems: 'center'},
  laterButtonText: {...typography.button, fontSize: 15, color: colors.textMuted},
});