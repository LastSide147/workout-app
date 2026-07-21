import firestore from '@react-native-firebase/firestore';
import {getCurrentUser} from './firebase';
import {getDayEntries} from './workoutDays';
import {getWithOfflineFallback, saveWithOfflineFallback} from './offlineSync';
import {getDateKey, getStartOfWeekKey, getStartOfMonthKey} from '../utils/date';

function ratingDayDoc(userId, dateKey) {
  return firestore()
    .collection('ratings')
    .doc(userId)
    .collection('days')
    .doc(dateKey);
}

function profileDoc(userId) {
  return firestore().collection('profiles').doc(userId);
}

// Никнейм пользователя — вынесено в отдельную функцию, чтобы им могли
// пользоваться и upsertProfileNickname (пишет в profiles/{userId}),
// и бакеты рейтинга ниже (им никнейм нужен, чтобы не делать отдельное
// чтение профиля на лидерборде — см. пояснение у bucketUserDoc).
function computeNickname(userId) {
  const user = getCurrentUser();
  const email = user && user.email;
  return email ? email.split('@')[0].slice(0, 50) : `Игрок-${userId.slice(0, 4)}`;
}

// ===================== БАКЕТЫ РЕЙТИНГА =====================
//
// Раньше лидерборд (fetchLeaderboard ниже) при КАЖДОМ открытии
// Статистики пересканировал документ рейтинга ЗА КАЖДЫЙ ДЕНЬ ВСЕХ
// пользователей в выбранном периоде (для "Год" — до 365 документов на
// каждого активного человека), а затем ещё отдельно читал профиль
// каждого найденного пользователя. Число операций росло и с числом
// пользователей, и с длиной истории — это и было узким местом при
// росте аудитории.
//
// Вместо пересчёта "на лету" храним ГОТОВУЮ сумму на каждого
// пользователя за каждый период (день/неделя/месяц/год):
//   leaderboardTotals/{periodKey}/users/{userId}
// При каждом изменении тренировки прибавляем к ней РАЗНИЦУ (дельту)
// между старым и новым значением дня — не пересчитываем всё заново, а
// досчитываем изменение. Открытие Статистики превращается в чтение
// нескольких готовых маленьких документов, а не в пересчёт истории.
//
// Почему НЕ один документ на период с картой "все пользователи сразу":
// он бы неограниченно рос с ростом числа пользователей и упёрся бы в
// лимит Firestore на размер документа (1 МиБ). Отдельный документ на
// каждого пользователя внутри периода — не растёт от чужой активности
// и никогда не пишется двумя пользователями одновременно.
//
// Никнейм храним прямо в этом же документе (denormalization) — это
// убирает и вторую часть старой проблемы: отдельное чтение профиля
// каждого пользователя лидерборду больше не нужно вообще.

function bucketUserDoc(periodKey, userId) {
  return firestore()
    .collection('leaderboardTotals')
    .doc(periodKey)
    .collection('users')
    .doc(userId);
}

// Ключи бакетов (день/неделя/месяц/год), к которым относится
// конкретная дата тренировки.
function getBucketKeysForDate(dateKey) {
  const date = new Date(dateKey);
  return {
    day: `day-${dateKey}`,
    week: `week-${getStartOfWeekKey(date)}`,
    month: `month-${getStartOfMonthKey(date)}`,
    year: `year-${date.getFullYear()}`,
  };
}

// Добавляет в batch (ещё не закоммиченный) прибавление дельты рейтинга
// и дельт по упражнениям сразу во все 4 бакета указанной даты.
// Дельта может быть отрицательной (например, упражнение убрали).
function applyBucketDeltas(batch, userId, dateKey, nickname, ratingDelta, byExerciseDelta) {
  const bucketKeys = getBucketKeysForDate(dateKey);

  Object.values(bucketKeys).forEach(periodKey => {
    // Собираем вложенный объект byExercise явно (а не через строку с
    // точкой вида 'byExercise.Название') — так set({merge:true})
    // гарантированно мёржит его как настоящую вложенную карту
    // byExercise: {...}, а не создаёт отдельное плоское поле с точкой
    // в названии. Именно из-за строкового ключа с точкой поле
    // byExercise раньше не появлялось в документе как надо.
    const byExerciseUpdate = {};
    Object.keys(byExerciseDelta).forEach(exercise => {
      if (byExerciseDelta[exercise]) {
        byExerciseUpdate[exercise] = firestore.FieldValue.increment(byExerciseDelta[exercise]);
      }
    });

    const update = {
      nickname,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      rating: firestore.FieldValue.increment(ratingDelta),
      byExercise: byExerciseUpdate,
    };

    batch.set(bucketUserDoc(periodKey, userId), update, {merge: true});
  });
}

