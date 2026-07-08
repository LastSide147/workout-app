import {useEffect, useState} from 'react';
import {subscribeToExercises} from '../services/exercises';

// Раньше EXERCISES был статическим массивом строк, импортированным напрямую
// из файла. Теперь данные приходят из Firestore асинхронно, поэтому
// появляется состояние загрузки (loadingExercises) — экраны должны
// его учитывать и не рендерить список, пока данные не пришли.
export default function useExercises() {
  const [exercises, setExercises] = useState([]); // [{id, name, order}]
  const [loadingExercises, setLoadingExercises] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToExercises(list => {
      setExercises(list);
      setLoadingExercises(false);
    });
    return unsubscribe;
  }, []);

  // exerciseNames — просто массив строк, как раньше был EXERCISES.
  // Нужен, чтобы минимально менять существующий код в DayEditor/StatisticsScreen.
  const exerciseNames = exercises.map(item => item.name);

  return {exercises, exerciseNames, loadingExercises};
}