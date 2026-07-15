import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ensureSignedIn} from '../services/firebase';
import {subscribeToWorkoutDays, getDayEntries} from '../services/workoutDays';
import {fetchLeaderboard} from '../services/ratings';
import {getDateKey} from '../utils/date';
import useExercises from '../hooks/useExercises';
import ScreenContainer from '../components/ScreenContainer';
import colors from '../theme/colors';
import typography from '../theme/typography';

const PERIODS = [
  {key: 'day', label: 'День'},
  {key: 'week', label: 'Неделя'},
  {key: 'month', label: 'Месяц'},
  {key: '3months', label: '3 месяца'},
  {key: 'year', label: 'Год'},
];

const ALL_EXERCISES_OPTION = 'Все упражнения';

// Сколько строк рейтинга показывать сразу на странице Статистики, без
// открытия модалки с полным списком. Полный список (с прокруткой)
// доступен по тапу на заголовок раздела или по кнопке под списком.
const LEADERBOARD_PREVIEW_LIMIT = 15;

// Цвета для первых трёх мест рейтинга — золото/серебро/бронза. Индекс
// в массиве = место в рейтинге минус 1 (0 → первое место и т.д.).
const RANK_COLORS = [colors.gold, colors.silver, colors.bronze];

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

// Компактное окно по центру экрана (не на весь экран), размер
// подстраивается под количество упражнений — используется и для
// коэффициентов, и для фильтра, и для полного рейтинга, чтобы
// выглядело одинаково.
function CenteredDropdownModal({visible, onClose, title, children}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function CoefficientsModal({visible, onClose, exercises}) {
  return (
    <CenteredDropdownModal
      visible={visible}
      onClose={onClose}
      title="Коэффициенты упражнений">
      <FlatList
        data={exercises}
        keyExtractor={item => item.id}
        testID="statistics-coefficients-list"
        style={styles.dropdownList}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <View style={styles.modalRow}>
            <Text style={styles.modalExerciseName}>{item.name}</Text>
            <Text style={styles.modalCoefficientValue}>
              {typeof item.coefficient === 'number' ? item.coefficient : '—'}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Список упражнений пуст</Text>}
      />
    </CenteredDropdownModal>
  );
}

function ExerciseFilterModal({visible, onClose, exerciseNames, selected, onSelect}) {
  const options = [ALL_EXERCISES_OPTION, ...exerciseNames];

  return (
    <CenteredDropdownModal visible={visible} onClose={onClose} title="Фильтр по упражнению">
      <FlatList
        data={options}
        keyExtractor={item => item}
        testID="statistics-exercise-filter-list"
        style={styles.dropdownList}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => {
          const isActive = item === selected;
          return (
            <TouchableOpacity
              style={styles.modalOptionRow}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              testID={`statistics-exercise-filter-option-${item}`}>
              <Text
                style={[
                  styles.modalOptionText,
                  isActive ? styles.modalOptionTextActive : null,
                ]}>
                {item}
              </Text>
              {isActive ? <Text style={styles.modalOptionCheck}>✓</Text> : null}
            </TouchableOpacity>
          );
        }}
      />
    </CenteredDropdownModal>
  );
}

// Одна строка рейтинга — используется и на странице (первые 15), и в
// модалке с полным списком, чтобы вид был одинаковым в обоих местах.
// Первые три места подсвечиваются золотом/серебром/бронзой.
function LeaderboardRow({item, index, isCurrentUser}) {
  const rankColor = RANK_COLORS[index];

  return (
    <View style={[styles.row, isCurrentUser ? styles.rowHighlighted : null]}>
      <Text style={[styles.exerciseText, rankColor ? {color: rankColor} : null]}>
        {index + 1}. {item.nickname}
      </Text>
      <Text style={styles.repsText}>{item.rating}</Text>
    </View>
  );
}

