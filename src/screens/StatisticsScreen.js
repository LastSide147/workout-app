import React, {useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, FlatList, StyleSheet} from 'react-native';
import {ensureSignedIn} from '../services/firebase';
import {subscribeToWorkoutDays} from '../services/workoutDays';
import {getDateKey, getStartOfWeekKey, getStartOfMonthKey} from '../utils/date';
import useExercises from '../hooks/useExercises';

const PERIOD = {WEEK: 'week', MONTH: 'month'};
const todayKey = getDateKey(new Date());
const weekStartKey = getStartOfWeekKey(new Date());
const monthStartKey = getStartOfMonthKey(new Date());

export default function StatisticsScreen() {
  const [days, setDays] = useState({});
  const [period, setPeriod] = useState(PERIOD.WEEK);

  // Порядок упражнений в статистике теперь берётся из Firestore
  // (через хук), а не из статического constants/exercises.js
  const {exerciseNames, loadingExercises} = useExercises();

  useEffect(() => {
    let unsubscribe;
    ensureSignedIn().then(uid => {
      unsubscribe = subscribeToWorkoutDays(uid, setDays);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  // Строковое сравнение дат вида "2026-07-04" работает как обычное
  // сравнение по времени, поэтому лишние преобразования не нужны
  const startKey = period === PERIOD.WEEK ? weekStartKey : monthStartKey;

  const totals = {};
  let overallTotal = 0;

  Object.keys(days).forEach(dateKey => {
    if (dateKey < startKey || dateKey > todayKey) {
      return;
    }
    const data = days[dateKey];
    if (!data.exercises) {
      return;
    }
    data.exercises.forEach(({exercise, reps}) => {
      totals[exercise] = (totals[exercise] || 0) + reps;
      overallTotal += reps;
    });
  });

  const list = exerciseNames
    .filter(exercise => totals[exercise] > 0)
    .map(exercise => ({exercise, reps: totals[exercise]}));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Статистика</Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            period === PERIOD.WEEK && styles.toggleButtonActive,
          ]}
          onPress={() => setPeriod(PERIOD.WEEK)}>
          <Text
            style={[
              styles.toggleText,
              period === PERIOD.WEEK && styles.toggleTextActive,
            ]}>
            Неделя
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            period === PERIOD.MONTH && styles.toggleButtonActive,
          ]}
          onPress={() => setPeriod(PERIOD.MONTH)}>
          <Text
            style={[
              styles.toggleText,
              period === PERIOD.MONTH && styles.toggleTextActive,
            ]}>
            Месяц
          </Text>
        </TouchableOpacity>
      </View>

      {loadingExercises ? (
        <Text style={styles.emptyText}>Загрузка...</Text>
      ) : list.length === 0 ? (
        <Text style={styles.emptyText}>Нет данных за этот период</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={item => item.exercise}
          renderItem={({item}) => (
            <View style={styles.row}>
              <Text style={styles.exerciseText}>{item.exercise}</Text>
              <Text style={styles.repsText}>{item.reps}</Text>
            </View>
          )}
        />
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Всего</Text>
        <Text style={styles.totalValue}>{overallTotal}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 32, backgroundColor: '#fff'},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 16},

  toggleRow: {flexDirection: 'row', marginBottom: 16},
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
  },
  toggleButtonActive: {backgroundColor: '#2196F3', borderColor: '#2196F3'},
  toggleText: {color: '#333'},
  toggleTextActive: {color: '#fff'},

  emptyText: {fontSize: 14, color: '#999', marginTop: 20},

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  exerciseText: {fontSize: 16, color: '#333'},
  repsText: {fontSize: 16, fontWeight: 'bold', color: '#2196F3'},

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  totalLabel: {fontSize: 18, fontWeight: 'bold'},
  totalValue: {fontSize: 18, fontWeight: 'bold', color: '#2196F3'},
});