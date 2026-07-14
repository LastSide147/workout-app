import {useEffect, useState} from 'react';
import {subscribeToSelectedExercises} from '../services/selectedExercises';

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
    const unsubscribe = subscribeToSelectedExercises(userId, list => {
      setSelectedExercises(list);
      setLoadingSelected(false);
    });
    return unsubscribe;
  }, [userId]);

  const selectedExerciseNames = selectedExercises.map(item => item.name);

  return {selectedExercises, selectedExerciseNames, loadingSelected};
}
