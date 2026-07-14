import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import useExercises from '../hooks/useExercises';
import useSelectedExercises from '../hooks/useSelectedExercises';
import {DAY_STATUS, STATUS_LABELS} from '../constants/dayStatus';
import {
  getDay,
  getDayEntries,
  setExerciseEntry,
  deleteExerciseEntry,
  setStatusForDate,
  clearDay,
} from '../services/workoutDays';
import {
  addSelectedExercise,
  removeSelectedExercise,
} from '../services/selectedExercises';
import {
  computeDayRating,
  computeDayRepsByExercise,
  saveDayRating,
  deleteDayRating,
  upsertProfileNickname,
} from '../services/ratings';
import {saveWithOfflineFallback} from '../services/offlineSync';
import {formatDateDisplay} from '../utils/date';
import colors from '../theme/colors';
import typography from '../theme/typography';

const MAX_REPS = 5000;

// Модалка выбора упражнения из общего каталога — открывается по
// кнопке "+". Показывает только то, чего ещё нет на экране (ни в
// личном списке, ни среди уже введённых сегодня повторений). Фон под
// карточкой — просто плотное затемнение (без блюра — на Android
// настоящее размытие внутри Modal нестабильно, см. пояснение в чате).
function ExercisePickerModal({visible, onClose, exercises, selectedNames, onPick}) {
  const available = exercises.filter(item => !selectedNames.includes(item.name));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Добавить упражнение</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={available}
            keyExtractor={item => item.id}
            style={styles.pickerList}
            showsVerticalScrollIndicator={false}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => onPick(item.name)}
                testID={`day-editor-picker-option-${item.name}`}>
                <Text style={styles.pickerRowText}>{item.name}</Text>
                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.pickerEmptyText}>
                Все упражнения из общего списка уже добавлены
              </Text>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function DayEditor({userId, dateKey, onSaved, variant = 'log'}) {
  const {exercises, exerciseCoefficients, loadingExercises} = useExercises();
  const {selectedExercises, selectedExerciseNames, loadingSelected} =
    useSelectedExercises(userId);

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [repsInput, setRepsInput] = useState('');
  const [exerciseReps, setExerciseReps] = useState({});
  const [dayStatus, setDayStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Список упражнений, реально сохранённых в базе на момент последней
  // загрузки дня. Нужен для кнопок статуса дня и полного удаления
  // записи — им нужно знать, что удалять, без повторного чтения с
  // сервера. При добавлении/удалении одного упражнения этот список
  // обновляется сразу же, как только запись подтверждена сервером
  // (или локальным офлайн-кэшем).
  const originalNamesRef = useRef([]);

  // isDirty теперь означает "прямо сейчас идёт запись на сервер" —
  // используется, чтобы useFocusEffect ниже не перезатирал данные,
  // пока сохранение одного упражнения ещё не завершилось.
  const isDirtyRef = useRef(false);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (userId) {
      upsertProfileNickname(userId).catch(error =>
        console.error('Ошибка сохранения профиля:', error),
      );
    }
  }, [userId]);

 const loadData = useCallback(async () => {
    const entries = await getDayEntries(userId, dateKey);
    const day = await getDay(userId, dateKey);

    // Если день помечен как "есть тренировка", а список упражнений
    // пришёл пустым — это, скорее всего, не реальное удаление, а
    // особенность офлайн-кэша Firestore при первом обращении к этой
    // коллекции за это открытие приложения. В этом случае не затираем
    // то, что уже показано на экране, вместо того чтобы поверить
    // подозрительно пустому ответу.
    const looksIncomplete = entries.length === 0 && day && day.hasExercises;

    if (!looksIncomplete) {
      const repsMap = {};
      entries.forEach(item => {
        repsMap[item.exercise] = item.reps;
      });
      setExerciseReps(repsMap);
      originalNamesRef.current = entries.map(item => item.exercise);
    }

    setDayStatus(day ? day.status || null : null);
    setLoaded(true);
  }, [userId, dateKey]);

  useEffect(() => {
    setSelectedExercise(null);
    setRepsInput('');
    setLoaded(false);
    setIsDirty(false);
    setIsEditingExercises(false);
    setPickerVisible(false);

    if (userId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, userId]);

  useFocusEffect(
    useCallback(() => {
      if (userId && loaded && !isDirtyRef.current) {
        loadData();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, loaded, dateKey]),
  );

  const handleSelectExercise = exercise => {
    if (selectedExercise === exercise) {
      setSelectedExercise(null);
      setRepsInput('');
    } else {
      setSelectedExercise(exercise);
      setRepsInput('');
    }
  };

  const handleChangeRepsInput = text => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly === '') {
      setRepsInput('');
      return;
    }
    const numericValue = parseInt(digitsOnly, 10);
    setRepsInput(numericValue > MAX_REPS ? String(MAX_REPS) : digitsOnly);
  };

  // Подтверждение галочкой — сохраняет ИМЕННО это упражнение сразу,
  // без отдельной кнопки "Сохранить тренировку". Экран обновляется
  // мгновенно (оптимистично), запись на сервер идёт в фоне.
  const handleAddExercise = async () => {
    if (repsInput === '') {
      setSelectedExercise(null);
      return;
    }

    const reps = parseInt(repsInput, 10);
    if (!reps || reps <= 0) {
      Alert.alert('Введите количество повторений');
      return;
    }

    const exercise = selectedExercise;
    const newTotal = Math.min((exerciseReps[exercise] || 0) + reps, MAX_REPS);
    const updatedReps = Object.assign({}, exerciseReps, {[exercise]: newTotal});

    setDayStatus(null);
    setExerciseReps(updatedReps);
    setSelectedExercise(null);
    setRepsInput('');

    setIsDirty(true);
    try {
      const result = await saveWithOfflineFallback(
        setExerciseEntry(userId, dateKey, exercise, newTotal),
      );
      if (result.error) {
        throw result.error;
      }
      if (!originalNamesRef.current.includes(exercise)) {
        originalNamesRef.current = [...originalNamesRef.current, exercise];
      }

      const exercisesList = Object.keys(updatedReps).map(name => ({
        exercise: name,
        reps: updatedReps[name],
      }));
      const rating = computeDayRating(exercisesList, exerciseCoefficients);
      const byExercise = computeDayRepsByExercise(exercisesList);
      saveDayRating(userId, dateKey, rating, byExercise).catch(error =>
        console.error('Рейтинг дня синхронизируется позже:', error),
      );

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      Alert.alert('Ошибка сохранения', String(error));
    } finally {
      setIsDirty(false);
    }
  };

  // Крестик у уже добавленного упражнения — сразу удаляет именно эту
  // запись с сервера (только повторения за этот день), без отдельного
  // шага сохранения всей тренировки. Из личного списка упражнение НЕ
  // убирает — для этого есть отдельная кнопка-корзина.
  const handleRemoveExercise = async exercise => {
    const updatedReps = Object.assign({}, exerciseReps);
    delete updatedReps[exercise];
    setExerciseReps(updatedReps);

    const remainingNames = Object.keys(updatedReps);

    setIsDirty(true);
    try {
      const result = await saveWithOfflineFallback(
        deleteExerciseEntry(userId, dateKey, exercise, remainingNames.length > 0),
      );
      if (result.error) {
        throw result.error;
      }
      originalNamesRef.current = originalNamesRef.current.filter(
        name => name !== exercise,
      );

      if (remainingNames.length === 0) {
        deleteDayRating(userId, dateKey).catch(error =>
          console.error('Удаление рейтинга дня отложено до сети:', error),
        );
      } else {
        const exercisesList = remainingNames.map(name => ({
          exercise: name,
          reps: updatedReps[name],
        }));
        const rating = computeDayRating(exercisesList, exerciseCoefficients);
        const byExercise = computeDayRepsByExercise(exercisesList);
        saveDayRating(userId, dateKey, rating, byExercise).catch(error =>
          console.error('Рейтинг дня синхронизируется позже:', error),
        );
      }

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      Alert.alert('Ошибка удаления', String(error));
    } finally {
      setIsDirty(false);
    }
  };

  // Добавление упражнения в ЛИЧНЫЙ список через "+". Отдельная
  // подписка (useSelectedExercises) сама обновит экран, как только
  // запись применится локально — оптимистично обновлять состояние
  // вручную здесь не нужно.
  const handlePickExercise = async exerciseName => {
    setPickerVisible(false);
    const result = await saveWithOfflineFallback(
      addSelectedExercise(userId, exerciseName, selectedExercises),
    );
    if (result.error) {
      Alert.alert('Ошибка добавления', String(result.error));
    }
  };

  // Корзина у карточки — убирает упражнение из личного списка сразу,
  // без окна подтверждения (перестаёт предлагаться для новых
  // тренировок), но НЕ трогает уже сохранённые записи за прошлые
  // дни — они остаются в истории.
  const handleRemoveFromPersonalList = async exercise => {
    const result = await saveWithOfflineFallback(
      removeSelectedExercise(userId, exercise),
    );
    if (result.error) {
      Alert.alert('Ошибка удаления', String(result.error));
    }
  };

  const hasReps = Object.keys(exerciseReps).length > 0;

  const applyStatus = async status => {
    const newStatus = dayStatus === status ? null : status;
    setDayStatus(newStatus);
    setExerciseReps({});
    setIsEditingExercises(false);

    try {
      const writePromise =
        newStatus === null
          ? clearDay(userId, dateKey, originalNamesRef.current)
          : setStatusForDate(userId, dateKey, newStatus, originalNamesRef.current);

      const result = await saveWithOfflineFallback(writePromise);
      if (result.error) {
        throw result.error;
      }
      originalNamesRef.current = [];

      deleteDayRating(userId, dateKey).catch(error =>
        console.error('Удаление рейтинга дня отложено до сети:', error),
      );

      setIsDirty(false);
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      Alert.alert('Ошибка', String(error));
    }
  };

  const handleSetStatus = status => {
    if (hasReps) {
      const message =
        'Введённые повторения будут удалены, а день отмечен как "' +
        STATUS_LABELS[status] +
        '". Продолжить?';

      Alert.alert('Внимание', message, [
        {text: 'Отмена', style: 'cancel'},
        {text: 'Продолжить', onPress: () => applyStatus(status)},
      ]);
      return;
    }

    applyStatus(status);
  };

  const handleDeleteDay = () => {
    Alert.alert('Удалить запись', 'Удалить все данные за этот день?', [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await saveWithOfflineFallback(
              clearDay(userId, dateKey, originalNamesRef.current),
            );
            if (result.error) {
              throw result.error;
            }
            originalNamesRef.current = [];

            deleteDayRating(userId, dateKey).catch(error =>
              console.error('Удаление рейтинга дня отложено до сети:', error),
            );

            setExerciseReps({});
            setDayStatus(null);
            setIsDirty(false);
            setIsEditingExercises(false);
            if (onSaved) {
              onSaved();
            }
          } catch (error) {
            Alert.alert('Ошибка', String(error));
          }
        },
      },
    ]);
  };

  if (!loaded || loadingExercises || loadingSelected) {
    return null;
  }

  const hasAnyData = hasReps || dayStatus !== null;

  // То, что реально показываем в списке — это личный список
  // пользователя ПЛЮС любые упражнения, у которых уже есть повторения
  // за этот день, даже если их убрали из личного списка (чтобы
  // убранное упражнение не "пряталось" вместе со своими данными —
  // старые записи всегда должны оставаться видимыми).
  const loggedExerciseNames = Object.keys(exerciseReps);
  const displayedExerciseNames = [
    ...selectedExerciseNames,
    ...loggedExerciseNames.filter(name => !selectedExerciseNames.includes(name)),
  ];
  const hasDisplayedExercises = displayedExerciseNames.length > 0;

  const statusBlock = (
    <View>
      <Text style={styles.statusTitle}>Отметить день</Text>
      <View style={styles.statusRow}>
        {Object.values(DAY_STATUS).map(status => {
          const isActive = dayStatus === status;
          return (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusButton,
                isActive ? styles.statusButtonActive : null,
              ]}
              onPress={() => handleSetStatus(status)}
              testID={`day-status-button-${status}`}>
              <Text
                style={[
                  styles.statusButtonText,
                  isActive ? styles.statusButtonTextActive : null,
                ]}>
                {STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Кнопка "+" — пока в личном списке есть хотя бы одно упражнение,
  // висит компактной иконкой в правом верхнем углу списка и никуда не
  // пропадает, сколько бы упражнений ни было добавлено.
  const addExerciseHeaderRow = hasDisplayedExercises ? (
    <View style={styles.addExerciseHeaderRow}>
      <TouchableOpacity
        style={styles.addExerciseIconButton}
        onPress={() => setPickerVisible(true)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
        testID="day-editor-add-exercise-button">
        <Ionicons name="add" size={22} color={colors.white} />
      </TouchableOpacity>
    </View>
  ) : null;

  // Пока список пуст — вместо иконки в углу показываем крупную кнопку
  // по центру. После первого добавления она "переезжает" в компактную
  // иконку сверху справа (addExerciseHeaderRow выше).
  const emptyExercisesBlock = !hasDisplayedExercises ? (
    <View style={styles.emptyExercisesBlock}>
      <Ionicons name="barbell-outline" size={36} color={colors.textMuted} />
      <Text style={styles.emptyExercisesText}>
        Список упражнений пуст — добавьте те, которые хотите отслеживать
      </Text>
      <TouchableOpacity
        style={styles.emptyAddButton}
        onPress={() => setPickerVisible(true)}
        testID="day-editor-add-exercise-empty-button">
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={styles.emptyAddButtonText}>Добавить упражнение</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const exerciseSelectionBlock = (
    <View style={styles.exerciseList}>
      {addExerciseHeaderRow}
      {emptyExercisesBlock}

      {displayedExerciseNames.map(exercise => {
        const isSelected = selectedExercise === exercise;
        const totalReps = exerciseReps[exercise];
        const isInPersonalList = selectedExerciseNames.includes(exercise);

        return (
          <TouchableOpacity
            key={exercise}
            style={[
              styles.exerciseButton,
              isSelected ? styles.exerciseButtonSelected : null,
            ]}
            onPress={() => handleSelectExercise(exercise)}
            activeOpacity={0.8}>
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.exerciseIconAndName}>
                <Text
                  style={[
                    styles.exerciseButtonText,
                    isSelected ? styles.exerciseButtonTextSelected : null,
                  ]}
                  numberOfLines={1}>
                  {exercise}
                </Text>
              </View>

              <View style={styles.exerciseHeaderRight}>
                {totalReps > 0 ? (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalText}>{totalReps}</Text>
                    {isSelected ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveExercise(exercise)}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                        <Text style={styles.removeCross}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                {isInPersonalList ? (
                  <TouchableOpacity
                    style={styles.removeFromListButton}
                    onPress={() => handleRemoveFromPersonalList(exercise)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    testID={`day-editor-remove-from-list-${exercise}`}>
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {isSelected ? (
              <View style={styles.inlineEditRow}>
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Полное количество повторений"
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="numeric"
                  value={repsInput}
                  onChangeText={handleChangeRepsInput}
                  maxLength={4}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleAddExercise}>
                  <Ionicons name="checkmark" size={26} color={colors.white} />
                </TouchableOpacity>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const deleteBlock = hasAnyData ? (
    <View style={styles.deleteSection}>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteDay}>
        <Text style={styles.deleteButtonText}>Удалить запись за день</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const showExerciseEditor = isEditingExercises || !hasReps;

  const content =
    variant === 'log' ? (
      <View>
        <Text style={styles.title}>{formatDateDisplay(dateKey)}</Text>

        {exerciseSelectionBlock}

        <View style={styles.divider} />

        {statusBlock}

        {deleteBlock}
      </View>
    ) : (
      <View>
        <Text style={styles.title}>{formatDateDisplay(dateKey)}</Text>

        {statusBlock}

        <View style={styles.divider} />

        {showExerciseEditor ? (
          <View>
            {exerciseSelectionBlock}
            {hasReps ? (
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={() => setIsEditingExercises(false)}>
                <Text style={styles.cancelEditButtonText}>Готово</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View>
            {Object.keys(exerciseReps).map(exercise => (
              <Text key={exercise} style={styles.readOnlyExerciseText}>
                {exercise} — {exerciseReps[exercise]}
              </Text>
            ))}

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditingExercises(true)}>
              <Text style={styles.editButtonText}>Редактировать</Text>
            </TouchableOpacity>
          </View>
        )}

        {deleteBlock}
      </View>
    );

  return (
    <View>
      {content}

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        exercises={exercises}
        selectedNames={displayedExerciseNames}
        onPick={handlePickExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {...typography.screenTitle, marginBottom: 16, color: colors.textPrimary},

  statusTitle: {...typography.label, color: colors.textMuted, marginBottom: 10},
  statusRow: {flexDirection: 'row', flexWrap: 'wrap'},
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.chip,
    marginRight: 8,
    marginBottom: 8,
  },
  statusButtonActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  statusButtonText: {...typography.buttonSmall, color: colors.textPrimary},
  statusButtonTextActive: {color: colors.white},

  divider: {height: 1, backgroundColor: colors.divider, marginVertical: 16},

  exerciseList: {flexDirection: 'column'},

  addExerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  addExerciseIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },

  emptyExercisesBlock: {alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16},
  emptyExercisesText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  emptyAddButtonText: {...typography.button, color: colors.white, marginLeft: 8},

  exerciseButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseButtonSelected: {borderWidth: 1.5, borderColor: colors.primary},
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseIconAndName: {flexDirection: 'row', alignItems: 'center', flexShrink: 1},
  exerciseButtonText: {...typography.bodyBold, color: colors.textPrimary, flexShrink: 1},
  exerciseButtonTextSelected: {color: colors.primary},
  exerciseHeaderRight: {flexDirection: 'row', alignItems: 'center'},
  totalRow: {flexDirection: 'row', alignItems: 'center'},
  totalText: {...typography.number, fontSize: 15, color: colors.textSecondary, marginRight: 10},
  removeCross: {fontSize: 18, color: colors.danger, fontWeight: 'bold'},
  removeFromListButton: {marginLeft: 12},

  inlineEditRow: {flexDirection: 'row', alignItems: 'center', marginTop: 10},
  inlineInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  confirmButton: {
    backgroundColor: colors.success,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelEditButton: {paddingVertical: 12, alignItems: 'center'},
  cancelEditButtonText: {...typography.caption, color: colors.textMuted},

  readOnlyExerciseText: {...typography.body, fontSize: 15, color: colors.textPrimary, marginBottom: 4},
  editButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {...typography.button, color: colors.white},

  deleteSection: {marginTop: 40},
  deleteButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {...typography.button, fontSize: 15, color: colors.danger},

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerTitle: {...typography.sectionTitle, fontSize: 16, color: colors.textPrimary},
  pickerList: {flexGrow: 0},
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  pickerRowText: {...typography.body, color: colors.textPrimary},
  pickerEmptyText: {
    ...typography.caption,
    color: colors.textPlaceholder,
    textAlign: 'center',
    padding: 20,
  },
});