// Модалка с полным рейтингом — открывается по тапу на заголовок
// раздела или по кнопке "Показать весь рейтинг". В отличие от списка
// на странице, тут своя прокрутка, потому что список здесь —
// единственное содержимое модалки, а не часть общего скролла экрана.
function LeaderboardModal({visible, onClose, leaderboard, currentUserId}) {
  return (
    <CenteredDropdownModal visible={visible} onClose={onClose} title="Рейтинг всех пользователей">
      <FlatList
        data={leaderboard}
        keyExtractor={item => item.userId}
        testID="statistics-full-leaderboard-list"
        style={styles.dropdownList}
        showsVerticalScrollIndicator={false}
        renderItem={({item, index}) => (
          <LeaderboardRow
            item={item}
            index={index}
            isCurrentUser={item.userId === currentUserId}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Нет данных за этот период</Text>}
      />
    </CenteredDropdownModal>
  );
}

export default function StatisticsScreen() {
  const [userId, setUserId] = useState(null);
  const [days, setDays] = useState({});

  const [personalPeriod, setPersonalPeriod] = useState('week');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('day');
  const [leaderboardExercise, setLeaderboardExercise] = useState(ALL_EXERCISES_OPTION);

  const {exercises, exerciseNames, loadingExercises} = useExercises();

  const [totals, setTotals] = useState({});
  const [overallTotal, setOverallTotal] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);

  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [coefficientsVisible, setCoefficientsVisible] = useState(false);
  const [exerciseFilterVisible, setExerciseFilterVisible] = useState(false);
  const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);

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
      const filter =
        leaderboardExercise === ALL_EXERCISES_OPTION ? null : leaderboardExercise;
      const result = await fetchLeaderboard(leaderboardStartKey, todayKey, filter);
      setLeaderboard(result);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [leaderboardStartKey, leaderboardExercise]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [loadLeaderboard]),
  );

  const list = exerciseNames
    .filter(exercise => totals[exercise] > 0)
    .map(exercise => ({exercise, reps: totals[exercise]}));

  const leaderboardPreview = leaderboard.slice(0, LEADERBOARD_PREVIEW_LIMIT);

  return (
    <ScreenContainer>
      <Text style={styles.title}>Статистика</Text>

      {/* Блок 1: личная статистика пользователя за выбранный период */}
      <View style={styles.sectionCard}>
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
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
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

      {/* Блок 2: общий рейтинг всех пользователей — отдельная карточка,
          явно отделённая от личной статистики выше. Заголовок кликабелен
          и открывает модалку с полным списком (со своей прокруткой). */}
      <View style={styles.sectionCard}>
        <View style={styles.leaderboardHeaderRow}>
          <TouchableOpacity
            onPress={() => setLeaderboardModalVisible(true)}
            testID="statistics-open-leaderboard-modal">
            <Text style={styles.sectionTitleNoMargin}>Рейтинг всех пользователей</Text>
          </TouchableOpacity>
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

        <TouchableOpacity
          style={styles.exerciseFilterButton}
          onPress={() => setExerciseFilterVisible(true)}
          testID="statistics-exercise-filter-button">
          <Text style={styles.exerciseFilterButtonText}>{leaderboardExercise}</Text>
          <Text style={styles.exerciseFilterArrow}>▾</Text>
        </TouchableOpacity>

        {loadingLeaderboard ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>Нет данных за этот период</Text>
        ) : (
          <>
            <FlatList
              data={leaderboardPreview}
              keyExtractor={item => item.userId}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
              renderItem={({item, index}) => (
                <LeaderboardRow
                  item={item}
                  index={index}
                  isCurrentUser={item.userId === userId}
                />
              )}
            />

            <TouchableOpacity
              style={styles.showAllButton}
              onPress={() => setLeaderboardModalVisible(true)}
              testID="statistics-show-all-leaderboard-button">
              <Text style={styles.showAllButtonText}>Показать весь рейтинг</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <CoefficientsModal
        visible={coefficientsVisible}
        onClose={() => setCoefficientsVisible(false)}
        exercises={exercises}
      />

      <ExerciseFilterModal
        visible={exerciseFilterVisible}
        onClose={() => setExerciseFilterVisible(false)}
        exerciseNames={exerciseNames}
        selected={leaderboardExercise}
        onSelect={setLeaderboardExercise}
      />

      <LeaderboardModal
        visible={leaderboardModalVisible}
        onClose={() => setLeaderboardModalVisible(false)}
        leaderboard={leaderboard}
        currentUserId={userId}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {...typography.screenTitle, marginBottom: 16, color: colors.textPrimary},

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  toggleRow: {flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16},
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.chip,
    marginRight: 8,
    marginBottom: 8,
  },
  toggleButtonActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  toggleText: {...typography.buttonSmall, fontSize: 13, color: colors.textPrimary},
  toggleTextActive: {color: colors.white},
  sectionTitle: {...typography.sectionTitle, marginBottom: 8, color: colors.textPrimary},
  sectionTitleNoMargin: {...typography.sectionTitle, color: colors.textPrimary},
  leaderboardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {fontSize: 20, color: colors.info},
  loader: {marginTop: 12},
  emptyText: {...typography.caption, fontSize: 14, color: colors.textPlaceholder, marginTop: 4, marginBottom: 12},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowHighlighted: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: colors.primary,
    marginVertical: 2,
  },
  exerciseText: {...typography.bodyBold, color: colors.textPrimary},
  repsText: {...typography.number, color: colors.primary},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 0,
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  totalLabel: {...typography.sectionTitle, fontSize: 18, color: colors.textPrimary},
  totalValue: {...typography.number, fontSize: 18, color: colors.primary},

  exerciseFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  exerciseFilterButtonText: {...typography.body, fontSize: 15, color: colors.textPrimary},
  exerciseFilterArrow: {fontSize: 14, color: colors.textMuted},

  showAllButton: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.chip,
  },
  showAllButtonText: {...typography.buttonSmall, color: colors.textPrimary},

  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownCard: {
    width: '82%',
    maxHeight: '60%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dropdownTitle: {...typography.sectionTitle, fontSize: 16, color: colors.textPrimary},
  dropdownList: {flexGrow: 0},

  modalCloseIcon: {fontSize: 18, color: colors.textPrimary},
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  modalExerciseName: {...typography.body, color: colors.textPrimary},
  modalCoefficientValue: {...typography.number, color: colors.primary},
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  modalOptionText: {...typography.body, color: colors.textPrimary},
  modalOptionTextActive: {color: colors.primary, fontWeight: 'bold'},
  modalOptionCheck: {fontSize: 16, color: colors.primary, fontWeight: 'bold'},
});