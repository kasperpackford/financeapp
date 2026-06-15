import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SavingsGoal } from '../types';
import ProgressBar from './ProgressBar';
import { colors, spacing, radius, fontSize } from '../theme';

interface Props {
  goal: SavingsGoal;
  onPress: (goal: SavingsGoal) => void;
  onDelete: (id: string) => void;
}

export default function GoalCard({ goal, onPress, onDelete }: Props) {
  const { name, targetAmount, monthlyContribution, currentAmount } = goal;
  const progress = targetAmount > 0 ? currentAmount / targetAmount : 0;
  const remaining = targetAmount - currentAmount;
  const monthsLeft =
    monthlyContribution > 0 && remaining > 0
      ? Math.ceil(remaining / monthlyContribution)
      : null;

  return (
    <View style={styles.card}>
      {/* Multi-line body — tappable for edit */}
      <TouchableOpacity style={styles.body} onPress={() => onPress(goal)} activeOpacity={0.7}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.amounts}>
            ${currentAmount.toFixed(0)} / ${targetAmount.toFixed(0)}
          </Text>
        </View>
        <ProgressBar progress={progress} color={progress >= 1 ? colors.success : colors.primary} />
        <View style={styles.footer}>
          <Text style={styles.contribution}>+${monthlyContribution.toFixed(0)}/mo</Text>
          {monthsLeft !== null ? (
            <Text style={styles.eta}>{monthsLeft} mo remaining</Text>
          ) : progress >= 1 ? (
            <Text style={[styles.eta, { color: colors.success }]}>Complete!</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Delete — sibling of body, separated by a subtle divider */}
      <TouchableOpacity onPress={() => onDelete(goal.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { fontSize: fontSize.md, color: colors.text, fontWeight: '600', flex: 1 },
  amounts: { fontSize: fontSize.sm, color: colors.textMuted },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  contribution: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '500' },
  eta: { fontSize: fontSize.sm, color: colors.textMuted },
  deleteBtn: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  deleteText: { color: colors.textDim, fontSize: fontSize.sm },
});
