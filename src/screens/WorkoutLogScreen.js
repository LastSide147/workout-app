import React from 'react';
import DayEditor from '../components/DayEditor';
import ScreenContainer from '../components/ScreenContainer';
import {getDateKey} from '../utils/date';

const todayKey = getDateKey(new Date());

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
  return (
    <ScreenContainer>
      <DayEditor userId={userId} dateKey={todayKey} />
    </ScreenContainer>
  );
}