import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {ensureSignedIn} from '../services/firebase';
import DayEditor from '../components/DayEditor';
import ScreenContainer from '../components/ScreenContainer';
import {getDateKey} from '../utils/date';
import colors from '../theme/colors';

const todayKey = getDateKey(new Date());

export default function WorkoutLogScreen() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    ensureSignedIn().then(setUserId);
  }, []);

  if (!userId) {
    return <View style={{flex: 1, backgroundColor: colors.background}} />;
  }

  return (
    <ScreenContainer>
      <DayEditor userId={userId} dateKey={todayKey} />
    </ScreenContainer>
  );
}