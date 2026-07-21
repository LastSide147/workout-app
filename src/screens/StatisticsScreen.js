import React, {useEffect, useState, useCallback, useRef} from 'react';
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
import {subscribeToWorkoutDays, getDayEntries} from '../services/workoutDays';
import {fetchLeaderboard} from '../services/ratings';
import {getDateKey} from '../utils/date';
import useExercises from '../hooks/useExercises';
import ScreenContainer from '../components/ScreenContainer';
import colors from '../theme/colors';
import typography from '../theme/typography';
import {getRepsIntensityColor} from '../constants/repsIntensity';

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

// Нужна только для личного блока "Мои упражнения" — у него свои
// данные, читаются напрямую по дням пользователя, без обращения к
// бакетам рейтинга.
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



// Сегментированный контрол (как переключатель вкладок в iOS) — одна
// скруглённая "дорожка" на всю ширину, сегменты делят её поровну
// (flex: 1 у каждого), активный сегмент — светлая "таблетка" внутри.
// Используется и на самой странице, и внутри модалки полного рейтинга.
function PeriodSelector({value, onChange, testIdPrefix}) {
  return (
    <View style={styles.segmentedTrack}>
      {PERIODS.map(({key, label}) => {
        const isActive = value === key;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.segment, isActive && styles.segmentActive]}
            onPress={() => onChange(key)}
            testID={`${testIdPrefix}-${key}`}>
            <Text
              style={[styles.segmentText, isActive && styles.segmentTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Компактное окно по центру экрана (не на весь экран) — используется
// для коэффициентов, фильтра по упражнению и полного рейтинга, чтобы
// выглядело одинаково: крупное скругление, тень, просторные отступы.
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
                <View style={styles.personalRow}>
                  <Text style={styles.personalExerciseText} numberOfLines={1}>
                    {item.exercise}
                  </Text>
                  <Text style={styles.repsPillText}>{item.reps}</Text>
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
// модалке с полным списком. Первые три места подсвечиваются золотом/
// серебром/бронзой. Теперь каждая строка — отдельная карточка (фон
// recessed, скругление, отступ снизу), а не плотная строка с линией —
// текущий пользователь получает поверх этого ещё рамку и подсветку.
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
// раздела или по кнопке "Показать весь рейтинг". Теперь внутри неё
// тоже есть переключатель периода (или пояснение про "только
// сегодня", если выбрано конкретное упражнение) — можно менять период
// прямо здесь, не закрывая список. Список использует ту же
// PeriodSelector/логику, что и страница — состояние общее, просто
// передаётся сюда пропсами.
function LeaderboardModal({
  visible,
  onClose,
  leaderboard,
  currentUserId,
  isExerciseFilterActive,
  leaderboardPeriod,
  onPeriodChange,
}) {
  return (
    <CenteredDropdownModal visible={visible} onClose={onClose} title="Рейтинг всех пользователей">
      <View style={styles.modalPeriodWrapper}>
        {isExerciseFilterActive ? (
          <Text style={styles.leaderboardPeriodNote}>
            Для конкретного упражнения — только сегодня
          </Text>
        ) : (
          <PeriodSelector
            value={leaderboardPeriod}
            onChange={onPeriodChange}
            testIdPrefix="statistics-leaderboard-modal-period"
          />
        )}
      </View>

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

export default function StatisticsScreen({userId}) {
  const [days, setDays] = useState({});

  const [personalPeriod, setPersonalPeriod] = useState('week');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('day');
  const [leaderboardExercise, setLeaderboardExercise] = useState(ALL_EXERCISES_OPTION);

  // exercises — намеренно берём тот срез хука, что содержит только
  // ОДИНОЧНЫЕ упражнения верхнего уровня (без папок). В Статистике
  // (и в личной разбивке "Мои упражнения", и в фильтре рейтинга, и в
  // справке по коэффициентам) упражнения из папок мастера сознательно
  // не показываются — просили только одиночные. На "Всего" это не
  // влияет: общая сумма считается по всем записанным повторениям
  // напрямую, независимо от того, что показано построчно.
  const {exercises, loadingExercises} = useExercises();
  const exerciseNames = exercises.map(item => item.name);
    const totalsRequestIdRef = useRef(0);


  const [totals, setTotals] = useState({});
  const [overallTotal, setOverallTotal] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);
    const [totalsPeriod, setTotalsPeriod] = useState(null);

  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [coefficientsVisible, setCoefficientsVisible] = useState(false);
  const [exerciseFilterVisible, setExerciseFilterVisible] = useState(false);
  const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToWorkoutDays(userId, setDays);
    return () => unsubscribe && unsubscribe();
  }, [userId]);

  const personalStartKey = getStartKeyForPeriod(personalPeriod, new Date());

  const loadTotals = useCallback(async () => {
    if (!userId) {
      return;
    }

    // Свой номерок для ЭТОГО конкретного запуска — увеличиваем общий
    // счётчик и запоминаем значение именно для этого вызова.
    const requestId = totalsRequestIdRef.current + 1;
    totalsRequestIdRef.current = requestId;

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

      // Пока шёл этот запрос, пользователь мог уже переключить период —
      // тогда запустился более новый запрос, и общий счётчик уже ушёл
      // вперёд. Если наш номерок больше не совпадает с последним —
      // значит, наш результат устарел, применять его нельзя.
      if (totalsRequestIdRef.current !== requestId) {
        return;
      }

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
      setTotalsPeriod(personalPeriod);
    } catch (error) {
      console.error('Ошибка подсчёта статистики:', error);
    } finally {
      // "Загрузка..." тоже убираем только если это всё ещё самый
      // свежий запрос — иначе устаревший запрос мог бы преждевременно
      // погасить индикатор загрузки для актуального, ещё не готового.
      if (totalsRequestIdRef.current === requestId) {
        setLoadingTotals(false);
      }
    }
  }, [userId, days, personalStartKey, personalPeriod]);

  // Ограничение по периоду касается ТОЛЬКО просмотра конкретного
  // упражнения (выбор из выпадающего списка) — там доступен только
  // сегодняшний день. Общий рейтинг по баллам ("Все упражнения") по-
  // прежнему можно смотреть за любой период.
  const isExerciseFilterActive = leaderboardExercise !== ALL_EXERCISES_OPTION;
  const effectiveLeaderboardPeriod = isExerciseFilterActive ? 'day' : leaderboardPeriod;

  const loadLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const filter =
        leaderboardExercise === ALL_EXERCISES_OPTION ? null : leaderboardExercise;
      const result = await fetchLeaderboard(effectiveLeaderboardPeriod, filter);
      setLeaderboard(result);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [effectiveLeaderboardPeriod, leaderboardExercise]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  useFocusEffect(
    useCallback(() => {
      loadLeaderboard();
    }, [loadLeaderboard]),
  );

  // Когда выбирают конкретное упражнение в фильтре — период сразу
  // сбрасывается на "день", чтобы после возврата к "Все упражнения"
  // не оставался незаметно выбранным какой-то другой период "из
  // прошлого раза" для просмотра по баллам.
  const handleSelectLeaderboardExercise = value => {
    setLeaderboardExercise(value);
    if (value !== ALL_EXERCISES_OPTION) {
      setLeaderboardPeriod('day');
    }
  };

  const list = exerciseNames
    .filter(exercise => totals[exercise] > 0)
    .map(exercise => ({exercise, reps: totals[exercise]}));

  const leaderboardPreview = leaderboard.slice(0, LEADERBOARD_PREVIEW_LIMIT);

  return (
    <ScreenContainer>
      <Text style={styles.title}>Статистика</Text>

      {/* Блок 1: личная статистика пользователя за выбранный период. */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Мои упражнения</Text>
        <PeriodSelector
          value={personalPeriod}
          onChange={setPersonalPeriod}
          testIdPrefix="statistics-personal-period"
        />

        {loadingExercises || loadingTotals || totalsPeriod !== personalPeriod ? (
          <Text style={styles.emptyText}>Загрузка...</Text>
        ) : (
          <>
            {list.length === 0 ? (
              <Text style={styles.emptyText}>Нет данных за этот период</Text>
            ) : (
              <>
                <View style={styles.columnHeaderRow}>
                  <Text style={styles.columnHeaderText}>Повторения</Text>
                </View>
                <FlatList
                  data={list}
                  keyExtractor={item => item.exercise}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                  renderItem={({item}) => (
                    <View style={styles.personalRow}>
                      <Text style={styles.personalExerciseText} numberOfLines={1}>
                        {item.exercise}
                      </Text>
                      <Text style={styles.repsPillText}>{item.reps}</Text>
                    </View>
                  )}
                />
              </>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Всего</Text>
              <Text
                style={[
                  styles.totalValue,
                  // Подсветка — только для периода "День": там "Всего"
                  // и есть повторения ровно за один день, пороги
                  // 100/300 применимы напрямую. Для недели/месяца/3
                  // месяцев/года это уже не "день", а сумма за много
                  // дней — там цвет не красим, остаётся обычный.
                  personalPeriod === 'day'
                    ? {color: getRepsIntensityColor(overallTotal)}
                    : null,
                ]}>
                {overallTotal}
              </Text>
            </View>
          </>
        )}
      </View>
      {/* Блок 2: общий рейтинг всех пользователей. Переключатель периода
          показывается только пока выбрано "Все упражнения" (рейтинг по
          баллам). Кнопка выбора упражнения теперь — скруглённая пилюля,
          как и переключатель периода (тот же стиль, что "элемент выбора
          даты"). */}
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

        {isExerciseFilterActive ? (
          <Text style={styles.leaderboardPeriodNote}>
            Только для текущего дня
          </Text>
        ) : (
          <PeriodSelector
            value={leaderboardPeriod}
            onChange={setLeaderboardPeriod}
            testIdPrefix="statistics-leaderboard-period"
          />
        )}

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
        onSelect={handleSelectLeaderboardExercise}
      />

      <LeaderboardModal
        visible={leaderboardModalVisible}
        onClose={() => setLeaderboardModalVisible(false)}
        leaderboard={leaderboard}
        currentUserId={userId}
        isExerciseFilterActive={isExerciseFilterActive}
        leaderboardPeriod={leaderboardPeriod}
        onPeriodChange={setLeaderboardPeriod}
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

  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {backgroundColor: colors.primary},
  segmentText: {...typography.buttonSmall, fontSize: 12, color: colors.textSecondary},
  segmentTextActive: {color: colors.white, fontWeight: 'bold'},

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

  leaderboardPeriodNote: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },

  columnHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  columnHeaderText: {...typography.caption, fontSize: 13, color: colors.textMuted},

  personalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.recessed,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  personalExerciseText: {...typography.bodyBold, color: colors.textPrimary, flexShrink: 1, marginRight: 12},
  repsPillText: {...typography.number, fontSize: 16, color: colors.primary},

  // Каждая строка рейтинга — теперь отдельная карточка (фон recessed,
  // скругление, отступ снизу между карточками), а не плотная строка с
  // линией-разделителем. Текущий пользователь получает поверх этого
  // ещё цветной фон и рамку (rowHighlighted).
 row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.recessed,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  rowHighlighted: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exerciseText: {...typography.bodyBold, color: colors.textPrimary},
  repsText: {...typography.number, color: colors.primary},
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.recessed,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  totalLabel: {...typography.sectionTitle, fontSize: 18, color: colors.textPrimary},
  totalValue: {...typography.number, fontSize: 18, color: colors.primary},

  // Кнопка выбора упражнения — теперь такая же скруглённая "пилюля",
  // как и переключатель периода (тот же фон/бордер, что у
  // segmentedTrack), а не отдельный прямоугольный стиль.
  exerciseFilterButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  // Крупнее скругление и тень — раньше карточка выглядела "плоско" и
  // ощущалась недоделанной.
  dropdownCard: {
    width: '86%',
    maxHeight: '68%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dropdownTitle: {...typography.sectionTitle, fontSize: 16, color: colors.textPrimary},
  // Отступы вокруг самого списка — раньше строки шли вплотную к краям
  // карточки, из-за чего всё выглядело "слипшимся".
  dropdownList: {flexGrow: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4},

  // Обёртка переключателя периода внутри модалки рейтинга — свой
  // горизонтальный отступ, т.к. сам PeriodSelector не находится внутри
  // dropdownList (он отдельный элемент над списком).
  modalPeriodWrapper: {paddingHorizontal: 14, paddingTop: 12},

  modalCloseIcon: {fontSize: 18, color: colors.textPrimary},
  // Строки коэффициентов и фильтра — теперь тоже карточки (фон
  // recessed, скругление, отступ снизу) вместо плотных строк с линией.
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.recessed,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  modalExerciseName: {...typography.body, color: colors.textPrimary},
  modalCoefficientValue: {...typography.number, color: colors.primary},
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.recessed,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  modalOptionText: {...typography.body, color: colors.textPrimary},
  modalOptionTextActive: {color: colors.primary, fontWeight: 'bold'},
  modalOptionCheck: {fontSize: 16, color: colors.primary, fontWeight: 'bold'},
});