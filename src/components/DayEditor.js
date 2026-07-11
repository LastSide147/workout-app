import React, {useEffect, useState} from 'react';
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
import {formatDateDisplay} from '../utils/date';

const MAX_REPS = 5000;

export default function DayEditor({userId, dateKey, initialStatus, onSaved}) {
  const {exerciseNames, exerciseCoefficients, loadingExercises} =
    useExercises();

  const [selectedExercise, setSelectedExercise] = useState(null);
  const [repsInput, setRepsInput] = useState('');
  const [exerciseReps, setExerciseReps] = useState({});
  const [dayStatus, setDayStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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

    async function loadData() {
      const entries = await getDayEntries(userId, dateKey);
      const repsMap = {};
      entries.forEach(item => {
        repsMap[item.exercise] = item.reps;
      });
      setExerciseReps(repsMap);

      if (initialStatus !== undefined) {
        setDayStatus(initialStatus || null);
      } else {
        const day = await getDay(userId, dateKey);
        setDayStatus(day ? day.status || null : null);
      }
      setLoaded(true);
    }

    if (userId) {
      loadData();
    }
  }, [dateKey, userId, initialStatus]);

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

    setDayStatus(null);
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

  const applyStatus = async status => {
    const newStatus = dayStatus === status ? null : status;
    setDayStatus(newStatus);
    setExerciseReps({});

    try {
      if (newStatus === null) {
        await clearDay(userId, dateKey);
      } else {
        await setStatusForDate(userId, dateKey, newStatus);
      }
      await deleteDayRating(userId, dateKey);
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
      await saveExercisesForDate(userId, dateKey, exercisesList);

      const rating = computeDayRating(exercisesList, exerciseCoefficients);
      await saveDayRating(userId, dateKey, rating);

      setIsDirty(false);
      Alert.alert('Готово', 'Тренировка сохранена');
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      Alert.alert('Ошибка сохранения', String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDay = () => {
    Alert.alert('Удалить запись', 'Удалить все данные за этот день?', [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearDay(userId, dateKey);
            await deleteDayRating(userId, dateKey);
            setExerciseReps({});
            setDayStatus(null);
            setIsDirty(false);
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

  return (
    <View>
      <Text style={styles.title}>{formatDateDisplay(dateKey)}</Text>

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
              onPress={() => handleSetStatus(status)}>
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

      {hasAnyData ? (
        <View style={styles.deleteSection}>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteDay}>
            <Text style={styles.deleteButtonText}>Удалить запись за день</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 22, fontWeight: 'bold', marginBottom: 16},
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
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonDisabled: {backgroundColor: '#B0BEC5'},
  saveButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  statusTitle: {fontSize: 15, color: '#777', marginTop: 24, marginBottom: 8},
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
  deleteSection: {marginTop: 40},
  divider: {height: 1, backgroundColor: '#eee', marginBottom: 20},
  deleteButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e53935',
  },
  deleteButtonText: {color: '#e53935', fontWeight: 'bold'},
});