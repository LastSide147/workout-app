import firestore from '@react-native-firebase/firestore';
import {getCurrentUser} from './firebase';
import {getDayEntries} from './workoutDays';
import {getProfileDemographics} from './profile';
import {getWithOfflineFallback, saveWithOfflineFallback} from './offlineSync';
import {getDateKey, getStartOfWeekKey, getStartOfMonthKey, parseDateKey} from '../utils/date';
import {calculateAge} from '../utils/age';

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

// Читает профиль (возраст считается из даты рождения — см. utils/age.js)
// и возвращает СЫРЫЕ числа: точный возраст и точный вес. Именно они
// пишутся в бакет рейтинга рядом с nickname/rating.
//
// Раньше здесь писалась готовая МЕТКА диапазона ("26–35 лет") — это
// работало для фиксированных, общих для всех диапазонов. Но фильтр
// теперь ОТНОСИТЕЛЬНЫЙ: "±10 лет/кг" от СВОЕГО значения смотрящего, а
// не общий диапазон для всех — поэтому в бакете нужно точное число
// (60 кг), а не готовая метка, а сама граница (60±10 = 50–70) считается
// уже на экране Статистики, в момент, когда известно, кто именно
// смотрит рейтинг (см. fetchLeaderboard ниже).
//
// Если поля в профиле не заполнены — оба значения будут null, и
// пользователь просто не попадёт ни в один активный возрастной/весовой
// фильтр (но останется виден, когда фильтр выключен — "Без
// ограничений").
//
// ВАЖНО: эта функция вызывается из saveDayRating/deleteDayRating/
// ensureBucketsBackfilled/rebuildAllBucketsFromHistory — а это САМЫЕ
// критичные операции всего приложения (без них не работает сохранение
// подходов, "ремонт" рейтинга и т.п.). Метки возраста/веса — вторичная,
// вспомогательная функция (нужна только для фильтра в Статистике), и
// она НИКОГДА не должна иметь возможность подвесить или сломать
// основную запись/удаление рейтинга, если вдруг чтение профиля
// зависнет или упадёт с ошибкой (например, нет сети и профиль ещё ни
// разу не читался на этом устройстве — тогда офлайн-кэш документа
// пуст). Поэтому здесь СВОЙ короткий таймаут и свой try/catch: что бы
// ни случилось при чтении профиля, эта функция гарантированно
// вернёт результат за разумное время, просто с null вместо
// возраста/веса, а не зависнет и не прервёт вызывающую операцию.
async function getDemographicSnapshot(userId) {
  try {
    const demographics = await Promise.race([
      getProfileDemographics(userId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DEMOGRAPHICS_READ_TIMEOUT')), 4000),
      ),
    ]);
    return {
      age: calculateAge(demographics.birthYear, demographics.birthMonth),
      weight: demographics.weight,
    };
  } catch (error) {
    console.error(
      'Не удалось получить возраст/вес для метки бакета рейтинга (не критично, продолжаем без них):',
      error,
    );
    return {age: null, weight: null};
  }
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
  // parseDateKey, а не new Date(dateKey) — обычный конструктор разбирает
  // строку "YYYY-MM-DD" как UTC-полночь и может съехать на день назад в
  // часовых поясах западнее UTC (см. подробности в utils/date.js).
  const date = parseDateKey(dateKey);
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
//
// demographicSnapshot (необязательный параметр, {age, weight} — см.
// getDemographicSnapshot выше) — если передан, точные возраст/вес
// записываются/обновляются в тот же документ бакета. Не все вызывающие
// места его передают (например, разовые бонусы) — тогда поля age/weight
// в update просто не участвуют и остаются такими, какими были записаны
// в прошлый раз.
function applyBucketDeltas(
  batch,
  userId,
  dateKey,
  nickname,
  ratingDelta,
  byExerciseDelta,
  demographicSnapshot,
) {
  const bucketKeys = getBucketKeysForDate(dateKey);

  Object.values(bucketKeys).forEach(periodKey => {
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
    };

    if (demographicSnapshot) {
      update.age = demographicSnapshot.age;
      update.weight = demographicSnapshot.weight;
    }

    // ВАЖНО: поле byExercise добавляем в update, ТОЛЬКО если есть,
    // что реально прибавить. set(..., {merge: true}) мёржит поле
    // целиком, если оно присутствует в объекте — вложенный объект как
    // значение поля Firestore заменяет полностью, а не сливает по
    // ключам внутри (в отличие от строки с точкой вида
    // 'byExercise.Название', которую мы сознательно не используем —
    // см. предыдущий комментарий в истории правок). Раньше сюда
    // всегда клали byExercise: {} (пустой объект), если в этот раз ни
    // одно упражнение не изменилось (например, при недельном бонусе
    // или при повторном пересчёте без изменений) — и эта пустышка
    // СТИРАЛА уже накопленную карту по упражнениям целиком, обнуляя
    // её насовсем. Рейтинг (простое число) от этого не страдал —
    // increment(0) для числа безобиден.
    if (Object.keys(byExerciseUpdate).length > 0) {
      update.byExercise = byExerciseUpdate;
    }

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

export async function recalculateDayRating(userId, dateKey, exerciseCoefficients) {
  const entries = await getDayEntries(userId, dateKey);
  const exercisesList = entries.map(item => ({
    exercise: item.exercise,
    reps: item.reps,
  }));
  const rating = computeDayRating(exercisesList, exerciseCoefficients);
  const byExercise = computeDayRepsByExercise(exercisesList);
  await saveDayRating(userId, dateKey, rating, byExercise);
}
// Сохраняет рейтинг дня И одновременно прибавляет разницу (не всё
// число целиком!) к бакетам дня/недели/месяца/года — иначе при
// повторном сохранении того же дня (например, добавили ещё одно
// упражнение) старое значение задваивалось бы в бакете. Для этого
// сначала читаем, что было сохранено раньше именно за этот день —
// это ОДНО точечное чтение по конкретному id, а не скан коллекции.
export async function saveDayRating(userId, dateKey, rating, byExercise) {
  const nickname = computeNickname(userId);
  const dayDoc = ratingDayDoc(userId, dateKey);
  // Читаем ДО транзакции — это профиль пользователя, а не то, за
  // консистентность чего транзакция ниже отвечает (та следит только за
  // тем, чтобы дельта рейтинга дня не задвоилась при гонке).
  const demographicSnapshot = await getDemographicSnapshot(userId);

  await firestore().runTransaction(async transaction => {
    const previousSnapshot = await transaction.get(dayDoc);
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

transaction.set(dayDoc, {
      rating,
      byExercise: byExercise || {},
      date: dateKey,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    applyBucketDeltas(
      transaction,
      userId,
      dateKey,
      nickname,
      ratingDelta,
      byExerciseDelta,
      demographicSnapshot,
    );

    // Ставим ту же метку, которой пользуется одноразовый бэкфилл
    // (ensureBucketsBackfilled) — "этот день уже правильно учтён в
    // бакетах". Без этого КАЖДЫЙ новый день сначала корректно попадал
    // в бакет здесь, а при первом же открытии "Истории" бэкфилл видел
    // отсутствие метки, считал день "старым и ещё не учтённым" и
    // прибавлял его рейтинг в бакет ВТОРОЙ РАЗ — отсюда и было ровно
    // двукратное завышение (33 → 66 и все похожие числа раньше).
    transaction.set(
      profileDoc(userId),
      {backfilledDays: {[dateKey]: true}},
      {merge: true},
    );
  });
}

// Удаляет рейтинг дня и вычитает его из бакетов (дельта = 0 - то, что
// было раньше). Если документа не было (день и так был пуст) — делать
// нечего.
export async function deleteDayRating(userId, dateKey) {
  const nickname = computeNickname(userId);
  const dayDoc = ratingDayDoc(userId, dateKey);
  const demographicSnapshot = await getDemographicSnapshot(userId);

  await firestore().runTransaction(async transaction => {
    const previousSnapshot = await transaction.get(dayDoc);
    if (!previousSnapshot.exists) {
      return;
    }

    const previous = previousSnapshot.data() || {};
    const previousRating = previous.rating || 0;
    const previousByExercise = previous.byExercise || {};

    const byExerciseDelta = {};
    Object.keys(previousByExercise).forEach(name => {
      byExerciseDelta[name] = -(previousByExercise[name] || 0);
    });

transaction.delete(dayDoc);
    applyBucketDeltas(
      transaction,
      userId,
      dateKey,
      nickname,
      -previousRating,
      byExerciseDelta,
      demographicSnapshot,
    );

    // Та же метка, что и в saveDayRating выше — день удалён/обнулён
    // живым путём, бэкфиллу второй раз пересчитывать его не нужно.
    transaction.set(
      profileDoc(userId),
      {backfilledDays: {[dateKey]: true}},
      {merge: true},
    );
  });
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
// demographicFilter (необязательный) — {ageToleranceYears, viewerAge,
// weightToleranceKg, viewerWeight}. Это ОТНОСИТЕЛЬНЫЙ фильтр: "±10 лет"
// от возраста ИМЕННО ТОГО, кто сейчас смотрит рейтинг (viewerAge), а не
// общий для всех диапазон — у разных пользователей с одним и тем же
// выбором "±10 лет" получится разная фактическая граница. Поэтому
// фильтровать через Firestore .where() с общим для всех значением
// нельзя — сравнение идёт с числом, известным только на экране
// (собственный возраст/вес смотрящего), а Firestore не умеет сравнивать
// поле документа с числом, которое приходит "снаружи запроса" иначе как
// через range-условие (>=, <=) с уже вычисленными границами. Диапазон
// (viewerAge - toleranceYears .. viewerAge + toleranceYears) в принципе
// можно было бы пересчитать в range-запрос, но диапазон сразу по ДВУМ
// полям (age И weight) Firestore в одном запросе не поддерживает без
// специально настроенного составного индекса — поэтому границы
// проверяются здесь же, в JS, уже после обычного чтения бакета (оно и
// так читается целиком без ограничения — см. пункт про fetchLeaderboard
// в итоговом комментарии DayEditor.js). Toleranace null или viewerAge/
// viewerWeight null → соответствующий фильтр просто не применяется.
//
// Теперь это чтение НЕСКОЛЬКИХ готовых документов-бакетов (1 для
// большинства периодов, 3 для "3 месяца"), а не скан всей истории
// всех пользователей — и без отдельного чтения профилей, никнейм уже
// лежит внутри бакета.
export async function fetchLeaderboard(periodKey, exerciseFilter, demographicFilter) {
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
  const ageByUser = {};
  const weightByUser = {};

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
      // "Последний встреченный бакет побеждает" — как и с nickname
      // выше: возраст/вес чуть более "живые" данные, чем нужно (могут
      // на день-два отставать от реальных, пока не случится новая
      // запись), но для фильтра "±N" такой мелкой неточностью можно
      // пренебречь.
      if (typeof data.age === 'number') {
        ageByUser[userId] = data.age;
      }
      if (typeof data.weight === 'number') {
        weightByUser[userId] = data.weight;
      }
    });
  });

  let eligibleUserIds = Object.keys(totalsByUser);

  const ageToleranceYears = demographicFilter && demographicFilter.ageToleranceYears;
  const viewerAge = demographicFilter && demographicFilter.viewerAge;
  if (typeof ageToleranceYears === 'number' && typeof viewerAge === 'number') {
    eligibleUserIds = eligibleUserIds.filter(userId => {
      const theirAge = ageByUser[userId];
      return typeof theirAge === 'number' && Math.abs(theirAge - viewerAge) <= ageToleranceYears;
    });
  }

  const weightToleranceKg = demographicFilter && demographicFilter.weightToleranceKg;
  const viewerWeight = demographicFilter && demographicFilter.viewerWeight;
  if (typeof weightToleranceKg === 'number' && typeof viewerWeight === 'number') {
    eligibleUserIds = eligibleUserIds.filter(userId => {
      const theirWeight = weightByUser[userId];
      return (
        typeof theirWeight === 'number' && Math.abs(theirWeight - viewerWeight) <= weightToleranceKg
      );
    });
  }

  const leaderboard = eligibleUserIds
    .filter(userId => totalsByUser[userId] > 0)
    .map(userId => ({
      userId,
      nickname: nicknameByUser[userId] || 'Без имени',
      rating: Math.round(totalsByUser[userId] * 100) / 100,
    }));

  leaderboard.sort((a, b) => b.rating - a.rating);
  return leaderboard;
}

// Эта функция вызывается БЕЗУСЛОВНО при каждом заходе на вкладку
// "Тренировка"/"История" (см. WorkoutHistoryScreen.js) — она не про
// правку ОДНОГО конкретного дня пользователем (для этого есть прямые
// вызовы recalculateDayRating/queueRatingWrite из DayEditor.js), а про
// "на всякий случай досчитать всё" — например, если рейтинг где-то
// разошёлся с реальными записями. Из-за этого при быстром
// переключении вкладок туда-сюда она может запуститься несколько раз
// за секунды и попытаться заново переписать ОДНИ И ТЕ ЖЕ дни, которые
// сама же только что переписала. Раньше (пока в правилах безопасности
// не было 2-секундной задержки на запись одного документа) это было
// просто лишним расходом дневной квоты. Теперь же сервер такие
// повторы прямо отклоняет как [firestore/permission-denied] — что и
// увидел пользователь: сотня одинаковых ошибок в консоли после
// нескольких быстрых переключений.
//
// recentBulkRecalcAttempts — простая карта в памяти (не переживает
// перезапуск приложения, и не должна: это не хранилище данных, а
// только защита от повторного запуска В ТЕЧЕНИЕ нескольких секунд).
// Порог сознательно взят немного БОЛЬШЕ серверной задержки (2 секунды
// в firestore.rules), чтобы не пытаться переписать то, что сервер и
// так только что отклонит. Если пользователь ДЕЙСТВИТЕЛЬНО изменит
// этот день (добавит/удалит упражнение), это пойдёт через прямые
// вызовы из DayEditor.js — они этой картой не ограничены и сработают
// сразу же, как и раньше.
const recentBulkRecalcAttempts = new Map();
const BULK_RECALC_COOLDOWN_MS = 5000;

export function shouldSkipBulkRecalc(userId, dateKey) {  const key = `${userId}:${dateKey}`;
  const lastAttempt = recentBulkRecalcAttempts.get(key);
  const now = Date.now();
  if (lastAttempt && now - lastAttempt < BULK_RECALC_COOLDOWN_MS) {
    return true;
  }
  recentBulkRecalcAttempts.set(key, now);
  return false;
}

// Дни обрабатываются параллельно (Promise.all), а не по очереди —
// иначе один "зависший" офлайн день (ожидание ack от .set()) держал
// бы весь цикл и остальные дни не пересчитывались бы вообще.
export async function recalculateAllRatings(userId, days, exerciseCoefficients) {
  const dateKeysWithWorkout = Object.keys(days).filter(
    dateKey => days[dateKey].hasExercises && !shouldSkipBulkRecalc(userId, dateKey),
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
  // Один и тот же пользователь на все дни бэкфилла — метки диапазона
  // достаточно посчитать один раз, а не заново на каждый день.
  const demographicSnapshot = await getDemographicSnapshot(userId);

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

        // Раньше "уже досчитан?" проверялось ОДИН раз в начале всей
        // функции (см. backfilledDays выше), а запись шла отдельно
        // по каждому дню. Если это же самое запускалось почти
        // одновременно на втором устройстве с тем же аккаунтом
        // (например, эмулятор + телефон), оба успевали прочитать
        // "день ещё не досчитан" и оба прибавляли рейтинг этого дня
        // в бакеты — день задваивался НАВСЕГДА. Транзакция читает
        // САМОЕ СВЕЖЕЕ состояние флага прямо перед записью и, если
        // кто-то другой уже успел досчитать именно этот день, просто
        // ничего не делает.
        await firestore().runTransaction(async transaction => {
          const freshProfileSnapshot = await transaction.get(profileDoc(userId));
          const freshBackfilledDays =
            (freshProfileSnapshot.exists && freshProfileSnapshot.data().backfilledDays) || {};

          if (freshBackfilledDays[dateKey]) {
            return;
          }

          applyBucketDeltas(
            transaction,
            userId,
            dateKey,
            nickname,
            rating,
            byExercise,
            demographicSnapshot,
          );
          transaction.set(
            profileDoc(userId),
            {backfilledDays: {[dateKey]: true}},
            {merge: true},
          );
        });
      } catch (error) {
        console.error(`Не удалось восстановить бакеты рейтинга за ${dateKey}:`, error);
      }
    }),
  );
}

