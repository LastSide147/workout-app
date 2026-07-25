import React, {useState, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import DayEditor from '../components/DayEditor';
import ScreenContainer from '../components/ScreenContainer';
import {getDateKey} from '../utils/date';

// userId приходит готовым пропом из App.js — там он уже надёжно
// известен (из подписки onAuthStateChanged, которая и решает, вообще
// показывать этот экран или экран входа). Раньше экран сам ещё раз
// проверял вход через ensureSignedIn — ОДНОРАЗОВОЕ чтение
// auth().currentUser без ожидания. При холодном запуске без интернета
// это чтение иногда срабатывало раньше, чем Firebase Auth успевал
// восстановить сохранённую сессию, и тогда userId оставался null
// навсегда — а экран рисовал пустой чёрный прямоугольник и больше
// никогда не пересчитывался. Получая userId уже готовым, экран
// больше не может попасть в эту ситуацию.
export default function WorkoutLogScreen({userId}) {
  // ВАЖНО: раньше todayKey был константой модуля — считался один раз
  // при первом открытии приложения и больше никогда не обновлялся.
  // Мобильные приложения почти никогда не перезапускаются полностью —
  // они просто уходят в фон. Если пользователь открыл приложение
  // вечером и не закрывал его, после полуночи эта константа всё ещё
  // указывала на вчерашний день — и ЛЮБОЕ упражнение, отмеченное
  // "сегодня", на самом деле сохранялось во вчерашний день в базе.
  // Это и есть данные, которые "не учитывались" — они были записаны
  // не туда. Теперь дата хранится в состоянии и пересчитывается
  // каждый раз, когда экран "Тренировка" снова оказывается в фокусе
  // (переключили вкладку), поэтому запись всегда идёт в правильный
  // календарный день.
  const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));

  useFocusEffect(
    useCallback(() => {
      setTodayKey(getDateKey(new Date()));
    }, []),
  );

  return (
    <ScreenContainer>
      <DayEditor userId={userId} dateKey={todayKey} />
    </ScreenContainer>
  );
}