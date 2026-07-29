import firestore from '@react-native-firebase/firestore';
import {getWithOfflineFallback} from './offlineSync';

function workoutsCollection(userId) {
  return firestore().collection('users').doc(userId).collection('workouts');
}

function entriesCollection(userId, dateKey) {
  return workoutsCollection(userId).doc(dateKey).collection('entries');
}

export function subscribeToWorkoutDays(userId, onData) {
  return workoutsCollection(userId).onSnapshot(snapshot => {
    const days = {};
    snapshot.docs.forEach(doc => {
      days[doc.id] = doc.data();
    });
    onData(days);
  });
}

export async function getDay(userId, dateKey) {
  const doc = await getWithOfflineFallback(workoutsCollection(userId).doc(dateKey));
  return doc.exists ? doc.data() : null;
}

export async function getDayEntries(userId, dateKey) {
  const snapshot = await getWithOfflineFallback(entriesCollection(userId, dateKey));
  return snapshot.docs.map(doc => ({
    exercise: doc.id,
    reps: doc.data().reps,
  }));
}

export function subscribeToDayEntries(userId, dateKey, onData) {
  return entriesCollection(userId, dateKey).onSnapshot(
    snapshot => {
      const entries = snapshot.docs.map(doc => ({
        exercise: doc.id,
        reps: doc.data().reps,
      }));
      onData(entries);
    },
    error => {
      console.error('Ошибка подписки на записи дня:', error);
      onData([]);
    },
  );
}

