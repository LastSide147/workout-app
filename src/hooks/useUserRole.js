import {useEffect, useState} from 'react';
import firestore from '@react-native-firebase/firestore';
import {getCurrentUser} from '../services/firebase';

// Поле role хранится в документе users/{uid} и выставляется вручную
// через Firebase Console — это разовая настройка, без формы
// регистрации "мастеров" в самом приложении.
export default function useUserRole() {
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoadingRole(false);
      return undefined;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(user.uid)
      .onSnapshot(
        doc => {
          // ВАЖНО: нельзя полагаться только на doc.exists.
          // Бывают моменты (например, самый первый снапшот сразу после
          // регистрации нового пользователя), когда doc.exists может быть
          // true, а doc.data() при этом вернуть undefined.
          // Поэтому сначала сохраняем результат data() в переменную
          // и проверяем именно её, а не полагаемся на exists.
          const data = doc.data();

          if (data && typeof data.role === 'string') {
            setRole(data.role);
          } else {
            // Нет документа, нет данных или нет поля role —
            // считаем пользователя обычным (не мастером).
            setRole(null);
          }

          setLoadingRole(false);
        },
        error => {
          console.error('Ошибка проверки роли пользователя:', error);
          setRole(null);
          setLoadingRole(false);
        },
      );

    return unsubscribe;
  }, []);

  const isMaster = role === 'master';
  return {isMaster, loadingRole};
}