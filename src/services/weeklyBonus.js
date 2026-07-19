import firestore from '@react-native-firebase/firestore';
import {getWithOfflineFallback, saveWithOfflineFallback} from './offlineSync';
import {addBonusToBatch} from './ratings';
import {getDateKey, getStartOfWeekKey} from '../utils/date';

export const WEEKLY_BONUS_POINTS = 200;

// "Метка" о том, что бонус за эту неделю (ключ — понедельник недели)
// уже начислен. Документ создаётся один раз и НИКОГДА не удаляется —
// это и есть защита от повторного получения бонуса, если пользователь
// удалит и заново внесёт данные за какой-то день той же недели.
function weeklyBonusMarkerDoc(userId, weekStartKey) {
  return firestore()
    .collection('users')
    .doc(userId)
    .collection('weeklyBonuses')
    .doc(weekStartKey);
}

// Понедельник..воскресенье текущей недели в виде массива ключей дат.
function getCurrentWeekDateKeys() {
  const startKey = getStartOfWeekKey(new Date());
  const start = new Date(startKey);

  const keys = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    keys.push(getDateKey(d));
  }
  return keys;
}

// "Заполненный" день — либо реально внесена тренировка, либо
// осознанно проставлен статус (выходной/пропуск/травма). Дня вообще
// нет в days (пользователь ничего не делал) — не заполнен.
function isDayFilled(dayData) {
  if (!dayData) {
    return false;
  }
  return dayData.hasExercises === true || Boolean(dayData.status);
}

// Проверяет текущую неделю и, если она заполнена целиком и бонус за
// неё ещё не начислялся, начисляет 200 баллов (в общий рейтинг —
// через бакеты в services/ratings.js) и запоминает это навсегда.
//
// Возвращает объект с полем status:
//  - 'incomplete'       — неделя ещё не заполнена целиком, ничего не делаем
//  - 'already_awarded'  — неделя заполнена, но бонус за неё уже был начислен раньше
//  - 'awarded'          — бонус только что начислен, нужно показать модалку (points)
//  - 'error'            — попытка начисления не удалась (см. error)
export async function checkAndAwardWeeklyBonus(userId, days) {
  const weekDateKeys = getCurrentWeekDateKeys();
  const weekIsComplete = weekDateKeys.every(dateKey => isDayFilled(days[dateKey]));

  if (!weekIsComplete) {
    return {status: 'incomplete'};
  }

  const weekStartKey = weekDateKeys[0];

  const markerSnapshot = await getWithOfflineFallback(
    weeklyBonusMarkerDoc(userId, weekStartKey),
  );
  if (markerSnapshot.exists) {
    return {status: 'already_awarded', weekStartKey};
  }

  const batch = firestore().batch();

  batch.set(weeklyBonusMarkerDoc(userId, weekStartKey), {
    weekStart: weekStartKey,
    points: WEEKLY_BONUS_POINTS,
    awardedAt: firestore.FieldValue.serverTimestamp(),
  });

  // Один и тот же batch — метка о начислении и сам бонус (плюс его
  // прибавление в бакеты рейтинга) уходят в базу одной атомарной
  // пачкой, как и раньше.
  addBonusToBatch(
    batch,
    userId,
    `${weekStartKey}-weekly-bonus`,
    getDateKey(new Date()),
    WEEKLY_BONUS_POINTS,
  );

  const result = await saveWithOfflineFallback(batch.commit());

  if (result.error) {
    return {status: 'error', error: result.error, weekStartKey};
  }

  return {status: 'awarded', points: WEEKLY_BONUS_POINTS, weekStartKey};
}