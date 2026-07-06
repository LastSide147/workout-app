import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getCurrentUser} from '../services/firebase';
import {logout} from '../services/auth';

export default function ProfileScreen() {
  const user = getCurrentUser();

  const handleLogout = () => {
    Alert.alert('Выйти из аккаунта', 'Вы уверены?', [
      {text: 'Отмена', style: 'cancel'},
      {text: 'Выйти', style: 'destructive', onPress: logout},
    ]);
  };

  return (
    // SafeAreaView сам подставляет отступ под статус-бар/чёлку конкретного
    // устройства (в отличие от фиксированного числа), поэтому кнопка
    // гарантированно окажется в кликабельной зоне на любом телефоне
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        {/* Верхняя строка: иконка выхода справа, без заголовка "Профиль" */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.logoutIconButton}
            onPress={handleLogout}
            // data-testid-эквивалент в React Native — это testID.
            // Именно по нему потом в Playwright/автотестах будем находить
            // кнопку, а не по тексту или расположению на экране
            testID="profile-logout-icon-button">
            {/* Иконка выхода на Unicode-символе — без сторонних библиотек иконок */}
            <Text style={styles.logoutIcon}>⎋</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.email} testID="profile-user-email">
          {user ? user.email : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // прижимает иконку к правому краю экрана
    marginBottom: 16,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 20,
    color: '#e53935',
    fontWeight: 'bold',
  },
  email: {fontSize: 16, color: '#555', marginBottom: 30},
});