import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator, StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
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

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(newUser => {
      setUser(newUser);
      setEmailVerified(newUser ? newUser.emailVerified : false);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const handleVerified = () => {
    setEmailVerified(true);
  };

  if (initializing) {
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
    <UpdatesProvider>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar barStyle="light-content" />
          <UpdateBanner />
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
  );
} 