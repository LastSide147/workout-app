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
// Помимо этого, повторения ЭТОГО упражнения дублируются в поле
// byExercise прямо на документе дня — через точечный путь
// ("byExercise.НазваниеУпражнения"), а не как вложенный объект. Так
// Firestore обновляет ТОЛЬКО этот один ключ карты, не затирая
// остальные упражнения, уже записанные туда в этот день. Смысл: раньше
// экран "Мои упражнения" при каждом открытии сам ходил в базу за
// entries КАЖДОГО дня выбранного периода (день/неделя/месяц/год) —
// это и были самые дорогие чтения в статистике. Документ дня и так уже
// читается целиком, бесплатно и постоянно (через subscribeToWorkoutDays,
// см. ниже) — раз мы всё равно каждый раз пишем в этот документ, имеет
// смысл добавить туда же и сумму по упражнению, чтобы "Мои упражнения"
// могли брать готовые числа из уже загруженных дней и вообще не делать
// отдельных чтений (см. loadTotals в StatisticsScreen.js).
export async function setExerciseEntry(userId, dateKey, exerciseName, reps) {
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
      [`byExercise.${exerciseName}`]: reps,
    },
    {merge: true},
  );

  return batch.commit();
}

// Удаляет ОДНО упражнение сразу (крестик у уже добавленного
// упражнения). hasRemainingExercises передаётся с экрана — true, если
// после удаления в этот день остаются другие упражнения.
//
// Ключ этого упражнения в byExercise удаляется точечным путём через
// firestore.FieldValue.delete() — снова только один ключ карты, а не
// вся карта целиком.
export async function deleteExerciseEntry(
  userId,
  dateKey,
  exerciseName,
  hasRemainingExercises,
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
      [`byExercise.${exerciseName}`]: firestore.FieldValue.delete(),
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

// Одноразовый бэкфилл поля byExercise для СТАРЫХ дней, которые были
// созданы ДО того, как setExerciseEntry/deleteExerciseEntry начали
// записывать его на документ дня. Без этого у старых дней это поле
// просто отсутствует, и "Мои упражнения" считало бы по ним 0 вместо
// настоящих чисел.
//
// Для каждого дня с hasExercises=true, но без byExercise, разово
// читаем его подколлекцию entries (это и есть ЕДИНСТВЕННОЕ чтение —
// дальше, после того как поле записано на день, оно уже приходит
// бесплатно вместе с days через subscribeToWorkoutDays, и повторно
// сюда заходить не нужно).
//
// В отличие от бэкфилла бакетов рейтинга (ensureBucketsBackfilled в
// services/ratings.js), здесь НЕ нужна защита транзакцией от гонки
// при повторном запуске: там бэкфилл прибавляет (increment) дельту к
// уже существующему значению, и повтор испортил бы сумму задвоением.
// Здесь же byExercise просто ПЕРЕЗАПИСЫВАЕТСЯ полным свежим значением
// из entries — запусти эту функцию хоть два раза подряд, хоть с двух
// устройств одновременно, результат всё равно останется правильным.
export async function ensureWorkoutDayTotalsBackfilled(userId, days) {
  const dateKeysToBackfill = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises && !days[dateKey].byExercise,
  );

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
        await workoutsCollection(userId)
          .doc(dateKey)
          .set({byExercise}, {merge: true});
      } catch (error) {
        console.error(
          `Не удалось перенести упражнения за ${dateKey} в документ дня (бэкфилл byExercise):`,
          error,
        );
      }
    }),
  );
}