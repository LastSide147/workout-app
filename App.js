import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {subscribeToAuthState} from './src/services/auth';
import {initAppCheck} from './src/services/appCheck';
import {initCrashlytics, setCrashlyticsUser} from './src/services/crashlytics';
import {UpdatesProvider} from './src/context/UpdatesContext';
import UpdateAvailableModal from './src/components/UpdateAvailableModal';
import CustomTabBar from './src/components/CustomTabBar';
import {Host} from './src/components/ModalPortal';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutLogScreen from './src/screens/WorkoutLogScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import colors from './src/theme/colors';

// initAppCheck() запускаем как можно раньше (на уровне модуля, а не
// внутри компонента) — чтобы токен начал готовиться с самой первой
// миллисекунды запуска, а не только после первого рендера App().
// Promise сохраняем в переменную — сам компонент App() дожидается его
// ниже, прежде чем показать что-либо, кроме спиннера (см. appCheckReady).
const appCheckInitPromise = initAppCheck();
initCrashlytics();


const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);

  // Готовность App Check — отдельно от готовности авторизации.
  // ГЛАВНОЕ ИЗМЕНЕНИЕ: раньше экраны с вкладками (а значит и первые
  // запросы к Firestore — проверка роли, подписки на упражнения и
  // записи дня) могли отрендериться и отправить запрос ДО того, как
  // App Check успевал получить первый токен. Если Enforce в Firestore
  // включён, такой "безбилетный" запрос отклоняется с ОШИБКОЙ ВИДА
  // [firestore/permission-denied] — той же самой, что и настоящий
  // запрет в Security Rules, снаружи не отличить. appCheckReady
  // закрывает эту гонку: спиннер загрузки держится, пока не готовы
  // ОБА условия — и авторизация, и App Check.
  const [appCheckReady, setAppCheckReady] = useState(false);

  useEffect(() => {
    appCheckInitPromise.finally(() => setAppCheckReady(true));
  }, []);

useEffect(() => {
    const unsubscribe = subscribeToAuthState(newUser => {
      setUser(newUser);
      setEmailVerified(newUser ? newUser.emailVerified : false);
      setInitializing(false);
      setCrashlyticsUser(newUser ? newUser.uid : null);
    });
    return unsubscribe;
  }, []);

  const handleVerified = () => {
    setEmailVerified(true);
  };

  if (initializing || !appCheckReady) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background}}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <AuthScreen pendingVerification={false} />
      </>
    );
  }

  if (!emailVerified) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <AuthScreen pendingVerification={true} onVerified={handleVerified} />
      </>
    );
  }

  return (
    // Host — корневой контейнер для своего "портала" (см.
    // src/components/ModalPortal.js). Модалка ввода повторений
    // (EditRepsModal в DayEditor.js) рисуется через него, а не через
    // системный <Modal>, — так у неё нет отдельного Android-окна,
    // которое раньше конфликтовало с закрытием клавиатуры и "съедало"
    // первое нажатие на "Сохранить"/"Отмена". Host должен быть как
    // можно выше по дереву, чтобы портал всегда перекрывал весь экран
    // целиком, независимо от того, на какой вкладке он открыт.
    <Host>
      <UpdatesProvider>
        <SafeAreaProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar barStyle="light-content" />
            <UpdateAvailableModal />
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'none',
              }}
              tabBar={props => <CustomTabBar {...props} />}>
             <Tab.Screen name="Log" options={{title: 'Тренировка'}}>
                {() => <WorkoutLogScreen userId={user.uid} />}
              </Tab.Screen>
              <Tab.Screen name="History" options={{title: 'История'}}>
                {() => <WorkoutHistoryScreen userId={user.uid} />}
              </Tab.Screen>
              <Tab.Screen name="Statistics" options={{title: 'Статистика'}}>
                {() => <StatisticsScreen userId={user.uid} />}
              </Tab.Screen>
              <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{title: 'Профиль'}}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </UpdatesProvider>
    </Host>
  );
}