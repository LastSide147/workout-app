// Модалка подтверждения удаления аккаунта — по тому же паттерну,
// что и другие модалки в проекте (overlay + карточка по центру).
import React, {useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import colors from '../theme/colors';
import {deleteAccountAndData} from '../services/deleteAccount';

export default function DeleteAccountModal({visible, onClose, onDeleted}) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!visible) return null;

  async function handleConfirm() {
    setError(null);
    if (!password) {
      setError('Введите пароль для подтверждения');
      return;
    }
    setLoading(true);
    try {
      await deleteAccountAndData(password);
      onDeleted(); // родитель решает, что делать дальше (обычно — переход на экран входа)
    } catch (e) {
      // auth/wrong-password — неверный пароль,
      // auth/requires-recent-login — редкий случай, если сессия совсем старая
      setError('Не получилось удалить аккаунт: проверьте пароль и попробуйте снова');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Удалить аккаунт навсегда?</Text>
        <Text style={styles.subtitle}>
          Все данные — профиль, тренировки, рейтинг — будут удалены без возможности восстановления.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Пароль для подтверждения"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.deleteButton} onPress={handleConfirm} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonText}>Удалить навсегда</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} disabled={loading}>
          <Text style={styles.cancel}>Отмена</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center'},
  card: {backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '85%'},
  title: {fontSize: 18, fontWeight: '600', marginBottom: 8},
  subtitle: {fontSize: 14, color: '#666', marginBottom: 16},
  // color задан явно (чёрный) — без этого Android на устройствах с
  // системной тёмной темой подставляет свой цвет текста по умолчанию
  // (часто белый), и на белом фоне карточки (backgroundColor: '#fff'
  // выше) вводимые символы/точки становятся не видны. Эмулятор в
  // светлой теме этого не показывает, поэтому баг был виден только на
  // реальном телефоне.
  input: {borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8, color: '#000'},
  error: {color: 'red', marginBottom: 8},
  deleteButton: {backgroundColor: '#d32f2f', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 8},
  deleteButtonText: {color: '#fff', fontWeight: '600'},
  cancel: {textAlign: 'center', color: '#666', padding: 8},
});