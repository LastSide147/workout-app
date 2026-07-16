import {useEffect, useMemo, useState} from 'react';
import {subscribeToExercises} from '../services/exercises';

// Общий каталог упражнений для всех пользователей. С появлением папок
// коллекция "exercises" хранит вперемешку и одиночные упражнения
// верхнего уровня, и папки, и упражнения внутри папок — сырые данные
// приходят из сервиса одним списком (rawItems), а здесь уже
// раскладываются на удобные для экранов срезы.
export default function useExercises() {
  const [rawItems, setRawItems] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToExercises(list => {
      setRawItems(list);
      setLoadingExercises(false);
    });
    return unsubscribe;
  }, []);

  return useMemo(() => {
    const allExerciseDocs = rawItems.filter(item => item.type === 'exercise');
    const folderDocs = rawItems.filter(item => item.type === 'folder');

    // Одиночные упражнения верхнего уровня — то, чем раньше был
    // единственный список "exercises". DayEditor, экран управления и
    // модалка выбора продолжают получать именно этот срез под тем же
    // именем, чтобы их логика не менялась.
    const exercises = allExerciseDocs
      .filter(item => !item.folderId)
      .sort((a, b) => a.order - b.order);

    const folders = folderDocs
      .slice()
      .sort((a, b) => a.folderOrder - b.folderOrder);

    // Упражнения каждой папки — отдельным списком, отсортированным
    // внутри своей папки независимо от других папок и от верхнего
    // уровня (у каждой папки свой отсчёт order).
    const folderExercises = {};
    folders.forEach(folder => {
      folderExercises[folder.id] = allExerciseDocs
        .filter(item => item.folderId === folder.id)
        .sort((a, b) => a.order - b.order);
    });

    // Коэффициенты и названия для расчёта рейтинга и статистики
    // должны учитывать ВСЕ упражнения — и одиночные, и лежащие внутри
    // папок, потому что рейтинг и суммы повторений считаются по имени
    // упражнения независимо от того, где оно организационно лежит в
    // каталоге.
    const exerciseNames = allExerciseDocs.map(item => item.name);
    const exerciseCoefficients = {};
    allExerciseDocs.forEach(item => {
      exerciseCoefficients[item.name] = item.coefficient;
    });

    return {
      exercises,
      folders,
      folderExercises,
      allExercises: allExerciseDocs,
      exerciseNames,
      exerciseCoefficients,
      loadingExercises,
    };
  }, [rawItems, loadingExercises]);
}