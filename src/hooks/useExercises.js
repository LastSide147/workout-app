import {useEffect, useState} from 'react';
import {subscribeToExercises} from '../services/exercises';

export default function useExercises() {
  const [exercises, setExercises] = useState([]); // [{id, name, order, coefficient}]
  const [loadingExercises, setLoadingExercises] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToExercises(list => {
      setExercises(list);
      setLoadingExercises(false);
    });
    return unsubscribe;
  }, []);

  const exerciseNames = exercises.map(item => item.name);

  const exerciseCoefficients = {};
  exercises.forEach(item => {
    exerciseCoefficients[item.name] = item.coefficient;
  });

  return {exercises, exerciseNames, exerciseCoefficients, loadingExercises};
}