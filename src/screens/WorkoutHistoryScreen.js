import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import {ensureSignedIn} from '../services/firebase';
import {subscribeToWorkoutDays} from '../services/workoutDays';
import {DAY_STATUS, STATUS_LABELS, STATUS_COLORS} from '../constants/dayStatus';
import {getDateKey, formatDateDisplay} from '../utils/date';
import DayEditor from '../components/DayEditor';

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
  const [isEditing, setIsEditing] = useState(false);

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

  const marked = {};
  Object.keys(days).forEach(dateKey => {
    const data = days[dateKey];
    let color = null;

    if (data.exercises && data.exercises.length > 0) {
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
      : '#2196F3',
  };

  const selectedDayData = days[selectedDate];
  const hasExercises =
    selectedDayData &&
    selectedDayData.exercises &&
    selectedDayData.exercises.length > 0;
  const hasAnyData = hasExercises || (selectedDayData && selectedDayData.status);

  const handleDayPress = day => {
    setSelectedDate(day.dateString);
    setIsEditing(false);
  };

  const showEditor = isEditing || !hasAnyData;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>История</Text>

<Calendar
  markedDates={marked}
  onDayPress={handleDayPress}
  firstDay={1}
/>
      <View style={styles.legend}>
        <LegendItem color={STATUS_COLORS.workout} label="Тренировка" />
        <LegendItem color={STATUS_COLORS[DAY_STATUS.WEEKEND]} label="Выходной" />
        <LegendItem color={STATUS_COLORS[DAY_STATUS.SKIPPED]} label="Пропуск" />
        <LegendItem color={STATUS_COLORS[DAY_STATUS.INJURY]} label="Травма" />
      </View>

      <View style={styles.details}>
        {showEditor ? (
          userId ? (
            <DayEditor
              userId={userId}
              dateKey={selectedDate}
              initialExercises={selectedDayData ? selectedDayData.exercises : []}
              initialStatus={selectedDayData ? selectedDayData.status : null}
              onSaved={() => setIsEditing(false)}
            />
          ) : null
        ) : (
          <View>
            <Text style={styles.detailsDate}>
              {formatDateDisplay(selectedDate)}
            </Text>

            {hasExercises ? (
              <View>
                {selectedDayData.exercises.map((ex, index) => (
                  <Text key={index} style={styles.exerciseText}>
                    {ex.exercise} — {ex.reps}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.statusText}>
                {STATUS_LABELS[selectedDayData.status]}
              </Text>
            )}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>Редактировать</Text>
            </TouchableOpacity>
          </View>
        )}
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
  container: {flex: 1, padding: 16, paddingTop: 32, backgroundColor: '#fff'},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 16},

  legend: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 12},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 8,
  },
  legendDot: {width: 10, height: 10, borderRadius: 5, marginRight: 6},
  legendText: {fontSize: 13, color: '#555'},

  details: {marginTop: 20, paddingBottom: 40},
  detailsDate: {fontSize: 18, fontWeight: 'bold', marginBottom: 10},
  exerciseText: {fontSize: 15, color: '#333', marginBottom: 4},
  statusText: {fontSize: 16, color: '#555'},

  editButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {color: '#fff', fontWeight: 'bold'},
});