export async function ensureMonthBucketsMigrated(userId, days, exerciseCoefficients) {
  // Раньше здесь читался флаг monthBucketsMigratedAt, и если его не
  // было — функция сразу начинала долгий перенос ВСЕЙ истории, а сам
  // флаг проставлялся только в конце. У этой миграции флаг один на
  // весь аккаунт (не по дням, как в ensureBucketsBackfilled), поэтому
  // гонка здесь самая опасная: если два устройства с одним аккаунтом
  // (телефон + эмулятор) почти одновременно видят "флага ещё нет",
  // ОБА пройдут по ВСЕЙ истории и удвоят рейтинг каждого дня во всех
  // месячных бакетах сразу.
  //
  // Поэтому сначала атомарно "застолбим" перенос отдельной меткой
  // monthBucketsMigrationClaimedAt через транзакцию — она гарантирует,
  // что только ОДНО устройство пройдёт дальше и начнёт считать.
  const claimed = await firestore().runTransaction(async transaction => {
    const snapshot = await transaction.get(profileDoc(userId));
    const data = snapshot.exists ? snapshot.data() : {};

    if (data.monthBucketsMigratedAt || data.monthBucketsMigrationClaimedAt) {
      return false;
    }

    transaction.set(
      profileDoc(userId),
      {monthBucketsMigrationClaimedAt: firestore.FieldValue.serverTimestamp()},
      {merge: true},
    );
    return true;
  });

  if (!claimed) {
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

        const monthPeriodKey = `month-${getStartOfMonthKey(parseDateKey(dateKey))}`;
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

export async function rebuildAllBucketsFromHistory(userId) {
  const nickname = computeNickname(userId);
  // "Ремонт" — единственный способ для УЖЕ существующих пользователей
  // проставить метки возраста/веса в бакеты за прошлые периоды (раньше
  // этих полей не существовало вообще). Для новых записей метки и так
  // проставляются сами в saveDayRating/deleteDayRating.
  const demographicSnapshot = await getDemographicSnapshot(userId);

  // Раньше здесь стоял голый .get() без какой-либо защиты по времени —
  // единственное место во всём файле, которое так читает данные (везде
  // рядом используется getWithOfflineFallback с таймаутом и откатом на
  // кэш). Если сеть не отвечала, этот единственный вызов мог зависнуть
  // насмерть, и вся "ремонтная" функция вместе с ним — кнопка "Пересчитать
  // рейтинг" висела в состоянии "Пересчитываю..." бесконечно, без
  // единой ошибки в консоли. Это и есть настоящая причина зависания —
  // а не чтение профиля (оно уже было защищено самим getWithOfflineFallback
  // внутри getProfileDemographics ещё до сегодняшней правки).
  const daysSnapshot = await getWithOfflineFallback(
    firestore().collection('ratings').doc(userId).collection('days'),
  );

  const totalsByPeriod = {};

  const todayBucketKeys = getBucketKeysForDate(getDateKey(new Date()));
  Object.values(todayBucketKeys).forEach(periodKey => {
    totalsByPeriod[periodKey] = {rating: 0, byExercise: {}};
  });

  const addToPeriod = (periodKey, rating, byExercise) => {
    if (!totalsByPeriod[periodKey]) {
      totalsByPeriod[periodKey] = {rating: 0, byExercise: {}};
    }
    totalsByPeriod[periodKey].rating += rating;
    Object.keys(byExercise || {}).forEach(name => {
      totalsByPeriod[periodKey].byExercise[name] =
        (totalsByPeriod[periodKey].byExercise[name] || 0) + byExercise[name];
    });
  };

  daysSnapshot.docs.forEach(doc => {
    const data = doc.data();
    const dateKey = data.date || doc.id;
    const rating = data.rating || 0;
    const byExercise = data.byExercise || {};

    const bucketKeys = getBucketKeysForDate(dateKey);
    Object.values(bucketKeys).forEach(periodKey => {
      addToPeriod(periodKey, rating, byExercise);
    });
  });

  const batches = [];
  let currentBatch = firestore().batch();
  let opsInCurrentBatch = 0;

  const queueWrite = (docRef, data) => {
    if (opsInCurrentBatch >= 450) {
      batches.push(currentBatch);
      currentBatch = firestore().batch();
      opsInCurrentBatch = 0;
    }
    currentBatch.set(docRef, data);
    opsInCurrentBatch += 1;
  };

  Object.keys(totalsByPeriod).forEach(periodKey => {
    const {rating, byExercise} = totalsByPeriod[periodKey];
    queueWrite(bucketUserDoc(periodKey, userId), {
      nickname,
      updatedAt: firestore.FieldValue.serverTimestamp(),
      rating,
      byExercise,
      age: demographicSnapshot.age,
      weight: demographicSnapshot.weight,
    });
  });

  batches.push(currentBatch);

  for (const batch of batches) {
    await batch.commit();
  }
}

