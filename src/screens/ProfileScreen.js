import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Keyboard,
    ActivityIndicator,

} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getCurrentUser} from '../services/firebase';
import {logout} from '../services/auth';
import useUserRole from '../hooks/useUserRole';
import ExerciseManagementScreen from './ExerciseManagementScreen';
import LicensesScreen from './LicensesScreen';
import {useUpdatesContext} from '../context/UpdatesContext';
import {rebuildAllBucketsFromHistory} from '../services/ratings';
import {getProfileDemographics, saveProfileDemographics} from '../services/profile';
import {BIRTH_MONTHS, getBirthYearOptions, calculateAge} from '../utils/age';
import SimpleListPickerModal from '../components/SimpleListPickerModal';
import colors from '../theme/colors';
import typography from '../theme/typography';
import packageJson from '../../package.json';

const BIRTH_YEAR_OPTIONS = getBirthYearOptions();


export default function ProfileScreen() {
  const user = getCurrentUser();
  const {isMaster} = useUserRole();
  const [managementVisible, setManagementVisible] = useState(false);
  const [licensesVisible, setLicensesVisible] = useState(false);
  const {updateAvailable, checking, applyUpdate} = useUpdatesContext();

  // Дата рождения — год и месяц (числа или null, если ещё не
  // выбраны). Возраст из них НИГДЕ не сохраняется отдельным числом —
  // он всегда считается заново функцией calculateAge (см.
  // src/utils/age.js), поэтому не может "устареть".
  const [birthYear, setBirthYear] = useState(null);
  const [birthMonth, setBirthMonth] = useState(null);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [yearPickerVisible, setYearPickerVisible] = useState(false);

  // Вес — строка (то, что реально введено в поле), а не число: так
  // поле можно спокойно очистить или вводить по одной цифре, не
  // борясь с NaN на каждом нажатии. Числом (или null, если пусто) он
  // становится только в момент сохранения — см. handleSaveDemographics.
  const [weightInput, setWeightInput] = useState('');
  const [loadingDemographics, setLoadingDemographics] = useState(true);
  const [savingDemographics, setSavingDemographics] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDemographics() {
      if (!user) {
        return;
      }
      try {
        const data = await getProfileDemographics(user.uid);
        if (!cancelled) {
          setBirthYear(data.birthYear);
          setBirthMonth(data.birthMonth);
          setWeightInput(data.weight !== null ? String(data.weight) : '');
        }
      } catch (error) {
        console.error('Не удалось загрузить дату рождения/вес:', error);
      } finally {
        if (!cancelled) {
          setLoadingDemographics(false);
        }
      }
    }

    loadDemographics();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const age = calculateAge(birthYear, birthMonth);
  const monthLabel = birthMonth
    ? BIRTH_MONTHS.find(item => item.value === birthMonth).label
    : 'Месяц';

  // Вес — цифры и одна десятичная точка (72.5 кг и т.п.).
  const handleChangeWeight = text => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const firstDotIndex = cleaned.indexOf('.');
    const withoutExtraDots =
      firstDotIndex === -1
        ? cleaned
        : cleaned.slice(0, firstDotIndex + 1) +
          cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
    setWeightInput(withoutExtraDots.slice(0, 6));
  };

  const handleShowDemographicsInfo = () => {
    Alert.alert(
      'Дата рождения и вес',
      'Заполнять необязательно. Но без этих данных фильтрация в статистике по возрасту и весу будет недоступна.',
    );
  };

  const handleSaveDemographics = async () => {
    // Поле веса — обычный TextInput, и после тапа на "Сохранить" он
    // сам собой фокус не теряет: клавиатура оставалась открытой, а
    // курсор (мигающий "ползунок") — активным в поле, хотя ввод уже
    // закончен. Keyboard.dismiss() убирает клавиатуру и снимает фокус
    // с того поля, что было активно — курсор пропадает сразу по тапу
    // на кнопку, независимо от того, пройдёт ли сохранение проверку
    // ниже.
    Keyboard.dismiss();

    // Дата рождения — либо оба поля заданы, либо ни одного (нельзя
    // сохранить "только месяц" без года и наоборот, иначе возраст
    // посчитать невозможно).
    if ((birthYear === null) !== (birthMonth === null)) {
      Alert.alert('Дата рождения', 'Укажите и месяц, и год рождения.');
      return;
    }

    // Вес необязателен — пустое поле сохраняется как null, а не как
    // ошибка.
    const weight = weightInput === '' ? null : Number(weightInput);
    if (weight !== null && (Number.isNaN(weight) || weight < 20 || weight > 300)) {
      Alert.alert('Проверьте вес', 'Введите число от 20 до 300 (кг).');
      return;
    }

    setSavingDemographics(true);
    try {
      await saveProfileDemographics(user.uid, {birthYear, birthMonth, weight});
    } catch (error) {
      Alert.alert('Не удалось сохранить', String(error));
    } finally {
      setSavingDemographics(false);
    }
  };

  // Кнопка ремонта рейтинга — видна ТОЛЬКО мастер-аккаунту (тот же
  // флаг isMaster, что и у "Управление упражнениями"), поэтому на
  // обычных тестовых аккаунтах не появляется вообще. rebuilding
  // блокирует повторный тап, пока идёт пересборка (может занять
  // заметное время — читает всю историю рейтингов пользователя).
  const [rebuilding, setRebuilding] = useState(false);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const handleLogout = () => {
    Alert.alert('Выйти из аккаунта', 'Вы уверены?', [
      {text: 'Отмена', style: 'cancel'},
      {text: 'Выйти', style: 'destructive', onPress: logout},
    ]);
  };

