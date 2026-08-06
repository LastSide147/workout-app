import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {
  registerWithEmail,
  loginWithEmail,
  resendVerificationEmail,
  sendPasswordReset,
  reloadCurrentUser,
  logout,
  getAuthErrorMessage,
} from '../services/auth';
import {getAllCountryOptions, getCountryLabel} from '../utils/location';
import SearchableListPickerModal from '../components/SearchableListPickerModal';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Полный список стран для пикера на экране регистрации — строится один
// раз при загрузке модуля, а не при каждом рендере.
// const COUNTRY_OPTIONS = getAllCountryOptions();

// Код России в constants/countries.js.
const RUSSIA_COUNTRY_CODE = 'RU';

// ФЛАГ НА ПЕРИОД ТЕСТИРОВАНИЯ: сейчас идёт закрытое тестирование в
// Google Play, для него нужны тестировщики из России — поэтому
// регистрация из России пока РАЗРЕШЕНА наравне со всеми остальными
// странами. Как только Google Play одобрит публикацию — поменяйте это
// значение на false и опубликуйте OTA-обновление: с этого момента
// новые регистрации из России будут блокироваться (см. проверку в
// handleSubmit ниже). Уже зарегистрированные пользователи как заходили,
// так и будут заходить — флаг влияет только на НОВУЮ регистрацию.
const RUSSIA_REGISTRATION_ALLOWED = true;

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

export default function AuthScreen({pendingVerification, onVerified}) {
  const {t, i18n} = useTranslation();
  const [mode, setMode] = useState('login');

  // Список стран пересчитывается только когда меняется язык (i18n.language
  // в зависимостях) — не на каждый рендер экрана.
  const countryOptions = useMemo(() => getAllCountryOptions(i18n.language), [i18n.language]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordChecks = getPasswordChecks(password);

  // Страна, которую пользователь ЯВНО выбрал при регистрации (не по
  // IP/локали устройства). Нужна только в момент регистрации — при
  // входе уже существующего аккаунта этот вопрос не задаём.
  const [registrationCountry, setRegistrationCountry] = useState(null);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();

    if (mode === 'register' && !registrationCountry) {
      Alert.alert(t('auth.selectCountryFirstTitle'), t('auth.selectCountryFirstMessage'));
      return;
    }

    if (
      mode === 'register' &&
      registrationCountry === RUSSIA_COUNTRY_CODE &&
      !RUSSIA_REGISTRATION_ALLOWED
    ) {
      Alert.alert(t('auth.russiaUnavailableTitle'), t('auth.russiaUnavailableMessage'));
      return;
    }

    if (!trimmedEmail || !password) {
      Alert.alert(t('auth.fillFieldsAlert'));
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert(t('auth.invalidEmailTitle'), t('auth.invalidEmailMessage'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await registerWithEmail(trimmedEmail, password);
        Alert.alert(
          t('auth.checkEmailTitle'),
          t('auth.checkEmailMessage') + ' ' + t('auth.spamFolderNote'),
        );
      } else {
        await loginWithEmail(trimmedEmail, password);
      }
    } catch (error) {
      Alert.alert(t('auth.errorTitle'), getAuthErrorMessage(error));
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
        Alert.alert(t('auth.emailNotVerifiedTitle'), t('auth.emailNotVerifiedMessage'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      Alert.alert(t('auth.resendDoneTitle'), t('auth.resendDoneMessage') + t('auth.spamFolderNote'));
    } catch (error) {
      Alert.alert(t('auth.errorTitle'), getAuthErrorMessage(error));
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      Alert.alert(t('auth.enterEmailTitle'), t('auth.enterEmailMessage'));
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(trimmedEmail);
      Alert.alert(
        t('auth.resetEmailSentTitle'),
        t('auth.resetEmailSentMessage') + trimmedEmail + '. ' + t('auth.spamFolderNote'),
      );
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        Alert.alert(t('auth.emailNotFoundTitle'), t('auth.emailNotFoundMessage'));
      } else {
        Alert.alert(t('auth.errorTitle'), getAuthErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('auth.confirmEmailTitle')}</Text>
        <Text style={styles.description}>{t('auth.confirmEmailDescription')}</Text>
        <Text style={styles.spamNote}>{t('auth.spamFolderNote')}</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckVerified}
          disabled={loading}>
          <Text style={styles.primaryButtonText}>
            {loading ? t('auth.checkingButton') : t('auth.confirmedButton')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={handleResend}>
          <Text style={styles.linkText}>{t('auth.resendButton')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={logout}>
          <Text style={styles.linkText}>{t('auth.logoutButton')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
      </Text>

      {mode === 'register' ? (
        <TouchableOpacity
          style={styles.input}
          onPress={() => setCountryPickerVisible(true)}
          testID="auth-country-button">
<Text style={registrationCountry ? styles.countryValueText : styles.countryPlaceholderText}>
            {registrationCountry ? getCountryLabel(registrationCountry, i18n.language) : t('auth.countryPlaceholder')}
          </Text>
        </TouchableOpacity>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder={t('auth.emailPlaceholder')}
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
          placeholder={t('auth.passwordPlaceholder')}
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
          <PasswordRequirementRow met={passwordChecks.length} label={t('auth.passwordReqLength')} />
          <PasswordRequirementRow met={passwordChecks.uppercase} label={t('auth.passwordReqUppercase')} />
          <PasswordRequirementRow met={passwordChecks.lowercase} label={t('auth.passwordReqLowercase')} />
          <PasswordRequirementRow met={passwordChecks.digit} label={t('auth.passwordReqDigit')} />
        </View>
      ) : null}

      {mode === 'login' ? (
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
          disabled={loading}
          testID="auth-forgot-password-button">
          <Text style={styles.linkText}>{t('auth.forgotPassword')}</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSubmit}
        disabled={loading}>
        <Text style={styles.primaryButtonText}>
          {loading
            ? t('auth.submitWait')
            : mode === 'login'
            ? t('auth.loginButton')
            : t('auth.registerButton')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.linkText}>
          {mode === 'login' ? t('auth.noAccountLink') : t('auth.hasAccountLink')}
        </Text>
      </TouchableOpacity>

<SearchableListPickerModal
        visible={countryPickerVisible}
        title={t('auth.countryPickerTitle')}
        options={countryOptions}
        selectedValue={registrationCountry}
        onSelect={setRegistrationCountry}
        onClose={() => setCountryPickerVisible(false)}
        testIDPrefix="auth-country-picker"
      />
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
  countryPlaceholderText: {fontSize: 16, color: colors.textPlaceholder},
  countryValueText: {fontSize: 16, color: colors.textPrimary},
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