import React from 'react';
import {View, Text, TouchableOpacity, Modal, StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';

// Поздравительное окно за полностью заполненную неделю. Когда именно
// его показывать (и начислять ли баллы) решает хук useWeeklyBonus —
// этот компонент только отображает результат.
export default function WeeklyBonusModal({visible, points, onClose}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card} testID="weekly-bonus-modal">
          <View style={styles.iconCircle}>
            <Ionicons name="trophy" size={32} color={colors.gold} />
          </View>

          <Text style={styles.title}>Неделя закрыта!</Text>
          <Text style={styles.text}>
            Вы заполнили все дни текущей недели. К общему рейтингу начислено{' '}
            <Text style={styles.points}>{points} баллов</Text>.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            testID="weekly-bonus-modal-close">
            <Text style={styles.buttonText}>Отлично</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },
  points: {color: colors.gold, fontWeight: 'bold'},
  button: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  buttonText: {...typography.button, color: colors.white},
});