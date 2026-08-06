import React, {useState, useEffect, useMemo, useRef} from 'react';
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
import {getCountryOptions, getCityOptions, getCountryLabel} from '../utils/location';
import SimpleListPickerModal from '../components/SimpleListPickerModal';
import SearchableListPickerModal from '../components/SearchableListPickerModal';
import colors from '../theme/colors';
import typography from '../theme/typography';
import packageJson from '../../package.json';
import DeleteAccountModal from '../components/DeleteAccountModal';


const BIRTH_YEAR_OPTIONS = getBirthYearOptions();
// Страны не меняются во время работы экрана (в отличие от списка
// городов, который зависит от выбранной страны) — считаем один раз на
// модуль, как и BIRTH_YEAR_OPTIONS выше.
const COUNTRY_OPTIONS = getCountryOptions();


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

  // Страна — код ISO2 ("RU") или null, если ещё не выбрана. Город —
  // само название строкой (см. src/utils/location.js, почему без
  // отдельного id) или null. Поле "Город" в разметке ниже показывается
  // только когда countryCode уже выбран — выбор города вне контекста
  // страны не имеет смысла (один и тот же список городов не может
  // одновременно относиться ко всем странам).
  const [countryCode, setCountryCode] = useState(null);
  const [city, setCity] = useState(null);
const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [cityPickerVisible, setCityPickerVisible] = useState(false);

  const [loadingDemographics, setLoadingDemographics] = useState(true);
  const [savingDemographics, setSavingDemographics] = useState(false);
const [savedSnapshot, setSavedSnapshot] = useState(null);

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
          setCountryCode(data.countryCode);
          setCity(data.city);
        }
        setSavedSnapshot({
  birthYear: data.birthYear,
  birthMonth: data.birthMonth,
  weight: data.weight,
  countryCode: data.countryCode,
  city: data.city,
});
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

  const currentWeight = weightInput === '' ? null : Number(weightInput);
const isDirty = Boolean(
  savedSnapshot &&
    (birthYear !== savedSnapshot.birthYear ||
      birthMonth !== savedSnapshot.birthMonth ||
      currentWeight !== savedSnapshot.weight ||
      countryCode !== savedSnapshot.countryCode ||
      city !== savedSnapshot.city),
);

  const age = calculateAge(birthYear, birthMonth);
  const monthLabel = birthMonth
    ? BIRTH_MONTHS.find(item => item.value === birthMonth).label
    : 'Месяц';

  // Список городов пересчитывается только когда меняется страна (а не
  // на каждый рендер) — сам список для этой страны не меняется, пока
  // не сменили страну.
  const cityOptions = useMemo(() => getCityOptions(countryCode), [countryCode]);

  const countryLabel = countryCode ? getCountryLabel(countryCode) || countryCode : 'Страна';
  const cityLabel = city || 'Город';

  // Смена страны сбрасывает выбранный город: он относится к конкретной
  // стране (список городов приходит из getCityOptions(countryCode)),
  // и после смены страны прежнее значение почти наверняка не входит в
  // новый список — оставлять его нельзя, иначе город "потеряется" из
  // вида, но останется висеть в состоянии.
  const handleSelectCountry = value => {
    setCountryCode(value);
    setCity(null);
  };

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
      await saveProfileDemographics(user.uid, {birthYear, birthMonth, weight, countryCode, city});
      // Без этого savedSnapshot оставался бы от момента открытия экрана,
      // и кнопка "Сохранить" считала бы себя нужной вечно, даже сразу
      // после успешного сохранения — isDirty сравнивает поля именно с
      // savedSnapshot, а не с тем, что реально лежит в Firestore.
      setSavedSnapshot({birthYear, birthMonth, weight, countryCode, city});
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
  // Модалка подтверждения удаления аккаунта — открывается по кнопке
  // "Удалить аккаунт" ниже в разметке.
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
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

<Text style={styles.locationLabel}>Страна</Text>
              <TouchableOpacity
