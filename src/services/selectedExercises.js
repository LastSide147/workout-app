import firestore from '@react-native-firebase/firestore';

// Персональный список упражнений пользователя.
//
// Не путать с общим каталогом упражнений (services/exercises.js) —
// тот управляется мастером в разделе "Профиль" и определяет, что
// вообще СУЩЕСТВУЕТ в приложении. Этот файл — про то, что КОНКРЕТНЫЙ
// пользователь решил добавить себе на экраны "Тренировка"/"История"
// через кнопку "+".
//
// Документ хранится по ИМЕНИ упражнения (а не по id из общего
// каталога) — так же, как записи тренировок в workoutDays.js уже
// используют имя упражнения как ключ документа. Это нужно, чтобы
// можно было напрямую сверять личный список с уже сохранёнными
// записями тренировок без дополнительных подстановок id → имя.
function selectedExercisesCollection(userId) {
  return firestore()
    .collection('users')
    .doc(userId)
    .collection('selectedExercises');
}

// Подписка (а не разовое чтение) — как и подписка на дни тренировок в
// workoutDays.js. Это даёт два важных свойства бесплатно:
// 1) после logout/login и в офлайне список читается из локального
//    кэша Firestore автоматически, ничего досочинять не нужно;
// 2) добавление/удаление упражнения отражается на экране сразу же,
//    как только запись применена локально — без ручного обновления
//    состояния компонента (в отличие от повторений, которые
//    читаются разовым запросом и поэтому обновляются оптимистично
//    вручную в DayEditor).
//
// Вторым аргументом в onData передаём метаданные снимка (fromCache) —
// они нужны хуку useSelectedExercises, чтобы не путать "список
// реально пуст" с "кэш ещё не успел прогрузиться при холодном старте".
export function subscribeToSelectedExercises(userId, onData) {
  return selectedExercisesCollection(userId)
    .orderBy('order', 'asc')
    .onSnapshot(
      snapshot => {
        const list = snapshot.docs.map(doc => ({
          name: doc.id,
          order: doc.data().order,
        }));
        onData(list, {fromCache: snapshot.metadata.fromCache});
      },
      error => {
        console.error('Ошибка подписки на личный список упражнений:', error);
        onData([], {fromCache: false});
      },
    );
}

// Добавляет упражнение в личный список. currentSelected передаётся с
// экрана (уже загруженный список), чтобы посчитать следующий порядковый
// номер — так упражнение всегда добавляется в конец списка.
// {merge: true} делает вызов безопасным при повторном добавлении: если
// документ уже существует, поля просто перезапишутся, дублей не будет.
export async function addSelectedExercise(userId, exerciseName, currentSelected = []) {
  const maxOrder = currentSelected.reduce(
    (max, item) => Math.max(max, item.order || 0),
    0,
  );

  await selectedExercisesCollection(userId)
    .doc(exerciseName)
    .set(
      {
        order: maxOrder + 1,
        addedAt: firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
}

// Убирает упражнение из личного списка. Уже сохранённые тренировки
// (в т.ч. за сегодня) этим НЕ затрагиваются — удаляется только сам
// факт "показывать это упражнение в списке для добавления". Прошлые
// записи в workouts/.../entries остаются как есть.
export async function removeSelectedExercise(userId, exerciseName) {
  await selectedExercisesCollection(userId).doc(exerciseName).delete();
}