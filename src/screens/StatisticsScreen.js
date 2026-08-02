import React, {useEffect, useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {subscribeToWorkoutDays} from '../services/workoutDays';
import {fetchLeaderboard, recalculateDayRating, shouldSkipBulkRecalc} from '../services/ratings';import {getProfileDemographics} from '../services/profile';
import {loadStatisticsFilters, saveStatisticsFilters} from '../services/statisticsFilters';
import {getDateKey} from '../utils/date';
import {calculateAge} from '../utils/age';
import useExercises from '../hooks/useExercises';
import ScreenContainer from '../components/ScreenContainer';
import colors from '../theme/colors';
import typography from '../theme/typography';
import {getRepsIntensityColor} from '../constants/repsIntensity';
import UpdateAvailableIcon from '../components/UpdateAvailableIcon';
import {getCountryLabel} from '../utils/location';
import {
  ALL_AGES_OPTION,
  ALL_WEIGHTS_OPTION,
  AGE_FILTER_OPTIONS,
  WEIGHT_FILTER_OPTIONS,
  EXACT_MATCH_LABEL,
  getAgeToleranceYears,
  getWeightToleranceKg,
  ALL_LOCATIONS_OPTION,
  CITY_FILTER_OPTION,
  COUNTRY_FILTER_OPTION,
  LOCATION_FILTER_OPTIONS,
  getLocationFilterMode,
} from '../constants/demographicsFilters';
const PERIODS = [
  {key: 'day', label: 'День'},
  {key: 'week', label: 'Неделя'},
  {key: 'month', label: 'Месяц'},
  {key: 'year', label: 'Год'},
];

const ALL_EXERCISES_OPTION = 'Все упражнения';

// Строится один раз для КАЖДОГО открытия модалки (значения меняются от
// собственного возраста/веса) — превращает список общих подписей
// (AGE_FILTER_OPTIONS/WEIGHT_FILTER_OPTIONS, например "Точно как у
// меня") в пары {value, label} для SimpleFilterModal. value — то же
// самое общее значение (не меняется, по нему идёт вся логика фильтра),
// label — то, что видно в списке: у пункта "точного совпадения"
// подставляется реальное число ("29"), у остальных пунктов подпись не
// меняется.
function buildFilterOptions(rawOptions, ownValue) {
  return rawOptions.map(rawValue => ({
    value: rawValue,
    label:
      rawValue === EXACT_MATCH_LABEL && typeof ownValue === 'number'
        ? String(ownValue)
        : rawValue,
  }));
}

// Показывает название кнопки-фильтра в свёрнутом виде (без открытия
// модалки). Если выбрано "Без ограничений" — показываем короткое
// имя поля (например, "Возраст"), а не пустой прочерк. Если выбрано
// "Точно как у меня" — подставляем реальное число (возраст/вес).
// Иначе (выбран конкретный диапазон, например "±5 лет") — показываем
// его как есть.
function getFilterButtonLabel(selectedValue, allOptionLabel, ownValue, placeholderLabel) {
  if (selectedValue === allOptionLabel) {
    return placeholderLabel;
  }
  if (selectedValue === EXACT_MATCH_LABEL && typeof ownValue === 'number') {
    return String(ownValue);
  }
  return selectedValue;
}

// То же самое, что buildFilterOptions/getFilterButtonLabel выше, но для// города/страны: вместо общих подписей "Мой город"/"Моя страна"
// показываем то, что реально стоит в профиле ("Воронеж"/"Россия") —
// value (по которому работает вся логика фильтра) при этом не
// меняется, меняется только то, что видно пользователю.
function buildLocationFilterOptions(ownCity, ownCountryLabel) {
  return [
    {value: ALL_LOCATIONS_OPTION, label: ALL_LOCATIONS_OPTION},
    {value: COUNTRY_FILTER_OPTION, label: ownCountryLabel || COUNTRY_FILTER_OPTION},
    {value: CITY_FILTER_OPTION, label: ownCity || CITY_FILTER_OPTION},
  ];
}

function getLocationFilterButtonLabel(selectedValue, ownCity, ownCountryLabel, placeholderLabel) {
  if (selectedValue === ALL_LOCATIONS_OPTION) {
    return placeholderLabel;
  }
  if (selectedValue === CITY_FILTER_OPTION) {
    return ownCity || CITY_FILTER_OPTION;
  }
  if (selectedValue === COUNTRY_FILTER_OPTION) {
    return ownCountryLabel || COUNTRY_FILTER_OPTION;
  }
  return selectedValue;
}

// Сколько строк рейтинга показывать сразу на странице Статистики, без
// открытия модалки с полным списком. Полный список (с прокруткой)
// доступен по тапу на заголовок раздела или по кнопке под списком.
const LEADERBOARD_PREVIEW_LIMIT = 15;

// Цвета для первых трёх мест рейтинга — золото/серебро/бронза. Индекс
// в массиве = место в рейтинге минус 1 (0 → первое место и т.д.).
const RANK_COLORS = [colors.gold, colors.silver, colors.bronze];

// Раньше здесь была своя копия toDateKey (local-time), а параллельно
// в utils/date.js жила другая функция getDateKey на UTC — то есть на
// один и тот же день в приложении было два способа получить ключ, и
// они не всегда совпадали. Теперь getDateKey в utils/date.js тоже
// считает по локальному времени, так что своя копия больше не нужна —
// используем общую функцию (см. импорт вверху файла), дублирования
// логики и расхождений между экранами больше нет.
//
// Нужна только для личного блока "Мои упражнения" — у него свои
// данные, читаются напрямую по дням пользователя, без обращения к
// бакетам рейтинга.
function getStartKeyForPeriod(periodKey, referenceDate) {
  const date = new Date(referenceDate);

  switch (periodKey) {
    case 'day':
      return getDateKey(date);
    case 'week': {
      const dayOfWeek = date.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(date);
      monday.setDate(date.getDate() - diffToMonday);
      return getDateKey(monday);
    }
    case 'month': {
      return getDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    case 'year': {
      return getDateKey(new Date(date.getFullYear(), 0, 1));
    }
    default:
      return getDateKey(date);
  }
}

// Сегментированный контрол (как переключатель вкладок в iOS) — одна
// скруглённая "дорожка" на всю ширину, сегменты делят её поровну
// (flex: 1 у каждого), активный сегмент — светлая "таблетка" внутри.
// Используется и на самой странице, и внутри модалки полного рейтинга.
function PeriodSelector({value, onChange, testIdPrefix, compact}) {
  return (
    <View style={[styles.segmentedTrack, compact && styles.segmentedTrackCompact]}>
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

// Модалка со справкой по коэффициентам. Одиночные упражнения — плоским
// списком сверху. Папки — отдельным блоком снизу: заголовок папки +
// её упражнения, всё это на ОДНОЙ общей карточке (folderCard), которая
// растягивается вниз, пока папка развёрнута — так видно, что список
// внутри неё действительно раскрылся, а не просто ничего не произошло.
function CoefficientsModal({visible, onClose, exercises, folders, folderExercises}) {
  const [expandedFolderId, setExpandedFolderId] = useState(null);

  useEffect(() => {
    if (visible) {
      setExpandedFolderId(null);
    }
  }, [visible]);

  const toggleFolder = folderId => {
    setExpandedFolderId(current => (current === folderId ? null : folderId));
  };

  const renderExerciseRow = item => (
    <View style={styles.personalRow} key={item.id}>
      <Text style={styles.personalExerciseText} numberOfLines={1}>
        {item.displayName}
      </Text>
      <Text style={styles.repsPillText}>{item.coefficient}</Text>
    </View>
  );

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
        contentContainerStyle={styles.dropdownListContent}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => renderExerciseRow(item)}
        ListFooterComponent={
          folders.length > 0 ? (
            <View>
              {folders.map(folder => {
                const isExpanded = expandedFolderId === folder.id;
                const folderItems = folderExercises[folder.id] || [];

                return (
                  <View key={folder.id} style={styles.folderCard}>
                    <TouchableOpacity
                      style={styles.filterFolderRow}
                      onPress={() => toggleFolder(folder.id)}
                      testID={`statistics-coefficients-folder-${folder.id}`}>
                      <Text style={styles.filterFolderText}>{folder.name}</Text>
                      <Text style={styles.exerciseFilterArrow}>
                        {isExpanded ? '▾' : '▸'}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded
                      ? folderItems.map(item => (
                          <View style={styles.filterFolderChildRow} key={item.id}>
                            <Text style={styles.personalExerciseText} numberOfLines={1}>
                              {item.displayName}
                            </Text>
                            <Text style={styles.repsPillText}>{item.coefficient}</Text>
                          </View>
                        ))
                      : null}
                  </View>
                );
              })}
            </View>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.emptyText}>Список упражнений пуст</Text>}
      />
    </CenteredDropdownModal>
  );
}

// Модалка выбора упражнения для фильтра рейтинга. Та же логика папок
// одной карточкой, что и в CoefficientsModal выше, только строки
// кликабельны — тап выбирает упражнение и сразу закрывает модалку.
function ExerciseFilterModal({visible, onClose, exercises, folders, folderExercises, selected, onSelect}) {
  const [expandedFolderId, setExpandedFolderId] = useState(null);

  useEffect(() => {
    if (visible) {
      setExpandedFolderId(null);
    }
  }, [visible]);

  // Верхний уровень — "Все упражнения" плюс одиночные упражнения без
  // папки. Упражнения из папок сюда НЕ попадают плоским списком —
  // иначе список "Подтягивание с отягощением 2/4/6/8 кг..." рос бы
  // бесконечно. Вместо этого ниже отдельным блоком идут папки —
  // сворачиваемые, разворачивать нужно вручную.
  const options = [ALL_EXERCISES_OPTION, ...exercises.map(item => item.name)];

  const toggleFolder = folderId => {
    setExpandedFolderId(current => (current === folderId ? null : folderId));
  };

  const renderOptionRow = (value, key) => {
    const isActive = value === selected;
    return (
      <TouchableOpacity
        key={key}
        style={styles.modalOptionRow}
        onPress={() => {
          onSelect(value);
          onClose();
        }}
        testID={`statistics-exercise-filter-option-${value}`}>
        <Text style={[styles.modalOptionText, isActive ? styles.modalOptionTextActive : null]}>
          {value}
        </Text>
        {isActive ? <Text style={styles.modalOptionCheck}>✓</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <CenteredDropdownModal visible={visible} onClose={onClose} title="Фильтр по упражнению">
      <FlatList
        data={options}
        keyExtractor={item => item}
        testID="statistics-exercise-filter-list"
        style={styles.dropdownList}
        contentContainerStyle={styles.dropdownListContent}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => renderOptionRow(item, item)}
        ListFooterComponent={
          folders.length > 0 ? (
            <View>
              {folders.map(folder => {
                const isExpanded = expandedFolderId === folder.id;
                const folderItems = folderExercises[folder.id] || [];

                return (
                  <View key={folder.id} style={styles.folderCard}>
                    <TouchableOpacity
                      style={styles.filterFolderRow}
                      onPress={() => toggleFolder(folder.id)}
                      testID={`statistics-exercise-filter-folder-${folder.id}`}>
                      <Text style={styles.filterFolderText}>{folder.name}</Text>
                      <Text style={styles.exerciseFilterArrow}>
                        {isExpanded ? '▾' : '▸'}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded
                      ? folderItems.map(item => {
                          const isActive = item.displayName === selected;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.filterFolderChildRow}
                              onPress={() => {
                                onSelect(item.displayName);
                                onClose();
                              }}
                              testID={`statistics-exercise-filter-option-${item.displayName}`}>
                              <Text
                                style={[
                                  styles.modalOptionText,
                                  isActive ? styles.modalOptionTextActive : null,
                                ]}>
                                {item.displayName}
                              </Text>
                              {isActive ? (
                                <Text style={styles.modalOptionCheck}>✓</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })
                      : null}
                  </View>
                );
              })}
            </View>
          ) : null
        }
      />
    </CenteredDropdownModal>
  );
}

// Простая модалка выбора ОДНОГО варианта из плоского списка —
// переиспользуется и для фильтра по возрасту, и для фильтра по весу
// (только разные title/options). Та же строка modalOptionRow с
// галочкой, что и в фильтре по упражнению, но без папок — тут список
// всегда короткий и плоский.
//
// options — массив {value, label}: value — то, что реально хранится в
// состоянии фильтра и участвует в сравнении/выборе (не меняется), label
// — то, что видно пользователю (может быть персонализировано: "29"
// вместо общей подписи "Точно как у меня" — см. buildFilterOptions
// ниже по файлу).
//
// subtitle — необязательная строка над списком: "Ваш возраст: 34 года"/
// "Ваш вес: 72 кг". Без неё пользователь видит только шаги допуска
// ("±10 лет") и не понимает, от какого числа они вообще отсчитываются —
// пришлось бы уходить в Профиль и смотреть там. Значение берётся из
// того же профиля (ownAge/ownDemographics.weight в StatisticsScreen),
// так что здесь показано ровно то же число, что и в личном кабинете.
function SimpleFilterModal({visible, onClose, title, subtitle, options, selected, onSelect}) {
  return (
    <CenteredDropdownModal visible={visible} onClose={onClose} title={title}>
      {subtitle ? <Text style={styles.demographicsFilterSubtitle}>{subtitle}</Text> : null}
      <FlatList
        data={options}
        keyExtractor={item => item.value}
        style={styles.dropdownList}
        contentContainerStyle={styles.dropdownListContent}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => {
          const isActive = item.value === selected;
          return (
            <TouchableOpacity
              style={styles.modalOptionRow}
              onPress={() => {
                onSelect(item.value);
                onClose();
              }}
              testID={`statistics-demographics-filter-option-${item.value}`}>
              <Text style={[styles.modalOptionText, isActive ? styles.modalOptionTextActive : null]}>
                {item.label}
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
        contentContainerStyle={styles.dropdownListContent}
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

  // Раньше "сегодня" здесь было константой модуля — вычислялась ОДИН
  // раз при первой загрузке экрана в приложении и больше никогда не
  // обновлялась. Если телефон не выключать (а обычно так и есть —
  // приложение просто уходит в фон), то после полуночи это значение
  // оставалось вчерашним, а personalStartKey ниже — настоящим
  // сегодняшним днём (он пересчитывается на каждый рендер). В
  // результате диапазон "с сегодня по вчера" получался пустым, и
  // блок "Мои упражнения" показывал 0, хотя тренировка в этот день
  // была — именно это и было на скриншоте. Теперь дата хранится в
  // состоянии и обновляется каждый раз, когда экран снова попадает в
  // фокус (открыли вкладку "Статистика"), поэтому "сегодня" никогда
  // не протухает дольше, чем до следующего захода на экран.
  const [todayKey, setTodayKey] = useState(() => getDateKey(new Date()));

  useFocusEffect(
    useCallback(() => {
      setTodayKey(getDateKey(new Date()));
    }, []),
  );

  const [personalPeriod, setPersonalPeriod] = useState('week');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('day');
  const [leaderboardExercise, setLeaderboardExercise] = useState(ALL_EXERCISES_OPTION);

  // exercises — только одиночные упражнения верхнего уровня (без
  // папок), allExercises — вообще всё плоским списком с полем
  // displayName. Плоские списки (кнопки/заголовок фильтра) используют
  // exercises, "Мои упражнения" и общий рейтинг — allExercises, чтобы
  // упражнения из папок тоже учитывались.
  const {exercises, allExercises, folders, folderExercises, loadingExercises, exerciseCoefficients} =
    useExercises();

  // Для "Мои упражнения" нужны названия ВСЕХ упражнений, включая
  // лежащие в папках (под их полным именем вида "Папка Название") —
  // иначе то, что залогировано из папки, никогда не попадёт в личный
  // список.
  const exerciseNames = allExercises.map(item => item.displayName);

  // ВАЖНО: должна быть объявлена ДО loggedExerciseNames ниже (та её
  // сразу использует). Раньше liveTodayKey была объявлена гораздо ниже
  // по файлу (рядом с personalStartKey) — из-за этого здесь она
  // использовалась раньше своего объявления и превращалась в undefined,
  // из-за чего days[liveTodayKey] всегда было пустым, а фильтр по
  // упражнению в рейтинге — всегда показывал только "Все упражнения".
  // "Мои упражнения" при этом работали нормально: тот блок кода
  // находится НИЖЕ настоящего объявления liveTodayKey, там бага не было.
  const liveTodayKey = getDateKey(new Date());

  const loggedExerciseNames = Object.keys(
    (days[liveTodayKey] && days[liveTodayKey].byExercise) || {},
  );
  // Одиночные упражнения верхнего уровня — оставляем только те, что
  // сегодня реально введены.
  const loggedExercises = exercises.filter(item =>
    loggedExerciseNames.includes(item.name),
  );

  // Внутри папок — та же логика: показываем только выполненные сегодня
  // упражнения, а саму папку — только если внутри неё есть хотя бы одно
  // такое упражнение (иначе в списке была бы пустая папка, разворачивать
  // которую незачем).
  const loggedFolderExercises = {};
  folders.forEach(folder => {
    loggedFolderExercises[folder.id] = (folderExercises[folder.id] || []).filter(item =>
      loggedExerciseNames.includes(item.displayName),
    );
  });
  const loggedFolders = folders.filter(
    folder => loggedFolderExercises[folder.id].length > 0,
  );


  const [totals, setTotals] = useState({});
  const [overallTotal, setOverallTotal] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [totalsPeriod, setTotalsPeriod] = useState(null);

  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const [coefficientsVisible, setCoefficientsVisible] = useState(false);
  const [exerciseFilterVisible, setExerciseFilterVisible] = useState(false);
  const [leaderboardModalVisible, setLeaderboardModalVisible] = useState(false);

  // Фильтр по возрасту и весу — работает вместе с фильтром по
  // упражнению и с периодом, ни один из них не выключает другие. Пока
  // выбрано значение "Любой" — на результат не влияет.
const [ageFilter, setAgeFilter] = useState(ALL_AGES_OPTION);
  const [weightFilter, setWeightFilter] = useState(ALL_WEIGHTS_OPTION);
  const [ageFilterVisible, setAgeFilterVisible] = useState(false);
  const [weightFilterVisible, setWeightFilterVisible] = useState(false);
  const [locationFilter, setLocationFilter] = useState(ALL_LOCATIONS_OPTION);
  const [locationFilterVisible, setLocationFilterVisible] = useState(false);

  // Восстановление сохранённых фильтров Статистики (период рейтинга,
  // допуск по возрасту, допуск по весу, упражнение) — см.
  // src/services/statisticsFilters.js. Раньше все эти значения жили
  // только в React-состоянии этого экрана: закрыл приложение — или
  // вышло OTA-обновление и JS-бандл перезапустился с нуля — и все
  // настройки сбрасывались на умолчания. AsyncStorage хранится отдельно
  // от JS-бандла, поэтому переживает и то, и другое сама по себе.
  //
  // filtersRestored — не ref, а состояние: если бы это был ref, эффект
  // сохранения ниже мог бы не узнать вовремя, что восстановление уже
  // произошло (ref не вызывает повторный рендер/повторную проверку
  // эффектов сам по себе).
  const [filtersRestored, setFiltersRestored] = useState(false);
  // Выбранное упражнение восстанавливаем отдельно от остальных трёх —
  // его допустимые значения известны только после загрузки списка
  // упражнений (exerciseNames), а список упражнений грузится отдельно
  // и не всегда успевает к моменту, когда прочитается AsyncStorage.
  // undefined — ещё не прочитано из хранилища, null — прочитано, но
  // сохранённого упражнения не было.
  const pendingExerciseFilterRef = useRef(undefined);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const saved = await loadStatisticsFilters();
      if (cancelled) {
        return;
      }

      if (saved) {
        // Каждое значение сверяется со СПИСКОМ ДЕЙСТВИТЕЛЬНЫХ НА
        // СЕЙЧАС вариантов, а не применяется вслепую — если в будущей
        // версии приложения набор допустимых значений изменится (шаги
        // допуска, периоды и т.п.) и сохранённое значение перестанет
        // быть среди них, оно просто тихо не применится, и останется
        // значение по умолчанию, а не сломанный старый выбор.
        if (PERIODS.some(period => period.key === saved.leaderboardPeriod)) {
          setLeaderboardPeriod(saved.leaderboardPeriod);
        }
        if (AGE_FILTER_OPTIONS.includes(saved.ageFilter)) {
          setAgeFilter(saved.ageFilter);
        }
if (WEIGHT_FILTER_OPTIONS.includes(saved.weightFilter)) {
          setWeightFilter(saved.weightFilter);
        }
        if (LOCATION_FILTER_OPTIONS.includes(saved.locationFilter)) {
          setLocationFilter(saved.locationFilter);
        }
        pendingExerciseFilterRef.current = saved.leaderboardExercise || null;      } else {
        pendingExerciseFilterRef.current = null;
      }

      setFiltersRestored(true);
    }

    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Довосстанавливает упражнение, как только выполнены ОБА условия:
  // основное восстановление завершилось (filtersRestored) И список
  // упражнений подгрузился (!loadingExercises) — порядок, в котором
  // это происходит, может быть любым, поэтому эффект зависит от обоих
  // и срабатывает, какое бы из двух ни завершилось последним.
  useEffect(() => {
    if (!filtersRestored || loadingExercises) {
      return;
    }
    const pending = pendingExerciseFilterRef.current;
    if (pending === undefined || pending === null) {
      return;
    }
    pendingExerciseFilterRef.current = undefined;
    // Сверяем не со всем каталогом, а с тем, что выполнено СЕГОДНЯ —
    // тем же списком, что ограничивает и саму модалку выбора (см.
    // loggedExerciseNames выше). Иначе можно было бы тихо восстановить
    // вчерашний выбор, которого сегодня уже нет среди вариантов.
    if (pending === ALL_EXERCISES_OPTION || loggedExerciseNames.includes(pending)) {
      setLeaderboardExercise(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersRestored, loadingExercises, days, todayKey]);
  // Сохраняем при каждом изменении любого из четырёх фильтров — но
  // только после того, как восстановление выше завершилось. Без этого
  // условия самый первый рендер (со значениями по умолчанию, ещё до
  // того как прочитались сохранённые) тут же перезаписал бы уже
  // сохранённые настройки умолчаниями, опередив восстановление.
  useEffect(() => {
    if (!filtersRestored) {
      return;
    }
saveStatisticsFilters({
      leaderboardPeriod,
      ageFilter,
      weightFilter,
      leaderboardExercise,
      locationFilter,
    });
  }, [filtersRestored, leaderboardPeriod, ageFilter, weightFilter, leaderboardExercise, locationFilter]);
  // Собственные возраст/вес пользователя (из профиля) — нужны только
  // для того, чтобы решить, доступны ли вообще кнопки фильтра ниже.
  // Фильтровать чужие данные, не заполнив свои — нелогично для
  // пользователя, поэтому кнопки заблокированы, пока в профиле нет
  // даты рождения/веса.
const [ownDemographics, setOwnDemographics] = useState({
    birthYear: null,
    birthMonth: null,
    weight: null,
    countryCode: null,
    city: null,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadOwnDemographics() {
        if (!userId) {
          return;
        }
        try {
          const data = await getProfileDemographics(userId);
          if (!cancelled) {
            setOwnDemographics(data);
          }
        } catch (error) {
          console.error('Не удалось прочитать возраст/вес профиля:', error);
        }
      }

      loadOwnDemographics();
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

const hasAgeFilled = Boolean(ownDemographics.birthYear && ownDemographics.birthMonth);
  const hasWeightFilled = typeof ownDemographics.weight === 'number';
  const hasLocationFilled = Boolean(ownDemographics.countryCode && ownDemographics.city);
  // Свой точный возраст (число, не диапазон) — фильтр относительный
  // ("±10 лет"), поэтому граница считается от этого числа, а не от
  // общего для всех диапазона. null, пока дата рождения не заполнена —
  // тогда и фильтр всё равно недоступен (см. hasAgeFilled выше и
  // блокировку кнопки ниже).
  const ownAge = calculateAge(ownDemographics.birthYear, ownDemographics.birthMonth);

  useEffect(() => {
    const unsubscribe = subscribeToWorkoutDays(userId, setDays);
    return () => unsubscribe && unsubscribe();
  }, [userId]);

  const personalStartKey = getStartKeyForPeriod(personalPeriod, new Date());
  // Раньше здесь на каждый выбранный период (день/неделя/месяц/год)
  // отдельно ходили в базу за entries КАЖДОГО подходящего дня —
  // getDayEntries(userId, dateKey) для каждого dateKey из диапазона.
  // Это и было самым дорогим местом во всей статистике: например,
  // "Год" мог стоить около сотни лишних чтений за один открытый экран.
  //
  // Теперь это не нужно. setExerciseEntry/deleteExerciseEntry (см.
  // services/workoutDays.js) при каждом сохранении сами дублируют
  // повторения упражнения прямо в поле byExercise документа дня. А
  // документ дня и так уже целиком лежит в памяти в объекте days —
  // подписка subscribeToWorkoutDays выше по файлу читает его живьём и
  // бесплатно для ВСЕХ дней сразу, независимо от выбранного периода.
  // Поэтому подсчёт стал обычным синхронным суммированием уже
  // загруженных данных — без единого нового обращения к Firestore, и
  // без гонки между переключениями периода (раньше для неё нужен был
  // requestId — теперь между стартом и концом подсчёта нет асинхронного
  // разрыва, переключить период "посреди" вычисления просто нельзя).
  const loadTotals = useCallback(() => {
    if (!userId) {
      return;
    }

  const matchingDateKeys = Object.keys(days).filter(
      dateKey =>
        dateKey >= personalStartKey &&
        dateKey <= liveTodayKey &&
        days[dateKey].hasExercises,
    );

    const newTotals = {};
    let newOverallTotal = 0;

    matchingDateKeys.forEach(dateKey => {
      const byExercise = days[dateKey].byExercise || {};
      Object.keys(byExercise).forEach(exercise => {
        const reps = byExercise[exercise] || 0;
        newTotals[exercise] = (newTotals[exercise] || 0) + reps;
        newOverallTotal += reps;
      });
    });

    setTotals(newTotals);
    setOverallTotal(newOverallTotal);
    setTotalsPeriod(personalPeriod);
    setLoadingTotals(false);
  }, [userId, days, personalStartKey, personalPeriod, liveTodayKey]);

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
      // ageFilter/weightFilter здесь — подписи вида "±10 лет"/"Без
      // ограничений". getAgeToleranceYears/getWeightToleranceKg достают
      // из них число допуска (или null, если фильтр выключен) — а
      // граница диапазона считается от ownAge/ownDemographics.weight,
      // собственных значений смотрящего (см. пояснение в
      // fetchLeaderboard в services/ratings.js).
const demographicFilter = {
        ageToleranceYears: getAgeToleranceYears(ageFilter),
        viewerAge: ownAge,
        weightToleranceKg: getWeightToleranceKg(weightFilter),
        viewerWeight: ownDemographics.weight,
        locationMode: getLocationFilterMode(locationFilter),
        viewerCountryCode: ownDemographics.countryCode,
        viewerCity: ownDemographics.city,
      };
      const result = await fetchLeaderboard(
        effectiveLeaderboardPeriod,
        filter,
        demographicFilter,
      );
      setLeaderboard(result);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга:', error);
    } finally {
      setLoadingLeaderboard(false);
    }
    // ageFilter/weightFilter/ownAge/ownDemographics.weight — в
    // зависимостях: как только человек выбирает допуск (или
    // подгружается собственный профиль), loadLeaderboard
    // пересоздаётся, и тот же useFocusEffect ниже (у него
    // loadLeaderboard тоже в зависимостях) сразу перезапускает загрузку
    // — так же, как уже работает фильтр по упражнению.
}, [
    effectiveLeaderboardPeriod,
    leaderboardExercise,
    ageFilter,
    weightFilter,
    ownAge,
    ownDemographics.weight,
    locationFilter,
    ownDemographics.countryCode,
    ownDemographics.city,
  ]);

  useEffect(() => {
    loadTotals();
  }, [loadTotals]);

  // "Мои упражнения" выше читает повторения НАПРЯМУЮ из записей дня —
  // поэтому там число верное всегда. А "Рейтинг всех пользователей"
  // читает уже ГОТОВЫЙ бакет leaderboardTotals/day-{сегодня}/... —
  // и раньше этот бакет обновлялся только когда пользователь заходил
  // на вкладку "Тренировка" или "История" (там висит recalculateAllRatings
  // при фокусе). Если зайти сразу в "Статистику", не открыв те вкладки
  // в эту сессию, бакет за сегодня мог остаться не досчитанным — отсюда
  // "данные есть, а в фильтре по упражнению пусто". Поэтому здесь тоже,
  // при каждом фокусе на "Статистику", сначала досчитываем рейтинг
  // ИМЕННО сегодняшнего дня (один день — дёшево, полный пересчёт
  // истории не нужен), и только потом читаем бакет для рейтинга.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

async function syncTodayThenLoadLeaderboard() {
        const todayHasWorkout = Boolean(days[todayKey] && days[todayKey].hasExercises);
        // shouldSkipBulkRecalc — та же защита от повторной записи в один
        // и тот же документ рейтинга чаще, чем раз в 5 секунд (см.
        // подробное объяснение рядом с её определением в ratings.js).
        // Раньше ею была прикрыта только recalculateAllRatings
        // (WorkoutLogScreen/WorkoutHistoryScreen), а прямой вызов
        // recalculateDayRating отсюда — нет. Это и вызывало
        // [firestore/permission-denied]: при быстром повторном заходе на
        // "Статистику" (или смене фильтра, из-за которой пересоздаётся
        // loadLeaderboard) сервер отклонял слишком частую запись того же
        // дня. Карта задержки общая (ключ userId:dateKey) — если тот же
        // день уже недавно пересчитан из "Тренировки"/"Истории", здесь
        // тоже просто пропустим лишнюю попытку, а не получим ошибку.
        if (
          userId &&
          !loadingExercises &&
          todayHasWorkout &&
          !shouldSkipBulkRecalc(userId, todayKey)
        ) {
          try {
            await recalculateDayRating(userId, todayKey, exerciseCoefficients);
          } catch (error) {
            console.error('Не удалось обновить рейтинг сегодняшнего дня:', error);
          }
        }
        if (!cancelled) {
          loadLeaderboard();
        }
      }

      syncTodayThenLoadLeaderboard();
      return () => {
        cancelled = true;
      };
    }, [userId, todayKey, days, loadingExercises, exerciseCoefficients, loadLeaderboard]),
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

  // Списки для модалок фильтра — персонализированные под собственный
  // возраст/вес (см. buildFilterOptions выше). Пересчитываются на
  // каждый рендер — это просто map по короткому (до 7 пунктов) массиву,
  // не запрос к БД, дорогим это не является.
const ageFilterOptions = buildFilterOptions(AGE_FILTER_OPTIONS, ownAge);
  const weightFilterOptions = buildFilterOptions(WEIGHT_FILTER_OPTIONS, ownDemographics.weight);
  // Название страны по коду ("RU" → "Россия") — то же самое, что
  // показывается в профиле (getCountryLabel уже используется там же).
  const ownCountryLabel = getCountryLabel(ownDemographics.countryCode);
  const locationFilterOptions = buildLocationFilterOptions(ownDemographics.city, ownCountryLabel);
  return (
    <ScreenContainer>
<View style={styles.titleRow}>
        <Text style={styles.title}>Статистика</Text>
        <UpdateAvailableIcon />
      </View>
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

      {/* Блок 2: общий рейтинг всех пользователей. */}
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
          <Text style={styles.leaderboardPeriodNote}>Только для текущего дня</Text>
        ) : (
          <PeriodSelector
            value={leaderboardPeriod}
            onChange={setLeaderboardPeriod}
            testIdPrefix="statistics-leaderboard-period"
            compact
          />
        )}

{/* Раньше локация стояла отдельной полноширинной строкой — занимала
            слишком много места. Теперь она первая кнопка в общем ряду
            фильтров, вместе с возраст/вес/упражнение — стало 4 кнопки
            в одном ряду вместо отдельной строки + ряда из трёх. */}
        <View style={styles.demographicsFilterRow}>
          <TouchableOpacity
            style={[
              styles.demographicsFilterButton,
              styles.demographicsFilterButtonSpacing,
              !hasLocationFilled && styles.demographicsFilterButtonDisabled,
            ]}
            onPress={() => {
              if (!hasLocationFilled) {
                Alert.alert(
                  'Фильтр недоступен',
                  'Чтобы фильтровать рейтинг по городу или стране, сначала укажите страну и город в профиле.',
                );
                return;
              }
              setLocationFilterVisible(true);
            }}
            testID="statistics-location-filter-button">
            <Text
              style={[
                styles.exerciseFilterButtonText,
                !hasLocationFilled && styles.demographicsFilterButtonTextDisabled,
              ]}
              numberOfLines={1}>
              {getLocationFilterButtonLabel(locationFilter, ownDemographics.city, ownCountryLabel, 'Локация')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.demographicsFilterButton,
              styles.demographicsFilterButtonSpacing,
              !hasAgeFilled && styles.demographicsFilterButtonDisabled,
            ]}
            onPress={() => {
              if (!hasAgeFilled) {
                Alert.alert(
                  'Фильтр недоступен',
                  'Чтобы фильтровать рейтинг по возрасту, сначала укажите дату рождения в профиле.',
                );
                return;
              }
              setAgeFilterVisible(true);
            }}
            testID="statistics-age-filter-button">
            <Text
              style={[
                styles.exerciseFilterButtonText,
                !hasAgeFilled && styles.demographicsFilterButtonTextDisabled,
              ]}
              numberOfLines={1}>
              {getFilterButtonLabel(ageFilter, ALL_AGES_OPTION, ownAge, 'Возраст')}
            </Text>

          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.demographicsFilterButton,
              styles.demographicsFilterButtonSpacing,
              !hasWeightFilled && styles.demographicsFilterButtonDisabled,
            ]}
            onPress={() => {
              if (!hasWeightFilled) {
                Alert.alert(
                  'Фильтр недоступен',
                  'Чтобы фильтровать рейтинг по весу, сначала укажите вес в профиле.',
                );
                return;
              }
              setWeightFilterVisible(true);
            }}
            testID="statistics-weight-filter-button">
            <Text
              style={[
                styles.exerciseFilterButtonText,
                !hasWeightFilled && styles.demographicsFilterButtonTextDisabled,
              ]}
              numberOfLines={1}>
              {getFilterButtonLabel(weightFilter, ALL_WEIGHTS_OPTION, ownDemographics.weight, 'Вес')}
            </Text>

          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demographicsFilterButton}
            onPress={() => setExerciseFilterVisible(true)}
            testID="statistics-exercise-filter-button">
            <Text style={styles.exerciseFilterButtonText} numberOfLines={1}>
              {leaderboardExercise === ALL_EXERCISES_OPTION ? 'Упр.' : leaderboardExercise}
            </Text>

          </TouchableOpacity>
        </View>

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
        folders={folders}
        folderExercises={folderExercises}
      />

