import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import useExercises from '../hooks/useExercises';
import {DAY_STATUS, STATUS_LABELS} from '../constants/dayStatus';
import {
  getDay,
  getDayEntries,
  saveExercisesForDate,
  setStatusForDate,
  clearDay,
} from '../services/workoutDays';
import {
  computeDayRating,
  saveDayRating,
  deleteDayRating,
  upsertProfileNickname,
} from '../services/ratings';
import {saveWithOfflineFallback} from '../services/offlineSync';
import {formatDateDisplay} from '../utils/date';

const MAX_REPS = 5000;

export default function DayEditor({userId, dateKey, onSaved}) {
  const {exerciseNames, exerciseCoefficients, loadingExercises} =
    useExercises();

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [repsInput, setRepsInput] = useState('');
  const [exerciseReps, setExerciseReps] = useState({});
  const [dayStatus, setDayStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Отвечает за то, показывать ли уже сохранённые упражнения как
  // просто список (по умолчанию) или как форму редактирования —
  // управляется кнопкой "Редактировать" ниже, ВНУТРИ этого же
  // компонента, а не снаружи.
  const [isEditingExercises, setIsEditingExercises] = useState(false);

  // Список упражнений, которые реально сохранены в базе на момент
  // последней загрузки/сохранения дня. Нужен, чтобы при следующем
  // сохранении понять, какие записи удалить, БЕЗ повторного чтения
  // с сервера (см. комментарий в services/workoutDays.js) — это и
  // есть ключевое исправление зависания сохранения офлайн.
  const originalNamesRef = useRef([]);

  useEffect(() => {
    if (userId) {
      upsertProfileNickname(userId).catch(error =>
        console.error('Ошибка сохранения профиля:', error),
      );
    }
  }, [userId]);

  useEffect(() => {
    setSelectedExercise(null);
    setRepsInput('');
    setLoaded(false);
    setIsDirty(false);
    setIsEditingExercises(false);

    async function loadData() {
      const entries = await getDayEntries(userId, dateKey);
      const repsMap = {};
      entries.forEach(item => {
        repsMap[item.exercise] = item.reps;
      });
      setExerciseReps(repsMap);
      originalNamesRef.current = entries.map(item => item.exercise);

      const day = await getDay(userId, dateKey);
      setDayStatus(day ? day.status || null : null);
      setLoaded(true);
    }

    if (userId) {
      loadData();
    }
  }, [dateKey, userId]);

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

  const handleAddExercise = () => {
    if (repsInput === '') {
      setSelectedExercise(null);
      return;
    }

    const reps = parseInt(repsInput, 10);
    if (!reps || reps <= 0) {
      Alert.alert('Введите количество повторений');
      return;
    }

    setIsDirty(true);

    setExerciseReps(prev => {
      const newTotal = (prev[selectedExercise] || 0) + reps;
      const updated = Object.assign({}, prev);
      updated[selectedExercise] = Math.min(newTotal, MAX_REPS);
      return updated;
    });

    setSelectedExercise(null);
    setRepsInput('');
  };

  const handleRemoveExercise = exercise => {
    setIsDirty(true);
    setExerciseReps(prev => {
      const updated = Object.assign({}, prev);
      delete updated[exercise];
      return updated;
    });
  };

  const hasReps = Object.keys(exerciseReps).length > 0;

  // --- Статус дня: доступен всегда, независимо от isEditingExercises ---

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

      // Не ждём подтверждение сервера бесконечно — офлайн запись
      // всё равно уже применена локально (подробности в
      // services/offlineSync.js).
      const result = await saveWithOfflineFallback(writePromise);
      if (result.error) {
        throw result.error;
      }
      originalNamesRef.current = [];

      // Рейтинг влияет только на общую таблицу лидеров (ей и так
      // нужен интернет) — удаляем его в фоне, не блокируя экран.
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
        'Упражнения за этот день будут удалены, а день отмечен как "' +
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

  // --- Упражнения ---

  const handleSaveWorkout = async () => {
    const exercisesList = Object.keys(exerciseReps).map(exercise => ({
      exercise: exercise,
      reps: exerciseReps[exercise],
    }));

    if (exercisesList.length === 0) {
      Alert.alert('Добавьте хотя бы одно упражнение');
      return;
    }

    setSaving(true);
    try {
      // Личная статистика (эта запись) должна сохраняться и офлайн —
      // saveWithOfflineFallback не даёт кнопке зависнуть, если сети
      // нет: подробности в services/offlineSync.js.
      const result = await saveWithOfflineFallback(
        saveExercisesForDate(
          userId,
          dateKey,
          exercisesList,
          originalNamesRef.current,
        ),
      );
      if (result.error) {
        throw result.error;
      }
      originalNamesRef.current = exercisesList.map(item => item.exercise);

      // Рейтинг для общей таблицы лидеров сохраняем в фоне, не
      // дожидаясь ответа — эта часть и так требует интернет, но не
      // должна задерживать сохранение личной тренировки.
      const rating = computeDayRating(exercisesList, exerciseCoefficients);
      saveDayRating(userId, dateKey, rating).catch(error =>
        console.error('Рейтинг дня синхронизируется позже:', error),
      );

      setIsDirty(false);
      setIsEditingExercises(false);
      Alert.alert(
        'Готово',
        result.pending
          ? 'Тренировка сохранена на устройстве. Отправится на сервер автоматически, когда появится интернет.'
          : 'Тренировка сохранена',
      );
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      Alert.alert('Ошибка сохранения', String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExercises = () => {
    Alert.alert('Удалить упражнения', 'Удалить все упражнения за этот день?', [
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

  // Показываем форму редактирования, если пользователь явно нажал
  // "Редактировать", либо если упражнений ещё нет вообще (нечего
  // показывать как список).
  const showExerciseEditor = isEditingExercises || !hasReps;

  return (
    <View>
      <Text style={styles.title}>{formatDateDisplay(dateKey)}</Text>

      {/* Статус — приоритетный блок, доступен сразу, без входа
          в режим редактирования упражнений */}
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

      <View style={styles.divider} />

      {showExerciseEditor ? (
        <View>
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
                    <Text
                      style={[
                        styles.exerciseButtonText,
                        isSelected ? styles.exerciseButtonTextSelected : null,
                      ]}>
                      {exercise}
                    </Text>

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
                        placeholder="Кол-во повторений"
                        keyboardType="numeric"
                        value={repsInput}
                        onChangeText={handleChangeRepsInput}
                        maxLength={4}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleAddExercise}>
                        <Text style={styles.confirmButtonText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.saveButton,
              !isDirty ? styles.saveButtonDisabled : null,
            ]}
            onPress={handleSaveWorkout}
            disabled={saving || !isDirty}>
            <Text style={styles.saveButtonText}>
              {saving ? 'Сохранение...' : 'Сохранить тренировку'}
            </Text>
          </TouchableOpacity>

          {hasReps ? (
            <TouchableOpacity
              style={styles.cancelEditButton}
              onPress={() => setIsEditingExercises(false)}>
              <Text style={styles.cancelEditButtonText}>Отмена</Text>
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

          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteExercises}>
              <Text style={styles.deleteButtonText}>Удалить упражнения за день</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 16},

  statusTitle: {fontSize: 15, color: '#777', marginBottom: 8},
  statusRow: {flexDirection: 'row', flexWrap: 'wrap'},
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  statusButtonActive: {backgroundColor: '#2196F3', borderColor: '#2196F3'},
  statusButtonText: {color: '#333', fontSize: 14},
  statusButtonTextActive: {color: '#fff'},

  divider: {height: 1, backgroundColor: '#eee', marginVertical: 16},

  exerciseList: {flexDirection: 'column'},
  exerciseButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
  },
  exerciseButtonSelected: {borderColor: '#2196F3'},
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseButtonText: {color: '#333', fontSize: 16},
  exerciseButtonTextSelected: {color: '#2196F3'},
  totalRow: {flexDirection: 'row', alignItems: 'center'},
  totalText: {fontSize: 15, color: '#555', marginRight: 10},
  removeCross: {fontSize: 18, color: '#e53935', fontWeight: 'bold'},

  inlineEditRow: {flexDirection: 'row', alignItems: 'center', marginTop: 10},
  inlineInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    color: '#000',
    backgroundColor: '#fff',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 18},

  saveButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {backgroundColor: '#B0BEC5'},
  saveButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 16},

  cancelEditButton: {paddingVertical: 12, alignItems: 'center'},
  cancelEditButtonText: {color: '#777', fontSize: 14},

  readOnlyExerciseText: {fontSize: 15, color: '#333', marginBottom: 4},
  editButton: {
    marginTop: 16,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {color: '#fff', fontWeight: 'bold'},

  deleteSection: {marginTop: 24},
  deleteButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e53935',
  },
  deleteButtonText: {color: '#e53935', fontWeight: 'bold'},
});
