import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import colors from '../theme/colors';

const TAB_ICONS = {
  Log: {active: 'barbell', inactive: 'barbell-outline'},
  History: {active: 'calendar', inactive: 'calendar-outline'},
  Statistics: {active: 'stats-chart', inactive: 'stats-chart-outline'},
  Profile: {active: 'person-circle', inactive: 'person-circle-outline'},
};

const ICON_SIZE_INACTIVE = 22;
const ICON_SIZE_ACTIVE = 30;
// Отступ снизу под системную зону (жест/навигация) — берём реальный
// insets.bottom, но не больше этого значения, чтобы на телефонах с
// большим системным отступом панель не раздувалась пустым местом
const MAX_BOTTOM_INSET = 12;

function TabButton({routeName, label, isFocused, onPress}) {
  const icons = TAB_ICONS[routeName] || TAB_ICONS.Log;
  const iconName = isFocused ? icons.active : icons.inactive;
  const tintColor = isFocused ? colors.tabBarAccent : colors.textMuted;

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`tab-bar-button-${routeName}`}>
      <Ionicons
        name={iconName}
        size={isFocused ? ICON_SIZE_ACTIVE : ICON_SIZE_INACTIVE}
        color={tintColor}
      />
      <Text style={[styles.label, {color: tintColor}]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({state, descriptors, navigation}) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.min(insets.bottom, MAX_BOTTOM_INSET) || 6;

  return (
    <View style={[styles.container, {paddingBottom: bottomPadding}]}>
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
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});