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
  BackHandler,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import UpdateAvailableIcon from './UpdateAvailableIcon';
import useExercises from '../hooks/useExercises';
import useSelectedExercises from '../hooks/useSelectedExercises';
import {DAY_STATUS, STATUS_LABELS} from '../constants/dayStatus';
import {
  getDay,
  subscribeToDayEntries,
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
  recalculateDayRating,
  deleteDayRating,
  upsertProfileNickname,
} from '../services/ratings';
import {saveWithOfflineFallback} from '../services/offlineSync';
import {formatDateDisplay, isWithinCurrentWeek} from '../utils/date';
import colors from '../theme/colors';
import typography from '../theme/typography';

const MAX_REPS = 5000;

// Модалка выбора упражнения из общего каталога — открывается по
// кнопке "+". Показывает только то, чего ещё нет на экране (ни в
// личном списке, ни среди уже введённых сегодня повторений). Фон под
// карточкой — просто плотное затемнение (без блюра — на Android
// настоящее размытие внутри Modal нестабильно, см. пояснение в чате).
//
// Папки показываются отдельным блоком НИЖЕ одиночных упражнений, точно
// так же, как и в экране управления мастера. Тап по папке разворачивает
// её содержимое прямо в этом же окне (не отдельный экран) — список
// упражнений внутри выглядит и ведёт себя абсолютно так же, как список
// одиночных упражнений выше.
function ExercisePickerModal({
  visible,
  onClose,
  exercises,
  folders,
  folderExercises,
  selectedNames,
  onPick,
}) {
  const [expandedFolderId, setExpandedFolderId] = useState(null);

  // Каждый раз при новом открытии модалки — сворачиваем ранее
  // раскрытую папку, чтобы не удивлять пользователя состоянием,
  // оставшимся с прошлого раза.
  useEffect(() => {
    if (visible) {
      setExpandedFolderId(null);
    }
  }, [visible]);

  const available = exercises.filter(item => !selectedNames.includes(item.name));

  const toggleFolder = folderId => {
    setExpandedFolderId(current => (current === folderId ? null : folderId));
  };

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
              folders.length === 0 ? (
                <Text style={styles.pickerEmptyText}>
                  Все упражнения из общего списка уже добавлены
                </Text>
              ) : null
            }
            ListFooterComponent={
              folders.length > 0 ? (
                <View style={styles.pickerFoldersSection}>
                  {folders.map(folder => {
                    const isExpanded = expandedFolderId === folder.id;
                    const folderItems = (folderExercises[folder.id] || []).filter(
                      item => !selectedNames.includes(item.displayName),
                    );

                    return (
                      <View key={folder.id}>
                        <TouchableOpacity
                          style={styles.pickerFolderRow}
                          onPress={() => toggleFolder(folder.id)}
                          testID={`day-editor-picker-folder-${folder.name}`}>
                          <View style={styles.pickerFolderNameRow}>
                            <Ionicons name="folder-outline" size={20} color={colors.textMuted} />
                            <Text style={styles.pickerFolderText}>{folder.name}</Text>
                          </View>
                          <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>

                        {isExpanded ? (
                          folderItems.length === 0 ? (
                            <Text style={styles.pickerEmptyText}>
                              Все упражнения из этой папки уже добавлены
                            </Text>
                          ) : (
                            folderItems.map(item => (
                              <TouchableOpacity
                                key={item.id}
                                style={[styles.pickerRow, styles.pickerRowInFolder]}
                                onPress={() => onPick(item.displayName)}
                                testID={`day-editor-picker-option-${item.displayName}`}>
                                <Text style={styles.pickerRowText}>{item.displayName}</Text>
                                <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                              </TouchableOpacity>
                            ))
                          )
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : null
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Модалка ввода повторений — по центру экрана, не зависит от
// клавиатуры (не перекрывается ею в любом случае). Закрытие по
// свайпу/кнопке "назад" — через BackHandler (низкоуровневое системное
// событие), а не через отслеживание скрытия клавиатуры: последнее
// оказалось ненадёжным и иногда закрывало модалку раньше, чем
// успевало сработать нажатие "Подтвердить".
function EditRepsModal({
  visible,
  exercise,
  repsInput,
  onChangeRepsInput,
  onConfirm,
  onClose,
  hasExistingReps,
  onDeleteInput,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onShow={() => setTimeout(() => inputRef.current && inputRef.current.focus(), 50)}>
      <View style={styles.editModalOverlay}>
        <TouchableOpacity style={styles.editModalTouchArea} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={styles.editModalCard}>
            <Text style={styles.editModalTitle} numberOfLines={1}>
              {exercise}
            </Text>

            <View style={styles.inlineEditRow}>
              <TextInput
                ref={inputRef}
                style={styles.inlineInput}
                placeholder="Полное количество повторений"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="numeric"
                value={repsInput}
                onChangeText={onChangeRepsInput}
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={onConfirm}
              />
            </View>

            {/* Нижняя строка модалки: слева ссылка "Удалить ввод" (если
                в это упражнение уже что-то введено), справа — кнопки
                "Отмена"/"Сохранить". Пустой View слева, когда ссылки
                нет, нужен, чтобы justifyContent: 'space-between' всё
                равно прижимал кнопки к правому краю. */}
           <View style={styles.editModalActionsRow}>
              {hasExistingReps ? (
                <TouchableOpacity
                  style={styles.clearRepsLink}
                  onPressIn={onDeleteInput}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  testID="day-editor-clear-reps-modal">
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={styles.clearRepsLinkText}>Удалить ввод</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              <View style={styles.editModalButtonsGroup}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPressIn={onClose}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                  testID="day-editor-cancel-modal">
                  <Text style={styles.cancelModalButtonText}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveModalButton}
                  onPressIn={onConfirm}
                  testID="day-editor-save-modal">
                  <Text style={styles.saveModalButtonText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function DayEditor({userId, dateKey, onSaved, variant = 'log'}) {
  const {exercises, exerciseCoefficients, folders, folderExercises, loadingExercises} =
    useExercises();
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

  const originalNamesRef = useRef([]);

  const ratingQueueRef = useRef(Promise.resolve());

  const queueRatingWrite = task => {
    ratingQueueRef.current = ratingQueueRef.current.catch(() => {}).then(task);
    return ratingQueueRef.current;
  };

  const isDirtyRef = useRef(false);  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (userId) {
      upsertProfileNickname(userId).catch(error =>
        console.error('Ошибка сохранения профиля:', error),
      );
    }
  }, [userId]);

 // Статус дня (Пропустил/Выходной/Травма) — разовое чтение ОДНОГО
  // документа. Для одиночного doc.get() офлайн-кэш надёжен и без
  // подписки, поэтому оставляем как было, только выносим отдельно от
  // записей упражнений.
  const loadDayStatus = useCallback(async () => {
    const day = await getDay(userId, dateKey);
    setDayStatus(day ? day.status || null : null);
  }, [userId, dateKey]);

  useEffect(() => {
    setSelectedExercise(null);
    setRepsInput('');
    setLoaded(false);
    setIsDirty(false);
    setIsEditingExercises(false);
    setPickerVisible(false);

    if (!userId) {
      return undefined;
    }

    loadDayStatus();

    // Записи дня — теперь ЖИВАЯ ПОДПИСКА, а не разовое чтение (см.
    // подробное пояснение в services/workoutDays.js у
    // subscribeToDayEntries). Пока пользователь сам редактирует день
    // (isDirty) — не перетираем его текущий ввод входящими данными
    // подписки, чтобы поле не "прыгало" прямо во время правки.
    const unsubscribe = subscribeToDayEntries(userId, dateKey, entries => {
      if (isDirtyRef.current) {
        return;
      }
      const repsMap = {};
      entries.forEach(item => {
        repsMap[item.exercise] = item.reps;
      });
      setExerciseReps(repsMap);
      originalNamesRef.current = entries.map(item => item.exercise);
      setLoaded(true);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey, userId]);

  useFocusEffect(
    useCallback(() => {
      // Записи теперь сами обновляются через подписку — на фокусе
      // достаточно перечитать только статус дня (он читается разово).
      if (userId && loaded && !isDirtyRef.current) {
        loadDayStatus();
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

      queueRatingWrite(() =>
        recalculateDayRating(userId, dateKey, exerciseCoefficients),
      ).catch(error => console.error('Рейтинг дня синхронизируется позже:', error));

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      Alert.alert('Ошибка сохранения', String(error));
    } finally {
      setIsDirty(false);
    }
  };

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
        queueRatingWrite(() => deleteDayRating(userId, dateKey)).catch(error =>
          console.error('Удаление рейтинга дня отложено до сети:', error),
        );

      } else {
        queueRatingWrite(() =>
          recalculateDayRating(userId, dateKey, exerciseCoefficients),
        ).catch(error => console.error('Рейтинг дня синхронизируется позже:', error));
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

  const handlePickExercise = async exerciseName => {
    setPickerVisible(false);
    const result = await saveWithOfflineFallback(
      addSelectedExercise(userId, exerciseName, selectedExercises),
    );
    if (result.error) {
      Alert.alert('Ошибка добавления', String(result.error));
    }
  };

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

  const loggedExerciseNames = Object.keys(exerciseReps);
  const displayedExerciseNames = [
    ...selectedExerciseNames,
    ...loggedExerciseNames.filter(name => !selectedExerciseNames.includes(name)),
  ];
  const hasDisplayedExercises = displayedExerciseNames.length > 0;

  // Редактировать (отмечать статус, добавлять/убирать/менять
  // повторения, удалять запись целиком) можно только за ТЕКУЩУЮ
  // неделю (понедельник–воскресенье). Экран "Тренировка" (variant
  // "log") всегда открывает сегодняшний день, поэтому он редактируем
  // всегда, без дополнительной проверки. Ограничение реально работает
  // только на экране "История" (variant "history"), где через
  // календарь можно открыть любой день, включая прошлые недели/месяцы.
  const isEditable = variant === 'log' || isWithinCurrentWeek(dateKey);

  const statusBlock = isEditable ? (
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
  ) : dayStatus ? (
    // День вне текущей недели, статус менять нельзя — но если он уже
    // был проставлен раньше, показываем его как обычный (не
    // нажимаемый) бейдж, а не прячем совсем.
    <View>
      <Text style={styles.statusTitle}>Статус дня</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusButton, styles.statusButtonActive]}>
          <Text style={[styles.statusButtonText, styles.statusButtonTextActive]}>
            {STATUS_LABELS[dayStatus]}
          </Text>
        </View>
      </View>
    </View>
  ) : null;

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

  // Этот блок (список упражнений с полем ввода повторений) отдаёт
  // редактирование пользователю, поэтому дальше по файлу он вызывается
  // только тогда, когда isEditable === true — см. showExerciseEditor
  // ниже и ветку variant === 'log' (там isEditable всегда true).
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
                  <Text style={styles.totalText}>{totalReps}</Text>
                ) : null}

                {/* Убрать из личного списка можно только пока по
                    упражнению за этот день ничего не введено — иначе
                    можно случайно спрятать уже записанные данные */}
                {isInPersonalList && !(totalReps > 0) ? (
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
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const deleteBlock = hasAnyData && isEditable ? (
    <View style={styles.deleteSection}>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteDay}>
        <Text style={styles.deleteButtonText}>Удалить запись за день</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  // Если день нельзя редактировать, forced-показ редактора (пустой
  // день без записей) тоже не нужен — вместо него ниже показывается
  // либо список за прошлый день только для чтения, либо сообщение
  // "Нет данных".
  const showExerciseEditor = isEditable && (isEditingExercises || !hasReps);

  const lockNotice = !isEditable ? (
    <View style={styles.lockNotice} testID="day-editor-lock-notice">
      <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
      <Text style={styles.lockNoticeText}>
        Редактирование доступно для текущей недели
      </Text>
    </View>
  ) : null;

  const content =
    variant === 'log' ? (
      <View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{formatDateDisplay(dateKey)}</Text>
          <UpdateAvailableIcon />
        </View>

        {exerciseSelectionBlock}

        <View style={styles.divider} />

        {statusBlock}

        {deleteBlock}
      </View>
    ) : (
      <View>
        {lockNotice}

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
            {hasReps ? (
              Object.keys(exerciseReps).map(exercise => (
                <Text key={exercise} style={styles.readOnlyExerciseText}>
                  {exercise} — {exerciseReps[exercise]}
                </Text>
              ))
            ) : (
              <Text style={styles.emptyExercisesText}>Нет данных за этот день</Text>
            )}

            {isEditable ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditingExercises(true)}>
                <Text style={styles.editButtonText}>Редактировать</Text>
              </TouchableOpacity>
            ) : null}
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
        folders={folders}
        folderExercises={folderExercises}
        selectedNames={displayedExerciseNames}
        onPick={handlePickExercise}
      />

        <EditRepsModal
        visible={selectedExercise !== null}
        exercise={selectedExercise}
        repsInput={repsInput}
        onChangeRepsInput={handleChangeRepsInput}
        onConfirm={handleAddExercise}
        onClose={() => {
          setSelectedExercise(null);
          setRepsInput('');
        }}
        hasExistingReps={selectedExercise ? exerciseReps[selectedExercise] > 0 : false}
        onDeleteInput={() => handleRemoveExercise(selectedExercise)}
      />
    </View>
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
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  lockNoticeText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: 8,
    flexShrink: 1,
  },

  statusTitle: {...typography.label, color: colors.textMuted, marginBottom: 10},
  // flex:1 у каждой кнопки + adjustsFontSizeToFit на тексте — все 3
  // статуса гарантированно в одну строку на любом экране, шрифт сам
  // уменьшается под самый длинный лейбл ("Травма/восстановление").
  statusRow: {flexDirection: 'row', flexWrap: 'wrap'},
  statusButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  statusButtonActive: {backgroundColor: colors.primary},
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
  totalText: {...typography.number, fontSize: 15, color: colors.textSecondary, marginRight: 10},
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
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },

  // Нижняя строка модалки ввода повторов: слева "Удалить ввод", справа
  // "Отмена"/"Сохранить" — см. EditRepsModal выше.
  editModalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  editModalButtonsGroup: {flexDirection: 'row', alignItems: 'center'},
  cancelModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  cancelModalButtonText: {...typography.button, fontSize: 15, color: colors.textMuted},
  saveModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  saveModalButtonText: {...typography.button, fontSize: 15, color: colors.textMuted},

  clearRepsLink: {flexDirection: 'row', alignItems: 'center'},
  clearRepsLinkText: {
    ...typography.caption,
    color: colors.danger,
    marginLeft: 6,
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
    backgroundColor: 'rgba(0,0,0,0.92)',
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
  pickerRowInFolder: {paddingLeft: 32, backgroundColor: colors.background},
  pickerEmptyText: {
    ...typography.caption,
    color: colors.textPlaceholder,
    textAlign: 'center',
    padding: 20,
  },
  pickerFoldersSection: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: 8,
    paddingTop: 4,
  },
  pickerFolderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerFolderNameRow: {flexDirection: 'row', alignItems: 'center'},
  pickerFolderText: {...typography.body, color: colors.textPrimary, marginLeft: 8},

editModalOverlay: {flex: 1},
  editModalTouchArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalCard: {
    width: '92%',
    marginBottom: '20%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editModalTitle: {
    ...typography.sectionTitle,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 14,
  },
});