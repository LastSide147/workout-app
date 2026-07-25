import firestore from '@react-native-firebase/firestore';
import {addBonusToBatch} from './ratings';
import {getDateKey, getStartOfWeekKey, parseDateKey} from '../utils/date';

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
  // parseDateKey — та же причина, что и в ratings.js: new Date(строка)
  // разобрал бы "YYYY-MM-DD" как UTC-полночь.
  const start = parseDateKey(startKey);

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
  const markerDoc = weeklyBonusMarkerDoc(userId, weekStartKey);

  try {
    const status = await firestore().runTransaction(async transaction => {
      // transaction.get — обязательное требование транзакций: ничего,
      // что читалось не через сам объект transaction, использовать в
      // ней нельзя, иначе Firestore не сможет гарантировать атомарность.
      const markerSnapshot = await transaction.get(markerDoc);

      if (markerSnapshot.exists) {
        return 'already_awarded';
      }

      transaction.set(markerDoc, {
        weekStart: weekStartKey,
        points: WEEKLY_BONUS_POINTS,
        awardedAt: firestore.FieldValue.serverTimestamp(),
      });

      // addBonusToBatch внутри просто вызывает transaction.set(...) —
      // ей всё равно, batch это или transaction, у обоих одинаковый
      // метод .set().
      addBonusToBatch(
        transaction,
        userId,
        `${weekStartKey}-weekly-bonus`,
        getDateKey(new Date()),
        WEEKLY_BONUS_POINTS,
      );

      return 'awarded';
    });

    return {status, weekStartKey, points: WEEKLY_BONUS_POINTS};
  } catch (error) {
    // Транзакции Firestore не умеют работать полностью офлайн (в
    // отличие от обычных .set()) — если сети совсем нет, попытка
    // упадёт сюда. Это ок: хук useWeeklyBonus не запомнит неделю как
    // проверенную и попробует снова при следующем изменении данных
    // (например, когда сеть появится).
    return {status: 'error', error, weekStartKey};
  }
}