import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {
  registerWithEmail,
  loginWithEmail,
  resendVerificationEmail,
  sendPasswordReset,
  reloadCurrentUser,
  logout,
  getAuthErrorMessage,
} from '../services/auth';
import colors from '../theme/colors';
import typography from '../theme/typography';

function isValidEmail(value) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(value);
}

function getPasswordChecks(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  };
}

// Одна строка списка требований — галочка/крестик + подпись.
// Вынесена отдельным компонентом, чтобы не повторять одну и ту же
// разметку четыре раза.
function PasswordRequirementRow({met, label}) {
  return (
    <View style={styles.requirementRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={met ? colors.success : colors.textMuted}
      />
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
        {label}
      </Text>
    </View>
  );
}

// Одна и та же фраза используется во всех трёх местах, где отправляется
// письмо (регистрация, повторная отправка, сброс пароля) — чтобы текст
// не разъезжался по формулировке и его нужно было менять в одном месте.
const SPAM_FOLDER_NOTE =
  'Если письма нет во "Входящих" - проверьте папку "Спам". Откройте ссылку для подтверждения регистрации.';

export default function AuthScreen({pendingVerification, onVerified}) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordChecks = getPasswordChecks(password);

  const handleSubmit = async () => {
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
          'Письмо для подтверждения отправлено на email' + SPAM_FOLDER_NOTE,
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
      Alert.alert('Готово', 'Письмо отправлено повторно. ' + SPAM_FOLDER_NOTE);
    } catch (error) {
      Alert.alert('Ошибка', getAuthErrorMessage(error));
    }
  };

  // Письмо для сброса пароля уходит на тот же email, что уже введён в
  // поле выше — отдельного экрана/поля для этого не делаем, это то же
  // самое поле, что и для входа/регистрации.
  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      Alert.alert(
        'Введите email',
        'Сначала введите свой email в поле выше, затем нажмите "Забыли пароль?" ещё раз.',
      );
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      Alert.alert(
        'Письмо отправлено',
        'Мы отправили ссылку для смены пароля на ' + trimmedEmail + '. ' + SPAM_FOLDER_NOTE,
      );
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        Alert.alert('Email не найден', 'Аккаунт с таким email не зарегистрирован.');
      } else {
        Alert.alert('Ошибка', getAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Подтвердите почту</Text>
        <Text style={styles.description}>
          Письмо для подтверждения отправлено на email. Перейдите по ней, затем
          нажмите кнопку ниже.
        </Text>
                <Text style={styles.spamNote}>{SPAM_FOLDER_NOTE}</Text>

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
        placeholderTextColor={colors.textPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordRow}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Пароль"
          placeholderTextColor={colors.textPlaceholder}
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
          <Ionicons
            name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {mode === 'register' ? (
        <View style={styles.passwordRequirements} testID="auth-password-requirements">
          <PasswordRequirementRow met={passwordChecks.length} label="Минимум 8 символов" />
          <PasswordRequirementRow met={passwordChecks.uppercase} label="Заглавная буква (A-Z)" />
          <PasswordRequirementRow met={passwordChecks.lowercase} label="Строчная буква (a-z)" />
          <PasswordRequirementRow met={passwordChecks.digit} label="Цифра (0-9)" />
        </View>
      ) : null}

       {mode === 'login' ? (
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
          disabled={loading}
          testID="auth-forgot-password-button">
          <Text style={styles.linkText}>Забыли пароль?</Text>
        </TouchableOpacity>
      ) : null}

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
  container: {flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.background},
  title: {...typography.screenTitle, fontSize: 24, marginBottom: 20, textAlign: 'center', color: colors.textPrimary},
  description: {...typography.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeButton: {paddingHorizontal: 12},
  primaryButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {...typography.button, color: colors.white},
  linkButton: {marginTop: 16, alignItems: 'center'},
  linkText: {...typography.buttonSmall, fontSize: 14, color: colors.primary},

  forgotPasswordButton: {alignItems: 'flex-end', marginBottom: 4},
spamNote: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 24,
  },
  passwordRequirements: {marginBottom: 16},
  requirementRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  requirementText: {...typography.caption, fontSize: 13, color: colors.textMuted, marginLeft: 6},
  requirementTextMet: {color: colors.success},
});