const handleApplyUpdate = () => {
    Alert.alert(
      'Обновить приложение',
      'Обновление скачается и приложение перезапустится, чтобы его применить. Продолжить?',
      [
        {text: 'Отмена', style: 'cancel'},
        {
          text: 'Обновить',
          onPress: async () => {
            setApplyingUpdate(true);
            try {
              await applyUpdate();
            } catch (error) {
              setApplyingUpdate(false);
              Alert.alert('Не удалось скачать обновление', String(error));
            }
          },
        },
      ],
    );
  };
  // Полная пересборка бакетов рейтинга (день/неделя/месяц/год) из
  // истории — используется только как ремонт после сбоя данных, не
  // для повседневной работы. Поэтому запуск всегда идёт через
  // подтверждение, а не сразу по тапу.
  const handleRebuildRatings = () => {
    Alert.alert(
      'Пересчитать рейтинг',
      'Бакеты рейтинга будут полностью пересобраны заново из истории тренировок. Использовать только для ремонта данных. Продолжить?',
      [
        {text: 'Отмена', style: 'cancel'},
        {
          text: 'Пересчитать',
          style: 'destructive',
          onPress: async () => {
            setRebuilding(true);
            try {
              await rebuildAllBucketsFromHistory(user.uid);
              Alert.alert('Готово', 'Рейтинг пересчитан.');
            } catch (error) {
              Alert.alert('Ошибка пересчёта', String(error));
            } finally {
              setRebuilding(false);
            }
          },
        },
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

        {/* Дата рождения/вес — заполняются один раз, дальше
            используются для фильтра в Статистике (сравнение с людьми
            похожего возраста/веса). Всё необязательное. Возраст
            рядом с датой рождения — не отдельное поле, а просто
            результат calculateAge(), пересчитанный от сегодняшней
            даты при каждом открытии экрана. */}
        <View style={styles.demographicsSection}>
          <Text style={styles.demographicsTitle}>О себе</Text>

          {loadingDemographics ? (
            <Text style={styles.updatesStatusText}>Загрузка...</Text>
          ) : (
            <>
<View style={styles.labelRow}>
                <Text style={styles.demographicsLabel}>Возраст</Text>
                <TouchableOpacity
                  onPress={handleShowDemographicsInfo}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  testID="profile-demographics-info-button">
                  <Text style={styles.infoIcon}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.birthDateRow}>
                <TouchableOpacity
                  style={styles.birthDateButton}
                  onPress={() => setMonthPickerVisible(true)}
                  testID="profile-birth-month-button">
                  <Text style={styles.birthDateButtonText}>{monthLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.birthDateButton}
                  onPress={() => setYearPickerVisible(true)}
                  testID="profile-birth-year-button">
                  <Text style={styles.birthDateButtonText}>
                    {birthYear || 'Год'}
                  </Text>
                </TouchableOpacity>

                {age !== null ? (
                  <Text style={styles.ageText}>({age} лет)</Text>
                ) : null}
              </View>

              <Text style={styles.demographicsLabel}>Вес, кг</Text>
              <TextInput
                style={styles.demographicsInput}
                placeholder="—"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={handleChangeWeight}
                maxLength={6}
                testID="profile-weight-input"
              />

<TouchableOpacity
                style={styles.saveDemographicsButton}
                onPress={handleSaveDemographics}
                disabled={savingDemographics}
                testID="profile-save-demographics-button">
                {savingDemographics ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Text style={styles.saveDemographicsButtonText}>Сохранить</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <SimpleListPickerModal
          visible={monthPickerVisible}
          title="Месяц рождения"
          options={BIRTH_MONTHS}
          selectedValue={birthMonth}
          onSelect={setBirthMonth}
          onClose={() => setMonthPickerVisible(false)}
          columns={3}
        />

        <SimpleListPickerModal
          visible={yearPickerVisible}
          title="Год рождения"
          options={BIRTH_YEAR_OPTIONS}
          selectedValue={birthYear}
          onSelect={setBirthYear}
          onClose={() => setYearPickerVisible(false)}
          columns={4}
        />

        {isMaster ? (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setManagementVisible(true)}
            testID="profile-manage-exercises-button">
            <Text style={styles.manageButtonText}>Управление упражнениями</Text>
          </TouchableOpacity>
        ) : null}

        {isMaster ? (
          <TouchableOpacity
            style={[styles.rebuildButton, rebuilding && styles.rebuildButtonDisabled]}
            onPress={handleRebuildRatings}
            disabled={rebuilding}
            testID="profile-rebuild-ratings-button">
            <Text style={styles.rebuildButtonText}>
              {rebuilding ? 'Пересчитываю...' : 'Пересчитать рейтинг (ремонт)'}
            </Text>
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
              disabled={applyingUpdate}
              testID="profile-apply-update-button">
              {applyingUpdate ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.updateButtonText}>
                  Установить обновление
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.updatesStatusText}>У вас последняя версия</Text>
          )}
        </View>

        {/* Ниже обновлений и специально отдельно от остального —
            выше по экрану скоро появятся данные профиля (город,
            возраст и т.п.), а "Лицензии" — служебная/юридическая
            ссылка, ей место в самом низу списка, ближе к версии
            приложения. */}
        <TouchableOpacity
          style={styles.licensesButton}
          onPress={() => setLicensesVisible(true)}
          testID="profile-open-licenses-button">
          <Text style={styles.licensesButtonText}>Лицензии</Text>
        </TouchableOpacity>
      </View>

{/* Версия — отдельным элементом ПОСЛЕ основного контейнера
          (у него flex: 1, забирает всё доступное место), поэтому этот
          текст сам прижимается к самому низу экрана, а не болтается
          где-то в середине. */}
      <Text style={styles.versionText}>v {packageJson.version}</Text>

<Modal
        visible={managementVisible}
        animationType="slide"
        onRequestClose={() => setManagementVisible(false)}>
        <ExerciseManagementScreen
          onClose={() => setManagementVisible(false)}
        />
      </Modal>

      <Modal
        visible={licensesVisible}
        animationType="slide"
        onRequestClose={() => setLicensesVisible(false)}>
        <LicensesScreen onClose={() => setLicensesVisible(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
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
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    fontSize: 20,
    color: colors.danger,
    fontWeight: 'bold',
  },
  email: {...typography.body, color: colors.textSecondary, marginBottom: 30},

  demographicsSection: {marginBottom: 30},
  demographicsTitle: {...typography.label, color: colors.textMuted, marginBottom: 10},
demographicsLabel: {...typography.caption, fontSize: 13, color: colors.textSecondary},
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {fontSize: 20, color: colors.info},
  birthDateRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 16},
  birthDateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginRight: 10,
    backgroundColor: colors.background,
  },
  birthDateButtonText: {...typography.body, fontSize: 15, color: colors.textPrimary},
  // Возраст в скобках — результат calculateAge(), не отдельное
  // хранимое значение (см. комментарий у объявления age выше).
  ageText: {...typography.body, fontSize: 15, color: colors.textMuted},

  demographicsInput: {
    height: 44,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  saveDemographicsButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveDemographicsButtonDisabled: {opacity: 0.5},
  saveDemographicsButtonText: {...typography.button, fontSize: 15, color: colors.primary},

  manageButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  manageButtonText: {...typography.button, fontSize: 15, color: colors.primary},

  rebuildButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  rebuildButtonDisabled: {opacity: 0.5},
  rebuildButtonText: {...typography.button, fontSize: 15, color: colors.danger},

  // marginTop увеличен (было 12) — нужен заметный отступ "в две
  // строки" от блока обновлений, чтобы "Лицензии" выглядела отдельным,
  // самым нижним пунктом. alignItems не задаём (по умолчанию — как у
  // остального текста на экране: прижато к левому краю, а не по
  // центру).
  licensesButton: {marginTop: 40},
  licensesButtonText: {...typography.caption, fontSize: 13, color: colors.textMuted},

  updatesSection: {marginTop: 30},  
  updatesTitle: {...typography.label, color: colors.textMuted, marginBottom: 10},
  updatesStatusText: {...typography.caption, fontSize: 14, color: colors.textPlaceholder},
  updateButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
updateButtonText: {...typography.button, fontSize: 15, color: colors.white},

  versionText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textPlaceholder,
    textAlign: 'center',
    paddingVertical: 12,
  },
});