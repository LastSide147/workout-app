import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getCurrentUser} from '../services/firebase';
import {logout} from '../services/auth';
import useUserRole from '../hooks/useUserRole';
import ExerciseManagementScreen from './ExerciseManagementScreen';
import {useUpdatesContext} from '../context/UpdatesContext';

export default function ProfileScreen() {
  const user = getCurrentUser();
  const {isMaster} = useUserRole();
  const [managementVisible, setManagementVisible] = useState(false);
  const {updateAvailable, checking, applyUpdate} = useUpdatesContext();

  const handleLogout = () => {
    Alert.alert('Выйти из аккаунта', 'Вы уверены?', [
      {text: 'Отмена', style: 'cancel'},
      {text: 'Выйти', style: 'destructive', onPress: logout},
    ]);
  };

  const handleApplyUpdate = () => {
    Alert.alert(
      'Обновить приложение',
      'Приложение перезапустится, чтобы применить обновление. Продолжить?',
      [
        {text: 'Отмена', style: 'cancel'},
        {text: 'Обновить', onPress: applyUpdate},
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.logoutIconButton}
            onPress={handleLogout}
            testID="profile-logout-icon-button">
            <Text style={styles.logoutIcon}>⎋</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.email} testID="profile-user-email">
          {user ? user.email : ''}
        </Text>

        {/* Кнопка видна только пользователю с role: "master" в Firestore.
            Проверка на сервере (в Firestore Rules) — обязательна отдельно,
            эта кнопка — только удобство интерфейса, а не защита сама по себе */}
        {isMaster ? (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setManagementVisible(true)}
            testID="profile-manage-exercises-button">
            <Text style={styles.manageButtonText}>Управление упражнениями</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.updatesSection}>
          <Text style={styles.updatesTitle}>Обновления</Text>

          {checking ? (
            <Text style={styles.updatesStatusText}>Проверка обновлений...</Text>
          ) : updateAvailable ? (
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleApplyUpdate}
              testID="profile-apply-update-button">
              <Text style={styles.updateButtonText}>
                Установить обновление
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.updatesStatusText}>У вас последняя версия</Text>
          )}
        </View>
      </View>

      <Modal
        visible={managementVisible}
        animationType="slide"
        onRequestClose={() => setManagementVisible(false)}>
        <ExerciseManagementScreen
          onClose={() => setManagementVisible(false)}
        />
      </Modal>
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
    justifyContent: 'flex-end',
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

  manageButton: {
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageButtonText: {color: '#2196F3', fontWeight: 'bold'},

  updatesSection: {marginTop: 30},
  updatesTitle: {fontSize: 15, color: '#777', marginBottom: 8},
  updatesStatusText: {fontSize: 14, color: '#999'},
  updateButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  updateButtonText: {color: '#fff', fontWeight: 'bold'},
});