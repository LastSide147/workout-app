import React, {useEffect, useState} from 'react';
import {Text, View, ActivityIndicator} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {subscribeToAuthState} from './src/services/auth';
import AuthScreen from './src/screens/AuthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WorkoutLogScreen from './src/screens/WorkoutLogScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';

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
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen pendingVerification={false} />;
  }

  if (!emailVerified) {
    return <AuthScreen pendingVerification={true} onVerified={handleVerified} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#2196F3',
          }}>
          <Tab.Screen
            name="Log"
            component={WorkoutLogScreen}
            options={{
              title: 'Тренировка',
              tabBarIcon: ({color}) => (
                <Text style={{color, fontSize: 20}}>🏋️</Text>
              ),
            }}
          />
          <Tab.Screen
            name="History"
            component={WorkoutHistoryScreen}
            options={{
              title: 'История',
              tabBarIcon: ({color}) => (
                <Text style={{color, fontSize: 20}}>📅</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Statistics"
            component={StatisticsScreen}
            options={{
              title: 'Статистика',
              tabBarIcon: ({color}) => (
                <Text style={{color, fontSize: 20}}>📊</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: 'Профиль',
              tabBarIcon: ({color}) => (
                <Text style={{color, fontSize: 20}}>👤</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}