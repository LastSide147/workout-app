import React, {useEffect, useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import colors from '../theme/colors';

// Для каждой вкладки — два варианта иконки: "outline" для неактивного
// состояния и "заполненный" для активного. У Ionicons почти все иконки
// имеют такую пару, это стандартный приём, чтобы активная вкладка
// выглядела заметнее без лишних цветовых эффектов.
const TAB_ICONS = {
  Log: {active: 'barbell', inactive: 'barbell-outline'},
  History: {active: 'calendar', inactive: 'calendar-outline'},
  Statistics: {active: 'stats-chart', inactive: 'stats-chart-outline'},
  Profile: {active: 'person-circle', inactive: 'person-circle-outline'},
};

// Одна кнопка таб-бара. progress (0 → 1) анимированно "перетекает"
// при смене активной вкладки и управляет сразу тремя вещами:
// масштабом иконки, её сдвигом вверх и прозрачностью подписи —
// поэтому всё двигается синхронно, одной пружиной.
function TabButton({routeName, label, isFocused, onPress, tabWidth}) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 14,
      stiffness: 180,
    });
  }, [isFocused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: 1 + progress.value * 0.15},
      {translateY: progress.value * -4},
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const icons = TAB_ICONS[routeName] || TAB_ICONS.Log;
  const iconName = isFocused ? icons.active : icons.inactive;

  return (
    <TouchableOpacity
      style={[styles.tabButton, {width: tabWidth}]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`tab-bar-button-${routeName}`}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={iconName}
          size={24}
          color={isFocused ? colors.primary : colors.textMuted}
        />
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// Кастомный таб-бар вместо стандартного из @react-navigation/bottom-tabs.
// Подключается через проп tabBar у Tab.Navigator (см. App.js) —
// React Navigation сам передаёт state/descriptors/navigation, наш
// компонент отвечает только за то, как это нарисовать и анимировать.
export default function CustomTabBar({state, descriptors, navigation}) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = state.routes.length > 0 ? barWidth / state.routes.length : 0;

  // Позиция скользящей полоски-индикатора под активной вкладкой.
  const indicatorPosition = useSharedValue(0);

  useEffect(() => {
    if (tabWidth > 0) {
      indicatorPosition.value = withSpring(state.index * tabWidth, {
        damping: 16,
        stiffness: 160,
      });
    }
  }, [state.index, tabWidth, indicatorPosition]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{translateX: indicatorPosition.value}],
    width: tabWidth,
  }));

  return (
    <View
      style={[styles.container, {paddingBottom: insets.bottom || 8}]}
      onLayout={event => setBarWidth(event.nativeEvent.layout.width)}>
      {tabWidth > 0 ? (
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <View style={styles.indicatorDot} />
        </Animated.View>
      ) : null}

      {state.routes.map((route, index) => {
        const {options} = descriptors[route.key];
        const label = options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TabButton
            key={route.key}
            routeName={route.name}
            label={label}
            isFocused={isFocused}
            onPress={onPress}
            tabWidth={tabWidth}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    alignItems: 'center',
  },
  indicatorDot: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
