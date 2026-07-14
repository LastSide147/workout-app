import React, {useEffect, useState} from 'react';
import {ScrollView, View, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ensureSignedIn} from '../services/firebase';
import DayEditor from '../components/DayEditor';
import {getDateKey} from '../utils/date';
import colors from '../theme/colors';

const todayKey = getDateKey(new Date());

export default function WorkoutLogScreen() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    ensureSignedIn().then(setUserId);
  }, []);

  if (!userId) {
    return <View style={styles.safeArea} />;
  }

  return (
    // SafeAreaView вместо фиксированного paddingTop — раньше отступ
    // сверху был подобран "на глаз" и на части устройств дата всё
    // равно оказывалась под системной областью (батарея, время,
    // вырез камеры). SafeAreaView сам знает реальный размер этой
    // области на конкретном телефоне.
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <DayEditor userId={userId} dateKey={todayKey} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  container: {flex: 1, padding: 16, paddingTop: 8},
});