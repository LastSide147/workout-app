import React from 'react';
import {TouchableOpacity, Alert} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useUpdatesContext} from '../context/UpdatesContext';
import colors from '../theme/colors';

// Иконка обновления в заголовке экрана — показывается ТОЛЬКО когда
// updateAvailable === true (обновление уже скачано в фоне, см.
// appUpdates.js). На "Профиль" не попадает вообще, потому что этот
// компонент используется только в заголовках трёх других вкладок —
// там уже есть своя секция "Обновления" с тем же действием.
export default function UpdateAvailableIcon() {
  const {updateAvailable, applyUpdate} = useUpdatesContext();

  if (!updateAvailable) {
    return null;
  }

  const handlePress = () => {
    Alert.alert(
      'Обновить приложение',
      'Обновление скачается и приложение перезапустится, чтобы его применить. Продолжить?',
      [
        {text: 'Отмена', style: 'cancel'},
        {
          text: 'Обновить',
          onPress: async () => {
            try {
              await applyUpdate();
            } catch (error) {
              Alert.alert('Не удалось скачать обновление', String(error));
            }
          },
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
      testID="update-available-icon">
      <MaterialCommunityIcons name="cloud-download" size={26} color={colors.success} />
    </TouchableOpacity>
  );
}