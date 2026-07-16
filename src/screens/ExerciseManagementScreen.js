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
import {Ionicons} from '@expo/vector-icons';
import useExercises from '../hooks/useExercises';
import {
  addExercise,
  updateExercise,
  deleteExercise,
  reorderExercise,
  addFolder,
  updateFolder,
  deleteFolder,
  reorderFolder,
} from '../services/exercises';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Экран управления упражнениями мастер-аккаунта. Показывает два вида
// строк одновременно (одиночные упражнения сверху и папки снизу) —
// когда folderId не задан. Если folderId задан, экран показывает
// СОДЕРЖИМОЕ конкретной папки — точно такой же интерфейс добавления/
// редактирования/удаления/сортировки упражнений, что и наверху, только
// упражнения при сохранении привязываются к этой папке (folderId), а
// сам блок с папками не показывается (папка внутри папки невозможна).
//
// Переход "внутрь" папки реализован без навигатора — просто через
// внутренний state openFolder: пока он не пуст, вместо обычного
// контента рендерится этот же компонент ещё раз, но уже с folderId.
// Кнопка "назад"/"закрыть" тогда возвращает не в профиль, а на
// верхний уровень списка упражнений.
export default function ExerciseManagementScreen({onClose, folderId = null, folderName = null}) {
  const {exercises, folders, folderExercises, loadingExercises} = useExercises();

  const [openFolder, setOpenFolder] = useState(null);

  const [addingNew, setAddingNew] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [newCoefficientInput, setNewCoefficientInput] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editNameInput, setEditNameInput] = useState('');
  const [editCoefficientInput, setEditCoefficientInput] = useState('');

  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');

  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderNameInput, setEditFolderNameInput] = useState('');

  const [saving, setSaving] = useState(false);

  // Список упражнений именно этой "области": содержимое конкретной
  // папки, если мы внутри неё, иначе одиночные упражнения верхнего
  // уровня. Используется и для рендера, и как scopeItems для проверки
  // дублей/следующего order в services/exercises.js.
  const scopedExercises = folderId ? folderExercises[folderId] || [] : exercises;

  const handleStartAdd = () => {
    setEditingId(null);
    setAddingFolder(false);
    setEditingFolderId(null);
    setAddingNew(true);
    setNewNameInput('');
    setNewCoefficientInput('');
  };

  const handleConfirmAdd = async () => {
    setSaving(true);
    try {
      await addExercise(newNameInput, newCoefficientInput, scopedExercises, folderId);
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
      await updateExercise(editingId, editNameInput, editCoefficientInput, scopedExercises);
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
    reorderExercise(scopedExercises, index, -1).catch(error =>
      Alert.alert('Ошибка', error.message),
    );
  };

  const handleMoveDown = index => {
    reorderExercise(scopedExercises, index, 1).catch(error =>
      Alert.alert('Ошибка', error.message),
    );
  };

  // ---- Папки (только на верхнем уровне) ----

  const handleStartAddFolder = () => {
    setEditingId(null);
    setAddingNew(false);
    setEditingFolderId(null);
    setAddingFolder(true);
    setNewFolderNameInput('');
  };

  const handleConfirmAddFolder = async () => {
    setSaving(true);
    try {
      await addFolder(newFolderNameInput, folders);
      setAddingFolder(false);
      setNewFolderNameInput('');
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectFolderForRename = folder => {
    if (editingFolderId === folder.id) {
      setEditingFolderId(null);
      return;
    }
    setAddingFolder(false);
    setEditingFolderId(folder.id);
    setEditFolderNameInput(folder.name);
  };

  const handleConfirmEditFolder = async () => {
    setSaving(true);
    try {
      await updateFolder(editingFolderId, editFolderNameInput, folders);
      setEditingFolderId(null);
    } catch (error) {
      Alert.alert('Ошибка', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFolder = folder => {
    const childIds = (folderExercises[folder.id] || []).map(item => item.id);
    const warning =
      childIds.length > 0
        ? `Папка "${folder.name}" и все упражнения внутри неё (${childIds.length} шт.) будут удалены. Уже сохранённые тренировки не изменятся.`
        : `Удалить пустую папку "${folder.name}"?`;

    Alert.alert('Удалить папку', warning, [
      {text: 'Отмена', style: 'cancel'},
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFolder(folder.id, childIds);
            setEditingFolderId(null);
          } catch (error) {
            Alert.alert('Ошибка', error.message);
          }
        },
      },
    ]);
  };

  const handleMoveFolderUp = index => {
    reorderFolder(folders, index, -1).catch(error =>
      Alert.alert('Ошибка', error.message),
    );
  };

  const handleMoveFolderDown = index => {
    reorderFolder(folders, index, 1).catch(error =>
      Alert.alert('Ошибка', error.message),
    );
  };

  // Если открыта конкретная папка — рендерим этот же экран ещё раз,
  // но уже "внутри" неё. onClose нового уровня — просто закрыть
  // вложенный экран (вернуться к списку папок), а не закрыть всё
  // управление целиком.
  if (openFolder) {
    return (
      <ExerciseManagementScreen
        folderId={openFolder.id}
        folderName={openFolder.name}
        onClose={() => setOpenFolder(null)}
      />
    );
  }

  const renderItem = ({item, index}) => {
    const isEditing = editingId === item.id;
    const isFirst = index === 0;
    const isLast = index === scopedExercises.length - 1;

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
              placeholderTextColor={colors.textPlaceholder}
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

  const renderFolder = (folder, index) => {
    const isEditing = editingFolderId === folder.id;
    const isFirst = index === 0;
    const isLast = index === folders.length - 1;
    const childCount = (folderExercises[folder.id] || []).length;

    return (
      <View style={styles.itemWrapper} key={folder.id}>
        <View style={styles.itemRow}>
          <View style={styles.orderButtons}>
            <TouchableOpacity
              onPress={() => handleMoveFolderUp(index)}
              disabled={isFirst}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
              testID={`exercise-management-folder-move-up-${folder.id}`}>
              <Text style={[styles.orderArrow, isFirst ? styles.orderArrowDisabled : null]}>▲</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMoveFolderDown(index)}
              disabled={isLast}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
              testID={`exercise-management-folder-move-down-${folder.id}`}>
              <Text style={[styles.orderArrow, isLast ? styles.orderArrowDisabled : null]}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Тап по самой папке — открывает её содержимое (отдельный
              экран), а не переключает режим переименования */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => setOpenFolder(folder)}
            testID={`exercise-management-folder-open-${folder.id}`}>
            <View style={styles.folderNameRow}>
              <Ionicons name="folder-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.itemText, styles.folderNameText]}>{folder.name}</Text>
            </View>
            <Text style={styles.coefficientText}>
              {childCount === 0 ? 'Папка пуста' : `упражнений: ${childCount}`}
            </Text>
          </TouchableOpacity>

          {/* Отдельная кнопка переименования/удаления — чтобы не
              путать с тапом "открыть папку" выше */}
          <TouchableOpacity
            style={styles.folderEditIconButton}
            onPress={() => handleSelectFolderForRename(folder)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            testID={`exercise-management-folder-edit-${folder.id}`}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={editFolderNameInput}
              onChangeText={setEditFolderNameInput}
              maxLength={50}
              autoFocus
              testID="exercise-management-folder-edit-input"
            />
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmEditFolder}
              disabled={saving}
              testID="exercise-management-folder-save-edit-button">
              <Text style={styles.confirmButtonText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteFolder(folder)}
              testID="exercise-management-folder-delete-button">
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
          <Text style={styles.closeIcon}>{folderId ? '‹' : '✕'}</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {folderId ? folderName : 'Упражнения'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleStartAdd}
            hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
            testID="exercise-management-add-button">
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
          {/* Кнопку добавления папки показываем только на верхнем
              уровне — папка внутри папки не поддерживается */}
          {!folderId ? (
            <TouchableOpacity
              onPress={handleStartAddFolder}
              hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
              style={styles.addFolderButton}
              testID="exercise-management-add-folder-button">
              <Ionicons name="folder-outline" size={20} color={colors.primary} />
              <Text style={styles.addFolderPlus}>+</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {addingNew ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Название упражнения"
            placeholderTextColor={colors.textPlaceholder}
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
            placeholderTextColor={colors.textPlaceholder}
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

      {addingFolder ? (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Название папки"
            placeholderTextColor={colors.textPlaceholder}
            value={newFolderNameInput}
            onChangeText={setNewFolderNameInput}
            maxLength={50}
            autoFocus
            testID="exercise-management-new-folder-input"
          />
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmAddFolder}
            disabled={saving}
            testID="exercise-management-save-new-folder-button">
            <Text style={styles.confirmButtonText}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loadingExercises ? (
        <Text style={styles.emptyText}>Загрузка...</Text>
      ) : (
        <FlatList
          data={scopedExercises}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          testID="exercise-management-list"
          // Папки показываем только на верхнем уровне, отдельным
          // блоком НИЖЕ всех одиночных упражнений — как и просили:
          // сначала все одиночные, потом папки.
          ListFooterComponent={
            !folderId && folders.length > 0 ? (
              <View style={styles.foldersSection}>
                <Text style={styles.foldersSectionTitle}>Папки</Text>
                {folders.map((folder, index) => renderFolder(folder, index))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !folderId ? null : (
              <Text style={styles.emptyText}>
                В этой папке пока нет упражнений
              </Text>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  closeIcon: {fontSize: 22, color: colors.textPrimary},
  title: {...typography.sectionTitle, color: colors.textPrimary, flex: 1, marginHorizontal: 12},
  headerActions: {flexDirection: 'row', alignItems: 'center'},
  addIcon: {fontSize: 26, color: colors.primary, fontWeight: 'bold', marginRight: 16},
  addFolderButton: {flexDirection: 'row', alignItems: 'center'},
  addFolderPlus: {fontSize: 18, color: colors.primary, fontWeight: 'bold', marginLeft: 2},

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  itemWrapper: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerLight,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderButtons: {
    marginRight: 12,
    alignItems: 'center',
  },
  orderArrow: {fontSize: 14, color: colors.primary, paddingVertical: 2},
  orderArrowDisabled: {color: colors.disabled},
  item: {flex: 1, paddingVertical: 14},
  itemText: {...typography.bodyBold, color: colors.textPrimary},
  coefficientText: {...typography.caption, fontSize: 12, color: colors.textPlaceholder, marginTop: 2},

  folderNameRow: {flexDirection: 'row', alignItems: 'center'},
  folderNameText: {marginLeft: 6},
  folderEditIconButton: {paddingHorizontal: 6, paddingVertical: 14},

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
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  coefficientInput: {
    width: 70,
    height: 44,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  confirmButton: {
    backgroundColor: colors.success,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  confirmButtonText: {color: colors.white, fontWeight: 'bold', fontSize: 18},
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {color: colors.danger, fontWeight: 'bold', fontSize: 18},

  foldersSection: {marginTop: 8},
  foldersSectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },

  emptyText: {...typography.caption, textAlign: 'center', color: colors.textPlaceholder, marginTop: 20},
});