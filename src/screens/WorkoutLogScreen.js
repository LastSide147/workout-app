import React, {useEffect, useState} from 'react';
import {ScrollView, View, StyleSheet} from 'react-native';
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
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <DayEditor userId={userId} dateKey={todayKey} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 32, backgroundColor: colors.background},
});