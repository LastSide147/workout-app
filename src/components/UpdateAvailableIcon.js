import React from 'react';
import {TouchableOpacity} from 'react-native';
import {MaterialCommunityIcons} from '@expo/vector-icons';
import {useUpdatesContext} from '../context/UpdatesContext';
import colors from '../theme/colors';

// Иконка обновления в заголовке экрана — показывается ТОЛЬКО когда
// updateAvailable === true (обновление уже скачано в фоне, см.
// appUpdates.js). На "Профиль" не попадает вообще, потому что этот
// компонент используется только в заголовках трёх других вкладок —
// там уже есть своя секция "Обновления" с тем же действием.
//
// Раньше нажатие на иконку показывало СВОЙ отдельный Alert.alert с
// подтверждением и само вызывало applyUpdate — то есть обновление
// вообще-то было устроено ДВУМЯ разными путями: через модальное окно
// UpdateAvailableModal (при входе в приложение) и через этот Alert (по
// нажатию на иконку). Именно второй путь у пользователя не срабатывал
// (окно подтверждения появлялось, но самого обновления не происходило)
// — теперь его больше нет: иконка просто открывает ТО ЖЕ САМОЕ
// модальное окно (openUpdateModal), которое уже проверено и работает
// при входе в приложение. Один код показа обновления на оба случая.
export default function UpdateAvailableIcon() {
  const {updateAvailable, openUpdateModal} = useUpdatesContext();

  if (!updateAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={openUpdateModal}
      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
      testID="update-available-icon">
      <MaterialCommunityIcons name="cloud-download" size={26} color={colors.success} />
    </TouchableOpacity>
  );
}