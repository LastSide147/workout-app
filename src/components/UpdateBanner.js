import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useUpdatesContext} from '../context/UpdatesContext';

export default function UpdateBanner() {
  const {showBanner, dismiss} = useUpdatesContext();

  if (!showBanner) {
    return null;
  }

  return (
    <View style={styles.banner} testID="update-banner">
      <Text style={styles.text}>
        Доступно обновление приложения. Установите его в разделе «Профиль».
      </Text>
      <TouchableOpacity
        onPress={dismiss}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        testID="update-banner-dismiss">
        <Text style={styles.dismissIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {color: '#fff', fontSize: 13, flex: 1, marginRight: 12},
  dismissIcon: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});