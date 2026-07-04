import React from 'react';
import {Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import WorkoutLogScreen from './src/screens/WorkoutLogScreen';
import WorkoutHistoryScreen from './src/screens/WorkoutHistoryScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
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
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}