<ExerciseFilterModal
        visible={exerciseFilterVisible}
        onClose={() => setExerciseFilterVisible(false)}
        exercises={loggedExercises}
        folders={loggedFolders}
        folderExercises={loggedFolderExercises}
        selected={leaderboardExercise}
        onSelect={handleSelectLeaderboardExercise}
      />

      <SimpleFilterModal
        visible={ageFilterVisible}
        onClose={() => setAgeFilterVisible(false)}
        title="Фильтр по возрасту"
        subtitle={hasAgeFilled ? `Ваш возраст: ${ownAge} лет` : null}
        options={ageFilterOptions}
        selected={ageFilter}
        onSelect={setAgeFilter}
      />

<SimpleFilterModal
        visible={weightFilterVisible}
        onClose={() => setWeightFilterVisible(false)}
        title="Фильтр по весу"
        subtitle={hasWeightFilled ? `Ваш вес: ${ownDemographics.weight} кг` : null}
        options={weightFilterOptions}
        selected={weightFilter}
        onSelect={setWeightFilter}
      />

      <SimpleFilterModal
        visible={locationFilterVisible}
        onClose={() => setLocationFilterVisible(false)}
        title="Фильтр по городу/стране"
        subtitle={hasLocationFilled ? `Ваш город: ${ownDemographics.city}` : null}
        options={locationFilterOptions}
        selected={locationFilter}
        onSelect={setLocationFilter}
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
titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {...typography.screenTitle, color: colors.textPrimary},
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

  // Раньше уменьшал только скругление углов (borderRadius) — само ПОЛЕ
  // (фон, где День/Неделя/Месяц) по высоте оставалось больше, чем ряд
  // фильтров под ним, потому что paddingVertical у segment ниже был
  // ближе к размеру кнопок-фильтров, а не заметно меньше. Теперь сама
  // рамка компактнее (padding сведён почти к нулю, marginBottom меньше),
  // и сегменты внутри ниже — весь блок целиком заметно меньше, а не
  // только его углы.
  segmentedTrack: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 1,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {backgroundColor: colors.primary},
  // Тот же цвет и стиль текста, что и у exerciseFilterButtonText — но
  // тот же РАЗМЕР тоже (fontSize: 12), не только цвет. В прошлый раз,
  // когда унифицировали цвет, размер шрифта случайно вырос с 11 до 13
  // — крупнее, чем у кнопок-фильтров под ним (12), и весь переключатель
  // снова стал выглядеть большим, хотя отступы у него уже были
  // уменьшены. Активный сегмент (segmentTextActive) по-прежнему
  // подсвечивается отдельно — это не расхождение стиля, а обозначение
  // текущего выбора.
  segmentText: {...typography.body, fontSize: 12, color: colors.textPrimary},
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

  // paddingVertical/paddingHorizontal/fontSize уменьшены (было 10/16/15)
  // — вместе с demographicsFilterButton ниже это и есть те самые
  // "овальные" кнопки-фильтры, которые нужно было сделать компактнее.
  // exerciseFilterButtonText/exerciseFilterArrow — общий текстовый
  // стиль для ВСЕХ трёх фильтров ряда ниже (возраст/вес/упражнение), не
  // только для упражнения (имя не меняли, чтобы не гонять его по всему
  // файлу). Собственного отдельного "квадратного" стиля кнопки-
  // упражнения больше нет — все три используют demographicsFilterButton.
  exerciseFilterButtonText: {...typography.body, fontSize: 12, color: colors.textPrimary},
  exerciseFilterArrow: {fontSize: 11, color: colors.textMuted},

  // compact — сжимает нижний отступ у PeriodSelector только там, где
  // явно передан проп compact (сейчас — только в блоке "Рейтинг всех
  // пользователей", где под ним теперь ещё один ряд фильтров). Другие
  // места PeriodSelector это не затрагивает.
  segmentedTrackCompact: {marginBottom: 8},

  // Три фильтра (возраст/вес/упражнение) в один ряд поровну по ширине —
  // раньше упражнение было отдельной полноширинной кнопкой под этим
  // рядом, теперь все три одного размера, экономит место по высоте.
  demographicsFilterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  // paddingVertical подобран так, чтобы высота кнопки совпадала с
  // высотой сегмента переключателя периода: у того сверху ещё и
  // padding:1 самой "дорожки" (segmentedTrack) + paddingVertical:3 у
  // сегмента = 8 суммарно по вертикали; у этой кнопки нет отдельной
  // обёртки-дорожки, поэтому весь запас (8 = 4+4) даёт сама кнопка.
  // Ширина у всех разная (текст разной длины) — это нормально, просил
  // одинаковую только высоту.
  demographicsFilterButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  demographicsFilterButtonSpacing: {marginRight: 6},
  // Пока в профиле не заполнены возраст/вес — кнопка визуально
  // притушена и по тапу не открывает список (см. Alert в onPress выше),
  // а объясняет, почему именно недоступна.
  demographicsFilterButtonDisabled: {opacity: 0.45},
  demographicsFilterButtonTextDisabled: {color: colors.textMuted},

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
  demographicsFilterSubtitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 14,
    paddingTop: 12,
  },

  // style — только размер контейнера. paddingBottom здесь НЕ создаёт
  // отступ у прокручиваемого контента — именно поэтому нужен отдельный
  // contentContainerStyle: он и даёт настоящий отступ в конце списка
  // при скролле (частая путаница с FlatList).
  dropdownList: {flexGrow: 0},
  dropdownListContent: {paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24},

  modalPeriodWrapper: {paddingHorizontal: 14, paddingTop: 12},

  modalCloseIcon: {fontSize: 18, color: colors.textPrimary},

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

  // Общий фон на всю папку целиком (заголовок + раскрытые упражнения)
  // — растягивается вниз по числу показанных строк, поэтому раскрытие
  // визуально сразу заметно, как один блок.
  folderCard: {
    backgroundColor: colors.recessed,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  filterFolderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  filterFolderText: {...typography.bodyBold, color: colors.textPrimary},
  // Строка упражнения внутри развёрнутой папки — без своего фона (он
  // общий, от folderCard), только тонкая линия сверху, чтобы отделить
  // от заголовка папки и от соседних строк.
  filterFolderChildRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});