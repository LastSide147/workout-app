import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {ensureSignedIn} from '../services/firebase';
import DayEditor from '../components/DayEditor';
import {getDateKey} from '../utils/date';

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
    <View style={styles.container}>
      <DayEditor userId={userId} dateKey={todayKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, paddingTop: 32, backgroundColor: '#fff'},
});