// Разовое начисление баллов ВНЕ обычной тренировки (например,
// недельный бонус за заполненную неделю — см. services/weeklyBonus.js).
// docId — свой собственный id документа в ratings/{userId}/days (не
// dateKey, чтобы не быть затёртым обычным сохранением тренировки за
// этот день). Вызывающий код сам решает, в какой СВОЙ batch это
// добавить и когда его закоммитить — так бонус и, например, метка о
// его начислении попадают в БД одной атомарной пачкой.
export function addBonusToBatch(batch, userId, docId, dateKey, points) {
  const nickname = computeNickname(userId);

  batch.set(
    firestore().collection('ratings').doc(userId).collection('days').doc(docId),
    {
      rating: points,
      byExercise: {},
      date: dateKey,
      type: 'bonus',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
  );

  applyBucketDeltas(batch, userId, dateKey, nickname, points, {});
}

// ===================== ОБЫЧНЫЙ РЕЙТИНГ ДНЯ =====================

// Общий рейтинг (для "Все упражнения") — с учётом коэффициентов.
export function computeDayRating(exercisesList, exerciseCoefficients) {
  return exercisesList.reduce((total, item) => {
    const coefficient = exerciseCoefficients[item.exercise];
    if (typeof coefficient !== 'number') {
      return total;
    }
    return total + item.reps * coefficient;
  }, 0);
}

// Повторения по каждому упражнению за день — БЕЗ коэффициента.
// Используется, когда выбран фильтр по конкретному упражнению —
// там нужен топ по количеству повторений, а не взвешенное число.
export function computeDayRepsByExercise(exercisesList) {
  const byExercise = {};
  exercisesList.forEach(item => {
    byExercise[item.exercise] = item.reps;
  });
  return byExercise;
}

// Сохраняет рейтинг дня И одновременно прибавляет разницу (не всё
// число целиком!) к бакетам дня/недели/месяца/года — иначе при
// повторном сохранении того же дня (например, добавили ещё одно
// упражнение) старое значение задваивалось бы в бакете. Для этого
// сначала читаем, что было сохранено раньше именно за этот день —
// это ОДНО точечное чтение по конкретному id, а не скан коллекции.
export async function saveDayRating(userId, dateKey, rating, byExercise) {
  const previousSnapshot = await getWithOfflineFallback(ratingDayDoc(userId, dateKey));
  const previous = previousSnapshot.exists ? previousSnapshot.data() : null;
  const previousRating = previous ? previous.rating || 0 : 0;
  const previousByExercise = previous ? previous.byExercise || {} : {};

  const ratingDelta = rating - previousRating;

  const exerciseNames = new Set([
    ...Object.keys(previousByExercise),
    ...Object.keys(byExercise || {}),
  ]);
  const byExerciseDelta = {};
  exerciseNames.forEach(name => {
    const before = previousByExercise[name] || 0;
    const after = (byExercise && byExercise[name]) || 0;
    byExerciseDelta[name] = after - before;
  });

  const nickname = computeNickname(userId);
  const batch = firestore().batch();

  batch.set(ratingDayDoc(userId, dateKey), {
    rating,
    byExercise: byExercise || {},
    date: dateKey,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  applyBucketDeltas(batch, userId, dateKey, nickname, ratingDelta, byExerciseDelta);

  await batch.commit();
}

// Удаляет рейтинг дня и вычитает его из бакетов (дельта = 0 - то, что
// было раньше). Если документа не было (день и так был пуст) — делать
// нечего.
export async function deleteDayRating(userId, dateKey) {
 const previousSnapshot = await getWithOfflineFallback(ratingDayDoc(userId, dateKey));
  if (!previousSnapshot || !previousSnapshot.exists) {
    return;
  }

  const previous = previousSnapshot.data() || {};
  const previousRating = previous.rating || 0;
  const previousByExercise = previous.byExercise || {};

  const byExerciseDelta = {};
  Object.keys(previousByExercise).forEach(name => {
    byExerciseDelta[name] = -(previousByExercise[name] || 0);
  });

  const nickname = computeNickname(userId);
  const batch = firestore().batch();

  batch.delete(ratingDayDoc(userId, dateKey));
  applyBucketDeltas(batch, userId, dateKey, nickname, -previousRating, byExerciseDelta);

  await batch.commit();
}

export async function upsertProfileNickname(userId) {
  const nickname = computeNickname(userId);

  await profileDoc(userId).set(
    {nickname, updatedAt: firestore.FieldValue.serverTimestamp()},
    {merge: true},
  );

  return nickname;
}

// periodKey: 'day' | 'week' | 'month' | '3months' | 'year'.
// Возвращает id документов leaderboardTotals/{id}, которые нужно
// прочитать для этого периода. "3 месяца" — не отдельный бакет, а
// просто сумма 3 месячных бакетов (текущий и два предыдущих) —
// дешевле, чем городить ещё один вид бакета ради одного периода.
function getBucketIdsForPeriod(periodKey) {
  const today = new Date();

  switch (periodKey) {
    case 'day':
      return [`day-${getDateKey(today)}`];
    case 'week':
      return [`week-${getStartOfWeekKey(today)}`];
    case 'month':
      return [`month-${getStartOfMonthKey(today)}`];
    case 'year':
      return [`year-${today.getFullYear()}`];
    case '3months': {
      const ids = [];
      for (let i = 0; i < 3; i += 1) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        ids.push(`month-${getStartOfMonthKey(monthDate)}`);
      }
      return ids;
    }
    default:
      throw new Error(`Неизвестный период рейтинга: ${periodKey}`);
  }
}

// exerciseFilter = null → общий рейтинг (сумма с коэффициентами).
// exerciseFilter = "Отжимания" → топ по сумме сырых повторений
// именно этого упражнения (без коэффициента).
//
// Теперь это чтение НЕСКОЛЬКИХ готовых документов-бакетов (1 для
// большинства периодов, 3 для "3 месяца"), а не скан всей истории
// всех пользователей — и без отдельного чтения профилей, никнейм уже
// лежит внутри бакета.
export async function fetchLeaderboard(periodKey, exerciseFilter) {
  const bucketIds = getBucketIdsForPeriod(periodKey);

  const snapshotsPerBucket = await Promise.all(
    bucketIds.map(bucketId =>
      getWithOfflineFallback(
        firestore().collection('leaderboardTotals').doc(bucketId).collection('users'),
      ),
    ),
  );

  const totalsByUser = {};
  const nicknameByUser = {};

  snapshotsPerBucket.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      const userId = doc.id;
      const data = doc.data();

      const value = exerciseFilter
        ? (data.byExercise && data.byExercise[exerciseFilter]) || 0
        : data.rating || 0;

      totalsByUser[userId] = (totalsByUser[userId] || 0) + value;
      if (data.nickname) {
        nicknameByUser[userId] = data.nickname;
      }
    });
  });

  const leaderboard = Object.keys(totalsByUser)
    .filter(userId => totalsByUser[userId] > 0)
    .map(userId => ({
      userId,
      nickname: nicknameByUser[userId] || 'Без имени',
      rating: Math.round(totalsByUser[userId] * 100) / 100,
    }));

  leaderboard.sort((a, b) => b.rating - a.rating);
  return leaderboard;
}

