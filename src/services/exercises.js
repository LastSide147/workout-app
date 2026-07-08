// export const EXERCISES = [
//   'Выходы силой',
//   'Передний вис',
//   'Подтягивания',
//   'Отжимания от турника',
//   'Отжимания на брусьях',
//   'Отжимания от пола',
//   'тест обновления(Удалить)'
// ];

import firestore from '@react-native-firebase/firestore';

const MAX_NAME_LENGTH = 50;

// Разрешаем буквы (рус/лат), цифры, пробелы, дефис и скобки.
// Это защита от XSS/некорректных данных на уровне ввода:
// любые теги, скрипты и спецсимволы просто не пройдут проверку.
const VALID_NAME_REGEX = /^[A-Za-zА-Яа-яЁё0-9\s\-()]+$/u;

function exercisesCollection() {
  return firestore().collection('exercises');
}

// Общая проверка названия упражнения — используется и при добавлении,
// и при редактировании, чтобы правила были одинаковыми в обоих местах.
export function validateExerciseName(rawName, existingNames = []) {
  const name = (rawName || '').trim();

  if (name.length === 0) {
    return {valid: false, error: 'Введите название упражнения'};
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
    return {valid: false, error: 'Такое упражнение уже есть в списке'};
  }

  return {valid: true, name};
}

// Подписка на список упражнений в реальном времени.
// onData получает массив вида [{id, name, order}, ...], отсортированный
// по полю order — именно порядок определяет, в какой последовательности
// упражнения показываются на экранах "Тренировка", "История", "Статистика".
export function subscribeToExercises(onData) {
  return exercisesCollection()
    .orderBy('order', 'asc')
    .onSnapshot(
      snapshot => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          order: doc.data().order,
        }));
        onData(list);
      },
      error => {
        console.error('Ошибка подписки на упражнения:', error);
        onData([]);
      },
    );
}

// existingExercises — текущий список из подписки выше, нужен для расчёта
// следующего order и проверки дубликатов имени.
export async function addExercise(rawName, existingExercises) {
  const existingNames = existingExercises.map(item => item.name);
  const validation = validateExerciseName(rawName, existingNames);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const maxOrder = existingExercises.reduce(
    (max, item) => Math.max(max, item.order || 0),
    0,
  );

  await exercisesCollection().add({
    name: validation.name,
    order: maxOrder + 1,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function updateExerciseName(
  exerciseId,
  rawName,
  existingExercises,
) {
  const otherNames = existingExercises
    .filter(item => item.id !== exerciseId)
    .map(item => item.name);

  const validation = validateExerciseName(rawName, otherNames);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await exercisesCollection().doc(exerciseId).update({
    name: validation.name,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function deleteExercise(exerciseId) {
  await exercisesCollection().doc(exerciseId).delete();
}

// Меняет местами order у двух соседних упражнений (текущего и того,
// куда двигаем — вверх или вниз). direction: -1 = вверх, 1 = вниз.
// batch делает обе записи атомарно — либо обе применятся, либо ни одна,
// поэтому список не может оказаться в "сломанном" промежуточном состоянии.
export async function reorderExercise(exercises, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= exercises.length) {
    return;
  }

  const current = exercises[index];
  const target = exercises[targetIndex];

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