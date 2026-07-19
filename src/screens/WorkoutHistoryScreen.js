import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import {ensureSignedIn} from '../services/firebase';
import {subscribeToWorkoutDays} from '../services/workoutDays';
import {
  recalculateAllRatings,
  ensureBucketsBackfilled,
  ensureMonthBucketsMigrated,
} from '../services/ratings';
import {DAY_STATUS, STATUS_COLORS} from '../constants/dayStatus';
import {getDateKey} from '../utils/date';
import DayEditor from '../components/DayEditor';
import ScreenContainer from '../components/ScreenContainer';
import WeeklyBonusModal from '../components/WeeklyBonusModal';
import useExercises from '../hooks/useExercises';
import useWeeklyBonus from '../hooks/useWeeklyBonus';
import colors from '../theme/colors';
import typography from '../theme/typography';

LocaleConfig.locales['ru'] = {
  monthNames: [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ],
  monthNamesShort: [
    'Янв.', 'Февр.', 'Март', 'Апр.', 'Май', 'Июнь',
    'Июль', 'Авг.', 'Сент.', 'Окт.', 'Нояб.', 'Дек.',
  ],
  dayNames: [
    'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
    'Четверг', 'Пятница', 'Суббота',
  ],
  dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
};
LocaleConfig.defaultLocale = 'ru';

const todayKey = getDateKey(new Date());

// Размер кружка-индикатора обычного дня и сегодняшнего — сегодняшний
// заметно крупнее, чтобы сразу бросался в глаза в календаре, а не
// терялся среди обычных цветных отметок.
const REGULAR_DOT_SIZE = 30;
const TODAY_DOT_SIZE = 38;

// Строит стиль одного дня календаря (нужен markingType="custom" на
// самом Calendar — см. ниже). Два независимых признака дня:
//  - isToday увеличивает размер кружка;
//  - isSelected (тапнутый пользователем день) добавляет рамку поверх
//    кружка.
// Один и тот же день может быть одновременно "сегодня" (большой
// кружок) и "выбранным" (с рамкой) без визуального конфликта — это
// два разных свойства стиля (размер и обводка), а не альтернативы.
function buildDayCustomStyle({color, isToday, isSelected}) {
  const size = isToday ? TODAY_DOT_SIZE : REGULAR_DOT_SIZE;
  const hasBackground = Boolean(color) || isSelected;
  const backgroundColor = color || (isSelected ? colors.chip : 'transparent');

  return {
    container: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      borderWidth: isSelected ? 2 : 0,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      color: hasBackground ? colors.white : colors.textPrimary,
      fontWeight: isToday ? 'bold' : 'normal',
    },
  };
}

export default function WorkoutHistoryScreen() {
  const [userId, setUserId] = useState(null);
  const [days, setDays] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const {exerciseCoefficients, loadingExercises} = useExercises();
  const recalculatedRef = useRef(false);

  const {bonusModalVisible, bonusPoints, closeBonusModal} = useWeeklyBonus(userId, days);

  useEffect(() => {
    let unsubscribe;
    ensureSignedIn().then(uid => {
      setUserId(uid);
      unsubscribe = subscribeToWorkoutDays(uid, setDays);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (
      userId &&
      !loadingExercises &&
      Object.keys(days).length > 0 &&
      !recalculatedRef.current
    ) {
      recalculatedRef.current = true;
      recalculateAllRatings(userId, days, exerciseCoefficients);

      // Разовый (на пользователя, навсегда) бэкфилл бакетов рейтинга
      // из уже накопленной истории — см. подробное пояснение в
      // services/ratings.js. Работает независимо от recalculateAllRatings
      // и сам себя защищает от повторного запуска флагом в профиле.
      ensureBucketsBackfilled(userId, days, exerciseCoefficients);

      // Разовая починка месячных бакетов после смены формата их ключа
      // (см. подробности в services/ratings.js) — тоже сама себя
      // защищает от повторного запуска и ничего не трогает у аккаунтов,
      // которые уже прошли эту миграцию.
      ensureMonthBucketsMigrated(userId, days, exerciseCoefficients);
    }
  }, [userId, days, loadingExercises, exerciseCoefficients]);

  // markingType="custom" на Calendar ниже включает полностью ручное
  // управление стилем каждого дня через customStyles (container/text) —
  // это единственный способ сделать кружок сегодняшнего дня БОЛЬШЕ
  // остальных, обычный markingType с selectedColor размер не меняет.
  const marked = {};
  const relevantDateKeys = new Set([...Object.keys(days), todayKey, selectedDate]);

  relevantDateKeys.forEach(dateKey => {
    const data = days[dateKey];
    let color = null;

    if (data) {
      if (data.hasExercises) {
        color = STATUS_COLORS.workout;
      } else if (data.status) {
        color = STATUS_COLORS[data.status];
      }
    }

    marked[dateKey] = {
      customStyles: buildDayCustomStyle({
        color,
        isToday: dateKey === todayKey,
        isSelected: dateKey === selectedDate,
      }),
    };
  });

  const handleDayPress = day => {
    setSelectedDate(day.dateString);
  };

  return (
    <>
      <ScreenContainer>
        <Text style={styles.title}>История</Text>

        {/* Календарь — в отдельной скруглённой карточке, как остальные
            функциональные блоки в приложении, а не просто на голом фоне */}
        <View style={styles.calendarCard}>
          <Calendar
            markedDates={marked}
            markingType="custom"
            onDayPress={handleDayPress}
            firstDay={1}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textMuted,
              dayTextColor: colors.textPrimary,
              monthTextColor: colors.textPrimary,
              arrowColor: colors.primary,
              textDisabledColor: colors.textPlaceholder,
            }}
          />
        </View>

        <View style={styles.legend}>
          <LegendItem color={STATUS_COLORS.workout} label="Тренировка" />
          <LegendItem color={STATUS_COLORS[DAY_STATUS.WEEKEND]} label="Выходной" />
          <LegendItem color={STATUS_COLORS[DAY_STATUS.SKIPPED]} label="Пропуск" />
          <LegendItem color={STATUS_COLORS[DAY_STATUS.INJURY]} label="Травма" />
        </View>

        <View style={styles.details}>
          {userId ? (
            <DayEditor
              key={selectedDate}
              userId={userId}
              dateKey={selectedDate}
              variant="history"
            />
          ) : null}
        </View>
      </ScreenContainer>

      <WeeklyBonusModal
        visible={bonusModalVisible}
        points={bonusPoints}
        onClose={closeBonusModal}
      />
    </>
  );
}

function LegendItem({color, label}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, {backgroundColor: color}]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {...typography.screenTitle, marginBottom: 16, color: colors.textPrimary},
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  legend: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 16},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  legendDot: {width: 10, height: 10, borderRadius: 5, marginRight: 6},
  legendText: {...typography.caption, color: colors.textSecondary},
  details: {marginTop: 20, paddingBottom: 40},
});