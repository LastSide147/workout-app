import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import {ensureSignedIn} from '../services/firebase';
import {subscribeToWorkoutDays} from '../services/workoutDays';
import {recalculateAllRatings} from '../services/ratings';
import {DAY_STATUS, STATUS_COLORS} from '../constants/dayStatus';
import {getDateKey} from '../utils/date';
import DayEditor from '../components/DayEditor';
import useExercises from '../hooks/useExercises';
import colors from '../theme/colors';

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

export default function WorkoutHistoryScreen() {
  const [userId, setUserId] = useState(null);
  const [days, setDays] = useState({});
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const {exerciseCoefficients, loadingExercises} = useExercises();
  const recalculatedRef = useRef(false);

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
    }
  }, [userId, days, loadingExercises, exerciseCoefficients]);

  const marked = {};
  Object.keys(days).forEach(dateKey => {
    const data = days[dateKey];
    let color = null;

    if (data.hasExercises) {
      color = STATUS_COLORS.workout;
    } else if (data.status) {
      color = STATUS_COLORS[data.status];
    }

    if (color) {
      marked[dateKey] = {selected: true, selectedColor: color};
    }
  });

  marked[selectedDate] = {
    ...marked[selectedDate],
    selected: true,
    selectedColor: marked[selectedDate]
      ? marked[selectedDate].selectedColor
      : colors.primary,
  };

  const handleDayPress = day => {
    setSelectedDate(day.dateString);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>История</Text>

      <Calendar markedDates={marked} onDayPress={handleDayPress} firstDay={1} />

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
    </ScrollView>
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
  container: {flex: 1, padding: 16, paddingTop: 32, backgroundColor: colors.white},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 16},
  legend: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 12},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  legendDot: {width: 10, height: 10, borderRadius: 5, marginRight: 6},
  legendText: {fontSize: 13, color: colors.textSecondary},
  details: {marginTop: 20, paddingBottom: 40},
});