import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import useExercises from '../hooks/useExercises';
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

export default function DayEditor({userId, dateKey, onSaved, variant = 'log'}) {
  const {exerciseNames, exerciseCoefficients, loadingExercises} =
    useExercises();

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [repsInput, setRepsInput] = useState('');
  const [exerciseReps, setExerciseReps] = useState({});
  const [dayStatus, setDayStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditingExercises, setIsEditingExercises] = useState(false);

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
  // запись с сервера, без отдельного шага сохранения всей тренировки.
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

  if (!loaded || loadingExercises) {
    return null;
  }

  const hasAnyData = hasReps || dayStatus !== null;

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

  const exerciseSelectionBlock = (
    <View style={styles.exerciseList}>
      {exerciseNames.map(exercise => {
        const isSelected = selectedExercise === exercise;
        const totalReps = exerciseReps[exercise];

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
                <View style={styles.exerciseIconChip}>
                  <Ionicons name="barbell-outline" size={18} color={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.exerciseButtonText,
                    isSelected ? styles.exerciseButtonTextSelected : null,
                  ]}
                  numberOfLines={1}>
                  {exercise}
                </Text>
              </View>

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

  if (variant === 'log') {
    return (
      <View>
        <Text style={styles.title}>{formatDateDisplay(dateKey)}</Text>

        {exerciseSelectionBlock}

        <View style={styles.divider} />

        {statusBlock}

        {deleteBlock}
      </View>
    );
  }

  const showExerciseEditor = isEditingExercises || !hasReps;

  return (
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
  exerciseIconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exerciseButtonText: {...typography.bodyBold, color: colors.textPrimary, flexShrink: 1},
  exerciseButtonTextSelected: {color: colors.primary},
  totalRow: {flexDirection: 'row', alignItems: 'center'},
  totalText: {...typography.number, fontSize: 15, color: colors.textSecondary, marginRight: 10},
  removeCross: {fontSize: 18, color: colors.danger, fontWeight: 'bold'},

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
});