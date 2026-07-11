import firestore from '@react-native-firebase/firestore';

const MAX_NAME_LENGTH = 50;
const MIN_COEFFICIENT = 0.01;
const MAX_COEFFICIENT = 100;

const VALID_NAME_REGEX = /^[A-Za-zА-Яа-яЁё0-9\s\-()]+$/u;

function exercisesCollection() {
  return firestore().collection('exercises');
}

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

export function subscribeToExercises(onData) {
  return exercisesCollection()
    .orderBy('order', 'asc')
    .onSnapshot(
      snapshot => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          order: doc.data().order,
          coefficient:
            typeof doc.data().coefficient === 'number'
              ? doc.data().coefficient
              : null,
        }));
        onData(list);
      },
      error => {
        console.error('Ошибка подписки на упражнения:', error);
        onData([]);
      },
    );
}

export async function addExercise(rawName, rawCoefficient, existingExercises) {
  const existingNames = existingExercises.map(item => item.name);
  const nameValidation = validateExerciseName(rawName, existingNames);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  const coefficientValidation = validateCoefficient(rawCoefficient);
  if (!coefficientValidation.valid) {
    throw new Error(coefficientValidation.error);
  }

  const maxOrder = existingExercises.reduce(
    (max, item) => Math.max(max, item.order || 0),
    0,
  );

  await exercisesCollection().add({
    name: nameValidation.name,
    coefficient: coefficientValidation.coefficient,
    order: maxOrder + 1,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function updateExercise(
  exerciseId,
  rawName,
  rawCoefficient,
  existingExercises,
) {
  const otherNames = existingExercises
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