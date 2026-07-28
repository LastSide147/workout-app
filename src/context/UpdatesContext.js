import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  checkForUpdate,
  wasUpdateDismissed,
  dismissUpdateBanner,
  downloadAndApplyUpdate,
} from '../services/appUpdates';

const UpdatesContext = createContext(null);

// Оборачивает авторизованную часть приложения. Проверка обновления
// запускается один раз при монтировании — ровно один раз за "вход"
// пользователя. checkForUpdate ничего не скачивает — только
// спрашивает сервер, есть ли новая публикация.
export function UpdatesProvider({children}) {
  const [updateId, setUpdateId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await checkForUpdate();
      if (cancelled) {
        return;
      }

      if (result.available && result.updateId) {
        setUpdateId(result.updateId);
        const dismissed = await wasUpdateDismissed(result.updateId);
        if (!cancelled) {
          setShowUpdateModal(!dismissed);
        }
      }

      if (!cancelled) {
        setChecking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissUpdateModal = useCallback(() => {
    setShowUpdateModal(false);
    dismissUpdateBanner(updateId).catch(error =>
      console.error('Не удалось запомнить закрытие окна обновления:', error),
    );
  }, [updateId]);

  // Открыть то же самое модальное окно ВРУЧНУЮ — по нажатию на зелёную
  // иконку в заголовке "Тренировки"/"Истории"/"Статистики" (см.
  // UpdateAvailableIcon.js). Раньше иконка не открывала это окно, а
  // сама показывала свой Alert.alert с подтверждением — тот же самый
  // сценарий обновления, но другим, отдельным путём. Теперь и
  // автопоказ при входе, и нажатие на иконку ведут в ОДНО и то же окно
  // и вызывают ОДНУ и ту же функцию applyUpdate — разницы в поведении
  // между ними больше нет, потому что кода для показа обновления
  // теперь ровно один, а не два похожих.
  const openUpdateModal = useCallback(() => {
    setShowUpdateModal(true);
  }, []);

  const value = {
    updateAvailable: Boolean(updateId),
    showUpdateModal,
    checking,
    dismissUpdateModal,
    openUpdateModal,
    applyUpdate: downloadAndApplyUpdate,
  };

  return (
    <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>
  );
}

export function useUpdatesContext() {
  const ctx = useContext(UpdatesContext);
  if (!ctx) {
    throw new Error(
      'useUpdatesContext должен использоваться внутри UpdatesProvider',
    );
  }
  return ctx;
}