// Дни обрабатываются параллельно (Promise.all), а не по очереди —
// иначе один "зависший" офлайн день (ожидание ack от .set()) держал
// бы весь цикл и остальные дни не пересчитывались бы вообще.
export async function recalculateAllRatings(userId, days, exerciseCoefficients) {
  const dateKeysWithWorkout = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises,
  );

  await Promise.all(
    dateKeysWithWorkout.map(async dateKey => {
      try {
        const entries = await getDayEntries(userId, dateKey);
        const exercisesList = entries.map(item => ({
          exercise: item.exercise,
          reps: item.reps,
        }));
        const rating = computeDayRating(exercisesList, exerciseCoefficients);
        const byExercise = computeDayRepsByExercise(exercisesList);
        await saveWithOfflineFallback(
          saveDayRating(userId, dateKey, rating, byExercise),
          {
            onBackgroundError: error =>
              console.error(`Рейтинг за ${dateKey} не принят сервером:`, error),
          },
        );
      } catch (error) {
        console.error(`Ошибка пересчёта рейтинга за ${dateKey}:`, error);
      }
    }),
  );
}

// ===================== ОДНОРАЗОВЫЙ БЭКФИЛЛ БАКЕТОВ =====================
//
// Бакеты — новая штука, у уже существующих пользователей их пока нет
// вообще, хотя история тренировок (ratings/{userId}/days) уже
// накоплена. saveDayRating прибавляет только РАЗНИЦУ с предыдущим
// значением того же дня — а если день с прошлого раза не менялся,
// разница будет 0, и бакет так и останется пустым. Поэтому нужен
// отдельный одноразовый проход: досчитать бакеты с нуля из уже
// имеющейся истории.
//
// "Одноразовый" — в буквальном смысле: после успешного прохода в
// profiles/{userId} ставится флаг bucketsBackfilledAt, и повторно эта
// (более тяжёлая) операция для этого пользователя никогда не
// запустится. Считает только СОБСТВЕННУЮ историю пользователя — это
// не тот же дорогой скан "по всем пользователям", а лёгкая разовая
// операция, которая произойдёт у каждого пользователя сама при
// следующем открытии экрана "История" (см. WorkoutHistoryScreen.js).
export async function ensureBucketsBackfilled(userId, days, exerciseCoefficients) {
  const profileSnapshot = await getWithOfflineFallback(profileDoc(userId));
  const profileData = profileSnapshot.exists ? profileSnapshot.data() : {};
  const backfilledDays = profileData.backfilledDays || {};
  const nickname = computeNickname(userId);

  const dateKeysWithWorkout = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises,
  );

  // --- Переход со старой схемы (один общий флаг) на новую (по дням) ---
  // Если у аккаунта уже стоит старый флаг bucketsBackfilledAt, а новой
  // по-дневной карты ещё нет — это первый запуск нового кода для уже
  // когда-то обработанного аккаунта. Просто взять и пересчитать всё
  // заново нельзя: дни, которые в прошлый раз прошли успешно,
  // задвоились бы в бакетах. Поэтому считаем все дни, которые видим
  // сейчас, уже готовыми — без повторной записи в бакеты.
  //
  // Если конкретный аккаунт при этом реально что-то недосчитал (как
  // сейчас основной аккаунт) — единственный раз нужно вручную удалить
  // поле bucketsBackfilledAt у него в Firebase Console. После этого он
  // пройдёт полный чистый пересчёт и уже больше никогда не потребует
  // ручных правок — как и любой другой аккаунт впредь.
  const isFirstRunAfterMigration =
    Boolean(profileData.bucketsBackfilledAt) && !profileData.backfilledDays;

  if (isFirstRunAfterMigration) {
    const alreadyMarked = {};
    dateKeysWithWorkout.forEach(dateKey => {
      alreadyMarked[dateKey] = true;
    });
    try {
      await profileDoc(userId).set({backfilledDays: alreadyMarked}, {merge: true});
    } catch (error) {
      console.error('Не удалось перенести отметки бэкфилла на новую схему:', error);
    }
    return;
  }

  const dateKeysToBackfill = dateKeysWithWorkout.filter(
    dateKey => !backfilledDays[dateKey],
  );

  if (dateKeysToBackfill.length === 0) {
    return;
  }

  await Promise.all(
    dateKeysToBackfill.map(async dateKey => {
      try {
        const entries = await getDayEntries(userId, dateKey);
        const exercisesList = entries.map(item => ({
          exercise: item.exercise,
          reps: item.reps,
        }));
        const rating = computeDayRating(exercisesList, exerciseCoefficients);
        const byExercise = computeDayRepsByExercise(exercisesList);

        const batch = firestore().batch();
        applyBucketDeltas(batch, userId, dateKey, nickname, rating, byExercise);
        // Отметка "этот день досчитан" — в ТОМ ЖЕ batch, что и сами
        // бакеты: если запись не пройдёт, не пройдёт целиком, и день
        // корректно попробуется снова в следующий раз.
        batch.set(
          profileDoc(userId),
          {backfilledDays: {[dateKey]: true}},
          {merge: true},
        );
        await batch.commit();
      } catch (error) {
        console.error(`Не удалось восстановить бакеты рейтинга за ${dateKey}:`, error);
      }
    }),
  );
}

