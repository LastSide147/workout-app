import firestore from '@react-native-firebase/firestore';

const MAX_NAME_LENGTH = 50;
const MIN_COEFFICIENT = 0.01;
const MAX_COEFFICIENT = 100;

const VALID_NAME_REGEX = /^[A-Za-zА-Яа-яЁё0-9\s\-()]+$/u;

function exercisesCollection() {
  return firestore().collection('exercises');
}

function validateName(rawName, existingNames, emptyError) {
  const name = (rawName || '').trim();

  if (name.length === 0) {
    return {valid: false, error: emptyError};
  }
  if (name.length > MAX_NAME_LENGTH) {
    return {valid: false, error: `Максимум ${MAX_NAME_LENGTH} символов`};
  }
  if (!VALID_NAME_REGEX.test(name)) {
    return {
      valid: false,
      error: 'Разрешены только буквы, цифры, пробелы, дефис и скобки',
    };
  }

  const isDuplicate = existingNames.some(
    existing => existing.trim().toLowerCase() === name.toLowerCase(),
  );
  if (isDuplicate) {
    return {valid: false, error: 'Такое название уже есть в списке'};
  }

  return {valid: true, name};
}

export function validateExerciseName(rawName, existingNames = []) {
  return validateName(rawName, existingNames, 'Введите название упражнения');
}

export function validateFolderName(rawName, existingNames = []) {
  return validateName(rawName, existingNames, 'Введите название папки');
}

export function validateCoefficient(rawCoefficient) {
  const normalized = String(rawCoefficient || '')
    .trim()
    .replace(',', '.');

  if (normalized.length === 0) {
    return {valid: false, error: 'Укажите коэффициент упражнения'};
  }

  const value = Number(normalized);

  if (Number.isNaN(value)) {
    return {valid: false, error: 'Коэффициент должен быть числом'};
  }
  if (value < MIN_COEFFICIENT || value > MAX_COEFFICIENT) {
    return {
      valid: false,
      error: `Коэффициент должен быть от ${MIN_COEFFICIENT} до ${MAX_COEFFICIENT}`,
    };
  }

  const rounded = Math.round(value * 100) / 100;
  return {valid: true, coefficient: rounded};
}

// Единая подписка на всю коллекцию "exercises" — одиночные
// упражнения, папки и упражнения внутри папок лежат в одном месте
// (один источник правды, как и раньше). Разбор на нужные срезы
// (топ-уровень / содержимое конкретной папки) происходит в хуке
// useExercises — здесь только сырые данные.
//
// Старые документы созданы ещё до появления папок и поля type не
// имеют — считаем их обычными упражнениями верхнего уровня, поэтому
// ничего не ломается на уже существующих данных.
export function subscribeToExercises(onData) {
  return exercisesCollection().onSnapshot(
    snapshot => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type === 'folder' ? 'folder' : 'exercise',
          name: data.name,
          folderId: data.folderId || null,
          order: typeof data.order === 'number' ? data.order : 0,
          folderOrder: typeof data.folderOrder === 'number' ? data.folderOrder : 0,
          coefficient:
            typeof data.coefficient === 'number' ? data.coefficient : null,
        };
      });
      onData(list);
    },
    error => {
      console.error('Ошибка подписки на упражнения:', error);
      onData([]);
    },
  );
}

// ---- Упражнения ----
// scopeItems — упражнения, уже отфильтрованные под нужную область:
// либо все упражнения верхнего уровня (без папки), либо все
// упражнения одной конкретной папки. От неё зависит и проверка на
// дубликаты имени, и подсчёт следующего order — так что при
// добавлении упражнения ВНУТРИ папки список для проверки должен быть
// именно списком этой папки, а не всем каталогом.
export async function addExercise(rawName, rawCoefficient, scopeItems, folderId = null) {
  const existingNames = scopeItems.map(item => item.name);
  const nameValidation = validateExerciseName(rawName, existingNames);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  const coefficientValidation = validateCoefficient(rawCoefficient);
  if (!coefficientValidation.valid) {
    throw new Error(coefficientValidation.error);
  }

  const maxOrder = scopeItems.reduce((max, item) => Math.max(max, item.order || 0), 0);

  await exercisesCollection().add({
    type: 'exercise',
    name: nameValidation.name,
    coefficient: coefficientValidation.coefficient,
    folderId,
    order: maxOrder + 1,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function updateExercise(exerciseId, rawName, rawCoefficient, scopeItems) {
  const otherNames = scopeItems
    .filter(item => item.id !== exerciseId)
    .map(item => item.name);

  const nameValidation = validateExerciseName(rawName, otherNames);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  const coefficientValidation = validateCoefficient(rawCoefficient);
  if (!coefficientValidation.valid) {
    throw new Error(coefficientValidation.error);
  }

  await exercisesCollection().doc(exerciseId).update({
    name: nameValidation.name,
    coefficient: coefficientValidation.coefficient,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteExercise(exerciseId) {
  await exercisesCollection().doc(exerciseId).delete();
}

// direction: -1 (вверх) или 1 (вниз). items — список, уже
// отсортированный и отфильтрованный под нужную область (топ-уровень
// или конкретная папка) — поэтому одна и та же функция обслуживает и
// обычные упражнения, и упражнения внутри папки.
export async function reorderExercise(items, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return;
  }

  const current = items[index];
  const target = items[targetIndex];

  const batch = firestore().batch();
  batch.update(exercisesCollection().doc(current.id), {
    order: target.order,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  batch.update(exercisesCollection().doc(target.id), {
    order: current.order,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

// ---- Папки ----
// Папка — документ в той же коллекции "exercises" с type: 'folder'.
// У неё нет коэффициента (коэффициент только у упражнений внутри), а
// порядок среди других папок хранится в отдельном поле folderOrder,
// чтобы не путаться с order обычных упражнений. Папки всегда только
// одного уровня — вложенных папок внутри папок быть не может.

export async function addFolder(rawName, existingFolders) {
  const existingNames = existingFolders.map(item => item.name);
  const nameValidation = validateFolderName(rawName, existingNames);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  const maxOrder = existingFolders.reduce(
    (max, item) => Math.max(max, item.folderOrder || 0),
    0,
  );

  await exercisesCollection().add({
    type: 'folder',
    name: nameValidation.name,
    folderId: null,
    coefficient: null,
    folderOrder: maxOrder + 1,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function updateFolder(folderId, rawName, existingFolders) {
  const otherNames = existingFolders
    .filter(item => item.id !== folderId)
    .map(item => item.name);

  const nameValidation = validateFolderName(rawName, otherNames);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  await exercisesCollection().doc(folderId).update({
    name: nameValidation.name,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

// Удаление папки каскадно удаляет и все упражнения внутри неё —
// иначе они остались бы "осиротевшими" (без папки-владельца) и
// невидимыми ни в одном экране управления. Уже сохранённые записи
// тренировок (по датам) при этом не трогаем — как и при обычном
// удалении одиночного упражнения.
export async function deleteFolder(folderId, childExerciseIds) {
  const batch = firestore().batch();
  batch.delete(exercisesCollection().doc(folderId));
  childExerciseIds.forEach(id => {
    batch.delete(exercisesCollection().doc(id));
  });
  await batch.commit();
}

export async function reorderFolder(folders, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= folders.length) {
    return;
  }

  const current = folders[index];
  const target = folders[targetIndex];

  const batch = firestore().batch();
  batch.update(exercisesCollection().doc(current.id), {
    folderOrder: target.folderOrder,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  batch.update(exercisesCollection().doc(target.id), {
    folderOrder: current.folderOrder,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}