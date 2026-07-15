import {useEffect, useState} from 'react';
import {subscribeToSelectedExercises} from '../services/selectedExercises';

// Сколько ждать настоящий ответ с сервера, если первый снимок из
// локального кэша пришёл пустым. Тот же приём, что и с таймаутом
// офлайн-чтения в offlineSync.js — не верим подозрительно пустому
// кэшу сразу, но и не ждём бесконечно (если сети правда нет).
const EMPTY_CACHE_GRACE_MS = 2000;

// Личный список упражнений конкретного пользователя (в отличие от
// useExercises() — это общий каталог для всех). userId может прийти
// не сразу (пока идёт вход), поэтому подписка стартует только когда
// он появился.
export default function useSelectedExercises(userId) {
  const [selectedExercises, setSelectedExercises] = useState([]); // [{name, order}]
  const [loadingSelected, setLoadingSelected] = useState(true);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    setLoadingSelected(true);

    let settled = false;
    let timeoutId = null;

    const commit = list => {
      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setSelectedExercises(list);
      setLoadingSelected(false);
    };

    const unsubscribe = subscribeToSelectedExercises(userId, (list, meta) => {
      if (settled) {
        // Обычное обновление после первичной загрузки — применяем
        // сразу, тут особый случай холодного старта уже не актуален.
        setSelectedExercises(list);
        return;
      }

      const looksLikeColdCacheMiss = list.length === 0 && meta.fromCache;

      if (looksLikeColdCacheMiss && !timeoutId) {
        // Первый снимок — пустой и взят из локального кэша. Это может
        // быть реально пустой список у нового пользователя, а может
        // быть тот же сбой офлайн-кэша Firestore, что уже встречался
        // с записями тренировок при холодном старте. Даём Firestore
        // немного времени достучаться до сервера, прежде чем поверить
        // подозрительно пустому кэшу.
        timeoutId = setTimeout(() => commit(list), EMPTY_CACHE_GRACE_MS);
        return;
      }

      commit(list);
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [userId]);

  const selectedExerciseNames = selectedExercises.map(item => item.name);

  return {selectedExercises, selectedExerciseNames, loadingSelected};
}