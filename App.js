import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {subscribeToAuthState} from './src/services/auth';
import {UpdatesProvider} from './src/context/UpdatesContext';
import UpdateBanner from './src/components/UpdateBanner';
import CustomTabBar from './src/components/CustomTabBar';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutLogScreen from './src/screens/WorkoutLogScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import colors from './src/theme/colors';

const Tab = createBottomTabNavigator();

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(newUser => {
      setUser(newUser);
      setEmailVerified(newUser ? newUser.emailVerified : false);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  // Вызывается кнопкой "Я подтвердил, продолжить" после явной проверки почты
  const handleVerified = () => {
    setEmailVerified(true);
  };

  if (initializing) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen pendingVerification={false} />;
  }

  if (!emailVerified) {
    return <AuthScreen pendingVerification={true} onVerified={handleVerified} />;
  }

  // UpdatesProvider оборачивает именно авторизованную часть — проверка
  // обновления запускается один раз, как только пользователь реально
  // вошёл в приложение ("первый вход"), а не на экране логина.
  return (
    <UpdatesProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <UpdateBanner />
          <Tab.Navigator
            screenOptions={{headerShown: false}}
            tabBar={props => <CustomTabBar {...props} />}>
            <Tab.Screen
              name="Log"
              component={WorkoutLogScreen}
              options={{title: 'Тренировка'}}
            />
            <Tab.Screen
              name="History"
              component={WorkoutHistoryScreen}
              options={{title: 'История'}}
            />
            <Tab.Screen
              name="Statistics"
              component={StatisticsScreen}
              options={{title: 'Статистика'}}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{title: 'Профиль'}}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </UpdatesProvider>
  );
}