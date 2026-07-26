import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_UPDATE_KEY = 'dismissedUpdateId';

// ТОЛЬКО проверяет сервер EAS на наличие новой публикации — ничего не
// скачивает. Раньше здесь же сразу вызывался fetchUpdateAsync() при
// каждом открытии приложения "про запас" — а сам факт СКАЧИВАНИЯ
// обновления в expo-updates автоматически делает его тем бандлом,
// который запустится на СЛЕДУЮЩИЙ холодный старт, даже если
// пользователь ни разу не нажал кнопку "Обновить". Именно поэтому
// обновление применялось "само" при закрытии и повторном открытии
// приложения. Теперь скачивание вынесено в downloadAndApplyUpdate
// ниже и происходит СТРОГО в момент нажатия кнопки пользователем.
export async function checkForUpdate() {
  // В Expo Go и dev-сборках (Metro) система обновлений выключена —
  // это не ошибка, просто проверять нечего.
  if (!Updates.isEnabled) {
    return {available: false, updateId: null};
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return {available: false, updateId: null};
    }

    const updateId =
      check.manifest && check.manifest.id ? check.manifest.id : null;
    return {available: true, updateId};
  } catch (error) {
    console.error('Ошибка проверки обновления:', error);
    return {available: false, updateId: null};
  }
}

// Запоминаем, что пользователь закрыл окно/иконку для конкретного
// обновления (по его id) — чтобы при следующих входах модалка не
// показывалась повторно для ТОГО ЖЕ обновления.
export async function dismissUpdateBanner(updateId) {
  if (!updateId) {
    return;
  }
  try {
    await AsyncStorage.setItem(DISMISSED_UPDATE_KEY, updateId);
  } catch (error) {
    console.error('Не удалось сохранить статус плашки обновления:', error);
  }
}

export async function wasUpdateDismissed(updateId) {
  if (!updateId) {
    return false;
  }
  try {
    const dismissed = await AsyncStorage.getItem(DISMISSED_UPDATE_KEY);
    return dismissed === updateId;
  } catch (error) {
    console.error('Не удалось прочитать статус плашки обновления:', error);
    return false;
  }
}

// Скачивает обновление и СРАЗУ ЖЕ применяет его (перезапуск на новый
// бандл). Вызывается ТОЛЬКО из обработчика кнопки "Обновить" — строго
// по выбору пользователя, ничего заранее в фоне не скачивается.
export async function downloadAndApplyUpdate() {
  await Updates.fetchUpdateAsync();
  await Updates.reloadAsync();
}