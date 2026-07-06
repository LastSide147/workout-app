import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  registerWithEmail,
  loginWithEmail,
  resendVerificationEmail,
  reloadCurrentUser,
  logout,
  getAuthErrorMessage,
} from '../services/auth';

// Простая проверка формата email на стороне приложения — до отправки
// запроса в Firebase. Ловит очевидные ошибки (нет @, нет точки в домене)
// и сразу показывает понятное сообщение, а не ждёт ответа сервера.
function isValidEmail(value) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(value);
}

export default function AuthScreen({pendingVerification, onVerified}) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Убираем случайные пробелы в начале/конце — частая причина
    // "битого" email при вводе с телефона
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      Alert.alert('Заполните email и пароль');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert(
        'Некорректный email',
        'Проверьте, что адрес указан полностью, например: name@example.com',
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(trimmedEmail, password);
        Alert.alert(
          'Проверьте почту',
          'Мы отправили письмо для подтверждения email',
        );
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (error) {
      Alert.alert('Ошибка', getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    setLoading(true);
    try {
      const user = await reloadCurrentUser();
      if (user && user.emailVerified) {
        onVerified();
      } else {
        Alert.alert('Email ещё не подтверждён', 'Проверьте почту и перейдите по ссылке');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      Alert.alert('Готово', 'Письмо отправлено повторно');
    } catch (error) {
      Alert.alert('Ошибка', getAuthErrorMessage(error));
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Подтвердите почту</Text>
        <Text style={styles.description}>
          Мы отправили письмо со ссылкой подтверждения. Перейдите по ней, затем
          нажмите кнопку ниже.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckVerified}
          disabled={loading}>
          <Text style={styles.primaryButtonText}>
            {loading ? 'Проверка...' : 'Я подтвердил, продолжить'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={handleResend}>
          <Text style={styles.linkText}>Отправить письмо повторно</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={logout}>
          <Text style={styles.linkText}>Выйти и войти другим аккаунтом</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'login' ? 'Вход' : 'Регистрация'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      {/* Поле пароля с иконкой показать/скрыть справа */}
      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Пароль"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!passwordVisible}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setPasswordVisible(prev => !prev)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.eyeIcon}>{passwordVisible ? '🙈' : '👁'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSubmit}
        disabled={loading}>
        <Text style={styles.primaryButtonText}>
          {loading
            ? 'Подождите...'
            : mode === 'login'
            ? 'Войти'
            : 'Зарегистрироваться'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.linkText}>
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center'},
  description: {fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {paddingHorizontal: 12},
  eyeIcon: {fontSize: 18},
  primaryButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {color: '#fff', fontWeight: 'bold', fontSize: 16},
  linkButton: {marginTop: 16, alignItems: 'center'},
  linkText: {color: '#2196F3', fontSize: 14},
});