import firestore from '@react-native-firebase/firestore';
import {getWithOfflineFallback} from './offlineSync';

function profileDoc(userId) {
  return firestore().collection('profiles').doc(userId);
}

// Возраст НЕ хранится готовым числом — только год и месяц рождения
// (см. подробное объяснение в src/utils/age.js). Вес хранится как
// введено. countryCode/city — тоже как введено пользователем через
// пикер (src/utils/location.js): countryCode — код ISO2 ("RU"), city —
// само название города строкой (см. cities.js, почему этого достаточно
// без отдельного id). Все поля необязательные — пользователь мог их
// ещё не заполнить (тогда null, а не 0/'' — так однозначно видно, что
// поле именно не заполнено, а не заполнено пустым/нулевым значением).
export async function getProfileDemographics(userId) {
  const snapshot = await getWithOfflineFallback(profileDoc(userId));
  const data = snapshot.exists ? snapshot.data() : null;
  return {
    birthYear: data && typeof data.birthYear === 'number' ? data.birthYear : null,
    birthMonth: data && typeof data.birthMonth === 'number' ? data.birthMonth : null,
    weight: data && typeof data.weight === 'number' ? data.weight : null,
    countryCode: data && typeof data.countryCode === 'string' ? data.countryCode : null,
    city: data && typeof data.city === 'string' ? data.city : null,
  };
}

// Сохраняет дату рождения (год+месяц), вес, страну и город одной
// записью с merge — это НЕ бакеты рейтинга, транзакция тут не нужна.
export async function saveProfileDemographics(
  userId,
  {birthYear, birthMonth, weight, countryCode, city},
) {
  await profileDoc(userId).set(
    {
      birthYear,
      birthMonth,
      weight,
      countryCode,
      city,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    {merge: true},
  );
}