style={styles.locationButton}
                onPress={() => setCountryPickerVisible(true)}
                testID="profile-country-button">
                <Text style={styles.locationButtonText}>{countryLabel}</Text>
              </TouchableOpacity>

              {/* Поле "Город" показывается только после выбора страны —
                  см. комментарий у состояния countryCode/city выше. */}
              {countryCode ? (
                <>
<Text style={styles.locationLabel}>Город</Text>
                  <TouchableOpacity
    style={styles.locationButton}
                    onPress={() => setCityPickerVisible(true)}
                    testID="profile-city-button">
                    <Text style={styles.locationButtonText}>{cityLabel}</Text>
                  </TouchableOpacity>
                </>
              ) : null}

{isDirty ? (
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
              ) : null}
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

<SearchableListPickerModal
          visible={countryPickerVisible}
          title="Страна"
          options={COUNTRY_OPTIONS}
          selectedValue={countryCode}
          onSelect={handleSelectCountry}
          onClose={() => setCountryPickerVisible(false)}
          searchPlaceholder="Например, Россия"
          testIDPrefix="profile-country-picker"   
           />

        <SearchableListPickerModal
          visible={cityPickerVisible}
          title="Город"
          options={cityOptions}
          selectedValue={city}
          onSelect={setCity}
          onClose={() => setCityPickerVisible(false)}
          searchPlaceholder="Например, Москва"
          testIDPrefix="profile-city-picker"
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

    {(checking || updateAvailable) ? (
          <View style={styles.updatesSection}>
            <Text style={styles.updatesTitle}>Обновления</Text>

            {checking ? (
              <Text style={styles.updatesStatusText}>Проверка обновлений...</Text>
            ) : (
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
            )}
          </View>
        ) : null}

        {/* Удаление аккаунта — сам запрос пароля и подтверждение живут
            в DeleteAccountModal ниже, тут только кнопка-триггер. */}
        <TouchableOpacity
          onPress={() => setDeleteModalVisible(true)}
          testID="profile-delete-account-button">
          <Text style={styles.deleteAccountText}>Удалить аккаунт</Text>
        </TouchableOpacity>

      </View>

      {/* Нижняя строка экрана: версия по центру, значок "ⓘ" (тот же
          стиль, что у "Возраст"/"Рейтинг всех пользователей", открывает
          "Лицензии") — в правом углу. Значок стоит "поверх" строки
          через position: absolute, чтобы не толкать текст версии в
          сторону и не мешать ему быть строго по центру. Строка вне
          основного контейнера (у него flex: 1, забирает всё доступное
          место), поэтому сама прижимается к самому низу экрана. */}
      <View style={styles.bottomInfoRow}>
        <Text style={styles.versionText}>v {packageJson.version}</Text>
        <TouchableOpacity
          style={styles.licensesInfoButton}
          onPress={() => setLicensesVisible(true)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          testID="profile-open-licenses-button">
          <Text style={styles.infoIcon}>ⓘ</Text>
        </TouchableOpacity>
      </View>

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

      {/* Не через RN <Modal> — DeleteAccountModal сам рисует затемнение
          на весь экран (position: absolute), когда visible === true, и
          ничего не рендерит, когда false. */}
      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onDeleted={() => {
          setDeleteModalVisible(false);
          // Дальше ничего делать не нужно: App.js подписан на
          // subscribeToAuthState (см. src/services/auth.js) и сам
          // покажет экран входа, как только увидит, что пользователя
          // больше нет — после user.delete() внутри deleteAccountAndData.
        }}
      />
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
locationLabel: {...typography.caption, fontSize: 13, color: colors.textSecondary, marginBottom: 6},
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
  // Кнопка полей "Страна"/"Город" — тот же стиль рамки, что и у
  // birthDateButton, но на всю ширину (названия стран/городов длиннее
  // короткого "Месяц"/"Год", подгонять под них ширину смысла нет).
  locationButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: colors.background,
  },
  locationButtonText: {...typography.body, fontSize: 15, color: colors.textPrimary},

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

  // Значок "ⓘ" стоит через position: absolute поверх этой строки — так
  // он не участвует в потоке разметки и не сдвигает текст версии,
  // который остаётся ровно по центру всей ширины экрана.
  bottomInfoRow: {
    minHeight: 40,
    justifyContent: 'center',
  },
  licensesInfoButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
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
  },
  deleteAccountText: {
    ...typography.button,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 24,
  },
});