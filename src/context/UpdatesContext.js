import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  checkAndDownloadUpdate,
  wasUpdateDismissed,
  dismissUpdateBanner,
  applyDownloadedUpdate,
} from '../services/appUpdates';

const UpdatesContext = createContext(null);

// Оборачивает авторизованную часть приложения. Проверка обновления
// запускается один раз при монтировании — то есть ровно один раз
// за "вход" пользователя, как и требовалось.
export function UpdatesProvider({children}) {
  const [updateId, setUpdateId] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result = await checkAndDownloadUpdate();
      if (cancelled) {
        return;
      }

      if (result.available && result.updateId) {
        setUpdateId(result.updateId);
        const dismissed = await wasUpdateDismissed(result.updateId);
        if (!cancelled) {
          setShowBanner(!dismissed);
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

  const dismiss = useCallback(() => {
    setShowBanner(false);
    dismissUpdateBanner(updateId).catch(error =>
      console.error('Не удалось запомнить закрытие плашки обновления:', error),
    );
  }, [updateId]);

  const value = {
    updateAvailable: Boolean(updateId),
    showBanner,
    checking,
    dismiss,
    applyUpdate: applyDownloadedUpdate,
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