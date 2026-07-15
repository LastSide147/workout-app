import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import colors from '../theme/colors';

// Общая "рамка" для экранов вкладок (Тренировка/История/Статистика).
// Раньше каждый экран сам решал, какой отступ сверху поставить, и
// число подбиралось на глаз — из-за этого заголовки то вылезали под
// системную область (батарея, время, вырез камеры), то были видны
// нормально, в зависимости от конкретного телефона. Теперь это в
// одном месте: SafeAreaView берёт РЕАЛЬНЫЙ отступ конкретного
// устройства, а не подобранное число — значит заголовок никогда не
// окажется выше выреза камеры и не будет упираться в системную
// шторку, на любом телефоне.
//
// Если понадобится поменять общий отступ/фон сразу для ВСЕХ экранов —
// меняется только этот файл, а не каждый экран по отдельности.
export default function ScreenContainer({children, scroll = true, style}) {
  const Content = scroll ? ScrollView : View;
  const contentProps = scroll ? {showsVerticalScrollIndicator: false} : {};

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Content style={[styles.container, style]} {...contentProps}>
        {children}
      </Content>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: colors.background},
  container: {flex: 1, padding: 16, paddingTop: 8},
});