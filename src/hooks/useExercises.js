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
    const allExerciseDocsRaw = rawItems.filter(item => item.type === 'exercise');
    const folderDocs = rawItems.filter(item => item.type === 'folder');

    const folders = folderDocs
      .slice()
      .sort((a, b) => a.folderOrder - b.folderOrder);

    const folderNameById = {};
    folders.forEach(folder => {
      folderNameById[folder.id] = folder.name;
    });

    // displayName — полное имя, под которым упражнение фигурирует
    // ВЕЗДЕ вне экрана управления (список коэффициентов, выбор в
    // тренировке, статистика, рейтинг): для упражнения внутри папки
    // это "Название папки Название упражнения" (например, "Подтягивание
    // с отягощением 8 килограмм"), для одиночного верхнего уровня —
    // просто его name. Поле "name" в Firestore при этом НЕ меняется —
    // мастер по-прежнему видит и редактирует в управлении упражнениями
    // только короткое имя (например, "8 килограмм").
    const allExerciseDocs = allExerciseDocsRaw.map(item => {
      const displayName = item.folderId
        ? `${folderNameById[item.folderId] || ''} ${item.name}`.trim()
        : item.name;
      return {...item, displayName};
    });

    // Одиночные упражнения верхнего уровня — то, чем раньше был
    // единственный список "exercises". DayEditor, экран управления и
    // модалка выбора продолжают получать именно этот срез под тем же
    // именем, чтобы их логика не менялась.
    const exercises = allExerciseDocs
      .filter(item => !item.folderId)
      .sort((a, b) => a.order - b.order);

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
    // папок — и ключом теперь служит именно displayName, потому что
    // это и есть тот идентификатор, под которым упражнение реально
    // сохраняется при добавлении в тренировку (см. DayEditor).
    const exerciseNames = allExerciseDocs.map(item => item.displayName);
    const exerciseCoefficients = {};
    allExerciseDocs.forEach(item => {
      exerciseCoefficients[item.displayName] = item.coefficient;
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