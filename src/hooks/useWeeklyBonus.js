import {useEffect, useRef, useState} from 'react';
import {checkAndAwardWeeklyBonus} from '../services/weeklyBonus';
import {getStartOfWeekKey} from '../utils/date';

// Следит за днями пользователя (days из subscribeToWorkoutDays) и, как
// только текущая неделя оказывается полностью заполнена, один раз
// начисляет бонус и открывает модалку.
//
// checkedWeeksRef — какие недели в ЭТОЙ сессии уже точно не требуют
// повторной проверки (бонус либо начислен, либо был начислен раньше).
// Без этого при каждом изменении данных (например, добавили
// повторения в любой другой день) пришлось бы заново читать
// marker-документ из Firestore, хотя неделя уже закрыта.
export default function useWeeklyBonus(userId, days) {
  const [bonusModalVisible, setBonusModalVisible] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0);

  const checkedWeeksRef = useRef(new Set());
  const checkingRef = useRef(false);

  useEffect(() => {
    if (!userId || !days) {
      return;
    }

    const weekStartKey = getStartOfWeekKey(new Date());

    if (checkedWeeksRef.current.has(weekStartKey) || checkingRef.current) {
      return;
    }

    checkingRef.current = true;

    checkAndAwardWeeklyBonus(userId, days)
      .then(result => {
        if (result.status === 'awarded') {
          checkedWeeksRef.current.add(weekStartKey);
          setBonusPoints(result.points);
          setBonusModalVisible(true);
        } else if (result.status === 'already_awarded') {
          checkedWeeksRef.current.add(weekStartKey);
        } else if (result.status === 'error') {
          // Не помечаем неделю как проверенную — попытка повторится
          // сама при следующем изменении данных.
          console.error('Не удалось начислить недельный бонус:', result.error);
        }
        // status === 'incomplete' — неделя ещё не заполнена целиком,
        // ничего не делаем и не запоминаем, проверим заново позже.
      })
      .catch(error => {
        console.error('Ошибка проверки недельного бонуса:', error);
      })
      .finally(() => {
        checkingRef.current = false;
      });
  }, [userId, days]);

  const closeBonusModal = () => setBonusModalVisible(false);

  return {bonusModalVisible, bonusPoints, closeBonusModal};
}