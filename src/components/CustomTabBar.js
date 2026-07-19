import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons, AntDesign} from '@expo/vector-icons';
import colors from '../theme/colors';

const TAB_ICONS = {
  Log: {component: AntDesign, active: 'fire', inactive: 'fire'},
  History: {component: Ionicons, active: 'calendar', inactive: 'calendar-outline'},
  Statistics: {component: Ionicons, active: 'stats-chart', inactive: 'stats-chart-outline'},
  Profile: {component: Ionicons, active: 'person-circle', inactive: 'person-circle-outline'},
};

const ICON_SIZE_INACTIVE = 22;
const ICON_SIZE_ACTIVE = 30;
// Минимальный отступ снизу — на случай если система вернула 0 (старая
// кнопочная навигация, где системная зона не накладывается на
// контент). Верхнего предела больше нет: у разных производителей
// (Samsung, Google и т.д.) реальный размер жестовой зоны снизу
// отличается на разных экранах — код должен брать то, что сообщает
// конкретный телефон, а не число, подобранное под пару тестовых
// устройств.
const MIN_BOTTOM_INSET = 6;

function TabButton({routeName, label, isFocused, onPress}) {
  const icons = TAB_ICONS[routeName] || TAB_ICONS.Log;
  const IconComponent = icons.component;
  const iconName = isFocused ? icons.active : icons.inactive;
  const tintColor = isFocused ? colors.tabBarAccent : colors.textMuted;

  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`tab-bar-button-${routeName}`}>
      <IconComponent
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
  const bottomPadding = Math.max(insets.bottom, MIN_BOTTOM_INSET);

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