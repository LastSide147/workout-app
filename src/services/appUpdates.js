import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_UPDATE_KEY = 'dismissedUpdateId';

// Проверяет сервер EAS на наличие новой публикации (eas update) и,
// если она есть, сразу скачивает бандл в фоне — но НЕ применяет его.
// Применение (перезапуск приложения) происходит только когда
// пользователь сам нажмёт кнопку в Профиле.
export async function checkAndDownloadUpdate() {
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

    const fetchResult = await Updates.fetchUpdateAsync();
    const updateId =
      fetchResult.manifest && fetchResult.manifest.id
        ? fetchResult.manifest.id
        : null;
    return {available: true, updateId};
  } catch (error) {
    console.error('Ошибка проверки обновления:', error);
    return {available: false, updateId: null};
  }
}

// Запоминаем, что пользователь закрыл плашку для конкретного
// обновления (по его id) — чтобы при следующих входах плашка не
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

// Применяет уже скачанное обновление — приложение перезапустится.
export async function applyDownloadedUpdate() {
  await Updates.reloadAsync();
}