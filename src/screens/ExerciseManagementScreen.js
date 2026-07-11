import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import useExercises from '../hooks/useExercises';
import {
  addExercise,
  updateExercise,
  deleteExercise,
  reorderExercise,
} from '../services/exercises';

export default function ExerciseManagementScreen({onClose}) {
  const {exercises, loadingExercises} = useExercises();

  const [addingNew, setAddingNew] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [newCoefficientInput, setNewCoefficientInput] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editCoefficientInput, setEditCoefficientInput] = useState('');

  const [saving, setSaving] = useState(false);

  const handleStartAdd = () => {
    setEditingId(null);
    setAddingNew(true);
    setNewNameInput('');
    setNewCoefficientInput('');
  };

  const handleConfirmAdd = async () => {
    setSaving(true);
    try {
      await addExercise(newNameInput, newCoefficientInput, exercises);
      setAddingNew(false);
      setNewNameInput('');
      setNewCoefficientInput('');
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectItem = item => {
    if (editingId === item.id) {
      setEditingId(null);
      return;
    }
    setAddingNew(false);
    setEditingId(item.id);
    setEditNameInput(item.name);
    setEditCoefficientInput(
      typeof item.coefficient === 'number' ? String(item.coefficient) : '',
    );
  };

  const handleConfirmEdit = async () => {
    setSaving(true);
    try {
      await updateExercise(
        editingId,
        editNameInput,
        editCoefficientInput,
        exercises,
      );
      setEditingId(null);
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = item => {
    Alert.alert(
      'Удалить упражнение',
      `Удалить "${item.name}" из списка? Уже сохранённые тренировки не изменятся.`,
      [
        {text: 'Отмена', style: 'cancel'},
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(item.id);
              setEditingId(null);
            } catch (error) {
              Alert.alert('Ошибка', error.message);
            }
          },
        },
      ],
    );
  };

  const handleMoveUp = index => {
    reorderExercise(exercises, index, -1).catch(error =>
      Alert.alert('Ошибка', error.message),
    );
  };

  const handleMoveDown = index => {
    reorderExercise(exercises, index, 1).catch(error =>
      Alert.alert('Ошибка', error.message),
    );
  };

  const renderItem = ({item, index}) => {
    const isEditing = editingId === item.id;
    const isFirst = index === 0;
    const isLast = index === exercises.length - 1;

    return (
      <View style={styles.itemWrapper}>
        <View style={styles.itemRow}>
          <View style={styles.orderButtons}>
            <TouchableOpacity
              onPress={() => handleMoveUp(index)}
              disabled={isFirst}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
              testID={`exercise-management-move-up-${item.id}`}>
              <Text
                style={[
                  styles.orderArrow,
                  isFirst ? styles.orderArrowDisabled : null,
                ]}>
                ▲
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMoveDown(index)}
              disabled={isLast}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
              testID={`exercise-management-move-down-${item.id}`}>
              <Text
                style={[
                  styles.orderArrow,
                  isLast ? styles.orderArrowDisabled : null,
                ]}>
                ▼
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.item}
            onPress={() => handleSelectItem(item)}
            testID={`exercise-management-item-${item.id}`}>
            <Text style={styles.itemText}>{item.name}</Text>
            <Text style={styles.coefficientText}>
              {typeof item.coefficient === 'number'
                ? `коэф. ${item.coefficient}`
                : '⚠ коэффициент не задан'}
            </Text>
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={editNameInput}
              onChangeText={setEditNameInput}
              maxLength={50}
              autoFocus
              testID="exercise-management-edit-input"
            />
            <TextInput
              style={styles.coefficientInput}
              value={editCoefficientInput}
              onChangeText={setEditCoefficientInput}
              placeholder="Коэф."
              keyboardType="decimal-pad"
              maxLength={6}
              testID="exercise-management-edit-coefficient-input"
            />
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmEdit}
              disabled={saving}
              testID="exercise-management-save-edit-button">
              <Text style={styles.confirmButtonText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              testID="exercise-management-delete-button">
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          testID="exercise-management-close-button">
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Упражнения</Text>
        <TouchableOpacity
          onPress={handleStartAdd}
          testID="exercise-management-add-button">
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {addingNew ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Название упражнения"
            value={newNameInput}
            onChangeText={setNewNameInput}
            maxLength={50}
            autoFocus
            testID="exercise-management-new-input"
          />
          <TextInput
            style={styles.coefficientInput}
            value={newCoefficientInput}
            onChangeText={setNewCoefficientInput}
            placeholder="Коэф."
            keyboardType="decimal-pad"
            maxLength={6}
            testID="exercise-management-new-coefficient-input"
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmAdd}
            disabled={saving}
            testID="exercise-management-save-new-button">
            <Text style={styles.confirmButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loadingExercises ? (
        <Text style={styles.emptyText}>Загрузка...</Text>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          testID="exercise-management-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeIcon: {fontSize: 22, color: '#333'},
  title: {fontSize: 18, fontWeight: 'bold'},
  addIcon: {fontSize: 26, color: '#2196F3', fontWeight: 'bold'},

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  itemWrapper: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderButtons: {
    marginRight: 12,
    alignItems: 'center',
  },
  orderArrow: {fontSize: 14, color: '#2196F3', paddingVertical: 2},
  orderArrowDisabled: {color: '#ccc'},
  item: {flex: 1, paddingVertical: 14},
  itemText: {fontSize: 16, color: '#333'},
  coefficientText: {fontSize: 12, color: '#888', marginTop: 2},

  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  input: {
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
  coefficientInput: {
    width: 70,
    height: 44,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 8,
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
    marginRight: 8,
  },
  confirmButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 18},
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {color: '#e53935', fontWeight: 'bold', fontSize: 18},

  emptyText: {textAlign: 'center', color: '#999', marginTop: 20},
});