// Сохраняет ОДНО упражнение сразу, как только пользователь подтвердил
// его галочкой — отдельной кнопки "Сохранить тренировку" больше нет.
// День помечается как "есть тренировка", статус (выходной/пропуск/
// травма) сбрасывается, раз в этот день появилось упражнение.
//
// Помимо этого, повторения ВСЕХ упражнений дня дублируются в поле
// byExercise прямо на документе дня — ЦЕЛОЙ картой, не точечным путём.
//
// РАНЬШЕ здесь стоял точечный путь ("byExercise.НазваниеУпражнения") —
// расчёт был на то, что Firestore распознает точку в ключе как
// вложенность и обновит только один ключ карты, не трогая остальные.
// Это НЕ СРАБОТАЛО: в @react-native-firebase/firestore обычный (не
// FieldPath) JS-ключ с точкой при .set(..., {merge:true}) сохраняется
// БУКВАЛЬНО, как отдельное поле верхнего уровня с точкой в названии —
// вместо вложенности получались поля вида "byExercise.Название" рядом
// с так и остававшимся пустым byExercise: {}. Именно это увидел
// пользователь в Firebase Console: "Мои упражнения" в Статистике
// читает byExercise как карту и не находит там ничего, хотя данные по
// факту записаны — просто не туда.
//
// ИСПРАВЛЕНИЕ: вместо того чтобы полагаться на путь Firestore, экран
// (DayEditor) и так уже ЗНАЕТ полную актуальную карту "упражнение →
// повторения" на момент вызова (exerciseReps с добавленным/убранным
// упражнением) — просто передаём её сюда целиком четвёртым аргументом
// (allExerciseReps) и пишем как ОБЫЧНОЕ значение поля byExercise (не
// путь). При merge:true это полностью заменяет карту целиком на
// актуальную — ровно то же самое, что мы и хотели, просто без
// зависимости от того, как именно эта библиотека трактует точку в
// строковом ключе.
export async function setExerciseEntry(userId, dateKey, exerciseName, reps, allExerciseReps) {
  const batch = firestore().batch();

  batch.set(entriesCollection(userId, dateKey).doc(exerciseName), {
    reps,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  batch.set(
    workoutsCollection(userId).doc(dateKey),
    {
      date: dateKey,
      status: null,
      hasExercises: true,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      byExercise: allExerciseReps || {},
    },
    {merge: true},
  );

  return batch.commit();
}

// Удаляет ОДНО упражнение сразу (крестик у уже добавленного
// упражнения). hasRemainingExercises передаётся с экрана — true, если
// после удаления в этот день остаются другие упражнения.
//
// allExerciseReps — актуальная карта "упражнение → повторения" ПОСЛЕ
// удаления (DayEditor уже её посчитал перед вызовом) — записывается
// целиком, той же логикой, что и в setExerciseEntry выше (см. подробное
// объяснение там, почему это не точечный путь).
export async function deleteExerciseEntry(
  userId,
  dateKey,
  exerciseName,
  hasRemainingExercises,
  allExerciseReps,
) {
  const batch = firestore().batch();

  batch.delete(entriesCollection(userId, dateKey).doc(exerciseName));

  batch.set(
    workoutsCollection(userId).doc(dateKey),
    {
      date: dateKey,
      status: null,
      hasExercises: hasRemainingExercises,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      byExercise: allExerciseReps || {},
    },
    {merge: true},
  );

  return batch.commit();
}

export async function setStatusForDate(
  userId,
  dateKey,
  status,
  previousExerciseNames = [],
) {
  const batch = firestore().batch();

  previousExerciseNames.forEach(name =>
    batch.delete(entriesCollection(userId, dateKey).doc(name)),
  );

  batch.set(workoutsCollection(userId).doc(dateKey), {
    date: dateKey,
    status,
    hasExercises: false,
    // Все упражнения этого дня удаляются одним махом (не по одному) —
    // здесь можно просто полностью заменить byExercise на пустой
    // объект, без точечных путей.
    byExercise: {},
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return batch.commit();
}

export async function clearDay(userId, dateKey, previousExerciseNames = []) {
  const batch = firestore().batch();

  previousExerciseNames.forEach(name =>
    batch.delete(entriesCollection(userId, dateKey).doc(name)),
  );
  batch.delete(workoutsCollection(userId).doc(dateKey));

  return batch.commit();
}

export async function autoFillMissedDays(userId, days, getDateKey, parseDateKey) {
  const dateKeys = Object.keys(days);
  if (dateKeys.length === 0) {
    return;
  }

  const earliestKey = dateKeys.reduce((min, key) => (key < min ? key : min), dateKeys[0]);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  if (earliestKey > yesterdayKey) {
    return;
  }

  const missedKeys = [];
  const cursor = parseDateKey(earliestKey);

  while (getDateKey(cursor) <= yesterdayKey) {
    const key = getDateKey(cursor);
    const dayData = days[key];
    const isEmpty = !dayData || (!dayData.hasExercises && !dayData.status);
    if (isEmpty) {
      missedKeys.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  await Promise.all(
    missedKeys.map(dateKey =>
      setStatusForDate(userId, dateKey, 'skipped', []).catch(error =>
        console.error(`Не удалось автоматически отметить пропуск за ${dateKey}:`, error),
      ),
    ),
  );
}

// Одноразовый бэкфилл/самолечение поля byExercise. Нужен для ДВУХ
// разных случаев:
//
// 1. СТАРЫЕ дни, созданные ДО того, как setExerciseEntry начал вообще
//    писать это поле — там byExercise просто отсутствует.
// 2. ИСПОРЧЕННЫЕ дни — те, что попали под баг с точечным путём (см.
//    подробное объяснение в setExerciseEntry выше): у них byExercise
//    ЕСТЬ, но пустой ({}), а настоящие числа осели рядом отдельными
//    "мусорными" полями верхнего уровня вида "byExercise.Название".
//    Раньше проверка "!days[dateKey].byExercise" такие дни пропускала:
//    пустой объект {} в JS — это ИСТИНА (!{}=== false), а не "нет
//    значения", поэтому бэкфилл считал такой день уже обработанным и
//    даже не пытался его починить.
//
// Теперь условие — "hasExercises есть, а полезных ключей в byExercise
// нет" (Object.keys(...).length === 0), это ловит ОБА случая сразу.
// А сама починка не только перечитывает entries (настоящий источник
// правды) и переписывает byExercise целиком, но и УДАЛЯЕТ найденные
// мусорные поля "byExercise.Название" — их имена уже известны прямо из
// объекта days (см. strayKeys ниже), читать что-то дополнительно для
// этого не нужно.
//
// В отличие от бэкфилла бакетов рейтинга (ensureBucketsBackfilled в
// services/ratings.js), здесь НЕ нужна защита транзакцией от гонки
// при повторном запуске: там бэкфилл прибавляет (increment) дельту к
// уже существующему значению, и повтор испортил бы сумму задвоением.
// Здесь же byExercise просто ПЕРЕЗАПИСЫВАЕТСЯ полным свежим значением
// из entries — запусти эту функцию хоть два раза подряд, хоть с двух
// устройств одновременно, результат всё равно останется правильным.
export async function ensureWorkoutDayTotalsBackfilled(userId, days) {
  const dateKeysToBackfill = Object.keys(days).filter(dateKey => {
    const day = days[dateKey];
    if (!day.hasExercises) {
      return false;
    }
    const byExercise = day.byExercise || {};
    return Object.keys(byExercise).length === 0;
  });

  if (dateKeysToBackfill.length === 0) {
    return;
  }

  await Promise.all(
    dateKeysToBackfill.map(async dateKey => {
      try {
        const entries = await getDayEntries(userId, dateKey);
        const byExercise = {};
        entries.forEach(({exercise, reps}) => {
          byExercise[exercise] = reps;
        });

        // Мусорные поля от старого (сломанного) точечного пути — их
        // видно прямо в самом документе дня, как обычные ключи объекта
        // days[dateKey], буквально начинающиеся с "byExercise.".
        // Каждое такое поле нужно явно удалить через
        // firestore.FieldValue.delete() — просто не упомянуть его в
        // записи недостаточно, при merge:true поля, которых нет в
        // переданном объекте, остаются как есть.
        const strayKeys = Object.keys(days[dateKey]).filter(key =>
          key.startsWith('byExercise.'),
        );
        const update = {byExercise};
        strayKeys.forEach(key => {
          update[key] = firestore.FieldValue.delete();
        });

        await workoutsCollection(userId).doc(dateKey).set(update, {merge: true});
      } catch (error) {
        console.error(
          `Не удалось перенести упражнения за ${dateKey} в документ дня (бэкфилл byExercise):`,
          error,
        );
      }
    }),
  );
}