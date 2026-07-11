import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import {ensureSignedIn} from '../services/firebase';
import {subscribeToWorkoutDays, getDayEntries} from '../services/workoutDays';
import {fetchLeaderboard} from '../services/ratings';
import {getDateKey} from '../utils/date';
import useExercises from '../hooks/useExercises';

const PERIODS = [
  {key: 'day', label: 'День'},
  {key: 'week', label: 'Неделя'},
  {key: 'month', label: 'Месяц'},
  {key: '3months', label: '3 месяца'},
  {key: 'year', label: 'Год'},
];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStartKeyForPeriod(periodKey, referenceDate) {
  const date = new Date(referenceDate);

  switch (periodKey) {
    case 'day':
      return toDateKey(date);
    case 'week': {
      const dayOfWeek = date.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(date);
      monday.setDate(date.getDate() - diffToMonday);
      return toDateKey(monday);
    }
    case 'month': {
      return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    case '3months': {
      return toDateKey(new Date(date.getFullYear(), date.getMonth() - 2, 1));
    }
    case 'year': {
      return toDateKey(new Date(date.getFullYear(), 0, 1));
    }
    default:
      return toDateKey(date);
  }
}

const todayKey = getDateKey(new Date());

function PeriodSelector({value, onChange, testIdPrefix}) {
  return (
    <View style={styles.toggleRow}>
      {PERIODS.map(({key, label}) => {
        const isActive = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
            onPress={() => onChange(key)}
            testID={`${testIdPrefix}-${key}`}>
            <Text style={[styles.toggleText, isActive && styles.toggleTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Модальное окно "Коэффициенты упражнений" — только просмотр,
// ничего нельзя изменить (изменение коэффициентов остаётся
// исключительно на экране управления упражнениями у мастера).
function CoefficientsModal({visible, onClose, exercises}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Коэффициенты упражнений</Text>
          <TouchableOpacity
            onPress={onClose}
            testID="statistics-coefficients-close-button">
            <Text style={styles.modalCloseIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={exercises}
          keyExtractor={item => item.id}
          testID="statistics-coefficients-list"
          renderItem={({item}) => (
            <View style={styles.modalRow}>
              <Text style={styles.modalExerciseName}>{item.name}</Text>
              <Text style={styles.modalCoefficientValue}>
                {typeof item.coefficient === 'number'
                  ? item.coefficient
                  : '—'}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Список упражнений пуст</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function StatisticsScreen() {
  const [userId, setUserId] = useState(null);
  const [days, setDays] = useState({});

  const [personalPeriod, setPersonalPeriod] = useState('week');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('day');

  const {exercises, exerciseNames, loadingExercises} = useExercises();

  const [totals, setTotals] = useState({});
  const [overallTotal, setOverallTotal] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);

  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [coefficientsVisible, setCoefficientsVisible] = useState(false);

  useEffect(() => {
    let unsubscribe;
    ensureSignedIn().then(uid => {
      setUserId(uid);
      unsubscribe = subscribeToWorkoutDays(uid, setDays);
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const personalStartKey = getStartKeyForPeriod(personalPeriod, new Date());
  const leaderboardStartKey = getStartKeyForPeriod(leaderboardPeriod, new Date());

  const loadTotals = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoadingTotals(true);
    try {
      const matchingDateKeys = Object.keys(days).filter(
        dateKey =>
          dateKey >= personalStartKey &&
          dateKey <= todayKey &&
          days[dateKey].hasExercises,
      );

      const entriesPerDay = await Promise.all(
        matchingDateKeys.map(dateKey => getDayEntries(userId, dateKey)),
      );

      const newTotals = {};
      let newOverallTotal = 0;

      entriesPerDay.forEach(entries => {
        entries.forEach(({exercise, reps}) => {
          newTotals[exercise] = (newTotals[exercise] || 0) + reps;
          newOverallTotal += reps;
        });
      });

      setTotals(newTotals);
      setOverallTotal(newOverallTotal);
    } catch (error) {
      console.error('Ошибка подсчёта статистики:', error);
    } finally {
      setLoadingTotals(false);
    }
  }, [userId, days, personalStartKey]);

  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const result = await fetchLeaderboard(leaderboardStartKey, todayKey);
      setLeaderboard(result);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [leaderboardStartKey]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const list = exerciseNames
    .filter(exercise => totals[exercise] > 0)
    .map(exercise => ({exercise, reps: totals[exercise]}));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Статистика</Text>

      <Text style={styles.sectionTitle}>Мои упражнения</Text>
      <PeriodSelector
        value={personalPeriod}
        onChange={setPersonalPeriod}
        testIdPrefix="statistics-personal-period"
      />

      {loadingExercises || loadingTotals ? (
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

      <View style={styles.leaderboardHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Рейтинг всех пользователей</Text>
        <TouchableOpacity
          onPress={() => setCoefficientsVisible(true)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          testID="statistics-coefficients-info-button">
          <Text style={styles.infoIcon}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      <PeriodSelector
        value={leaderboardPeriod}
        onChange={setLeaderboardPeriod}
        testIdPrefix="statistics-leaderboard-period"
      />

      {loadingLeaderboard ? (
        <ActivityIndicator style={styles.loader} />
      ) : leaderboard.length === 0 ? (
        <Text style={styles.emptyText}>Нет данных за этот период</Text>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={item => item.userId}
          renderItem={({item, index}) => (
            <View
              style={[styles.row, item.userId === userId ? styles.rowHighlighted : null]}>
              <Text style={styles.exerciseText}>{index + 1}. {item.nickname}</Text>
              <Text style={styles.repsText}>{item.rating}</Text>
            </View>
          )}
        />
      )}

      <CoefficientsModal
        visible={coefficientsVisible}
        onClose={() => setCoefficientsVisible(false)}
        exercises={exercises}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 32, backgroundColor: '#fff'},
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 16},
  toggleRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16},
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  toggleButtonActive: {backgroundColor: '#2196F3', borderColor: '#2196F3'},
  toggleText: {color: '#333', fontSize: 13},
  toggleTextActive: {color: '#fff'},
  sectionTitle: {fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 8, color: '#333'},
  sectionTitleNoMargin: {fontSize: 16, fontWeight: 'bold', color: '#333'},
  leaderboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  infoIcon: {fontSize: 20, color: '#2196F3'},
  loader: {marginTop: 12},
  emptyText: {fontSize: 14, color: '#999', marginTop: 4, marginBottom: 12},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowHighlighted: {backgroundColor: '#E3F2FD'},
  exerciseText: {fontSize: 16, color: '#333'},
  repsText: {fontSize: 16, fontWeight: 'bold', color: '#2196F3'},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 4,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  totalLabel: {fontSize: 18, fontWeight: 'bold'},
  totalValue: {fontSize: 18, fontWeight: 'bold', color: '#2196F3'},

  modalSafeArea: {flex: 1, backgroundColor: '#fff'},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {fontSize: 18, fontWeight: 'bold'},
  modalCloseIcon: {fontSize: 22, color: '#333'},
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  modalExerciseName: {fontSize: 16, color: '#333'},
  modalCoefficientValue: {fontSize: 16, fontWeight: 'bold', color: '#2196F3'},
});