export async function ensureMonthBucketsMigrated(userId, days, exerciseCoefficients) {
  const profileSnapshot = await getWithOfflineFallback(profileDoc(userId));
  const profileData = profileSnapshot.exists ? profileSnapshot.data() : {};
  if (profileData.monthBucketsMigratedAt) {
    return;
  }

  const nickname = computeNickname(userId);
  const dateKeysWithWorkout = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises,
  );

  await Promise.all(
    dateKeysWithWorkout.map(async dateKey => {
      try {
        const entries = await getDayEntries(userId, dateKey);
        const exercisesList = entries.map(item => ({
          exercise: item.exercise,
          reps: item.reps,
        }));
        const rating = computeDayRating(exercisesList, exerciseCoefficients);
        const byExercise = computeDayRepsByExercise(exercisesList);

        const monthPeriodKey = `month-${getStartOfMonthKey(new Date(dateKey))}`;
        const update = {
          nickname,
          updatedAt: firestore.FieldValue.serverTimestamp(),
          rating: firestore.FieldValue.increment(rating),
        };
        Object.keys(byExercise).forEach(exercise => {
          if (byExercise[exercise]) {
            update[`byExercise.${exercise}`] = firestore.FieldValue.increment(
              byExercise[exercise],
            );
          }
        });

        await bucketUserDoc(monthPeriodKey, userId).set(update, {merge: true});
      } catch (error) {
        console.error(`Не удалось перенести месячный бакет за ${dateKey}:`, error);
      }
    }),
  );

  try {
    await profileDoc(userId).set(
      {monthBucketsMigratedAt: firestore.FieldValue.serverTimestamp()},
      {merge: true},
    );
  } catch (error) {
    console.error('Не удалось сохранить флаг миграции месячных бакетов:', error);
  }
}