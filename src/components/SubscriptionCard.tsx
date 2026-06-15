import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Subscription } from '../types';
import ToggleSwitch from './ToggleSwitch';
import { colors, spacing, radius, fontSize } from '../theme';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  subscription: Subscription;
  onToggle: (id: string, active: boolean) => void;
  onPress: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export default function SubscriptionCard({ subscription, onToggle, onPress, onDelete }: Props) {
  const { name, cost, billingDay, billingMonth, billingCycle, active } = subscription;

  const monthlyEquivalent =
    billingCycle === 'quarterly' ? cost / 3 :
    billingCycle === 'annual' ? cost / 12 :
    null;

  const cycleSuffix =
    billingCycle === 'quarterly' ? '/qtr' :
    billingCycle === 'annual' ? '/yr' :
    '/mo';

  const metaText =
    billingCycle === 'monthly'
      ? `Monthly · Day ${billingDay}`
      : billingCycle === 'quarterly'
      ? `Quarterly · ${MONTHS[(billingMonth ?? 1) - 1]} ${billingDay}`
      : `Annual · ${MONTHS[(billingMonth ?? 1) - 1]} ${billingDay}`;

  return (
    <View style={[styles.card, !active && styles.paused]}>
      {/* Tappable body — edit */}
      <TouchableOpacity style={styles.body} onPress={() => onPress(subscription)} activeOpacity={0.7}>
        <View style={styles.left}>
          <Text style={[styles.name, !active && styles.mutedText]}>{name}</Text>
          <Text style={styles.meta}>{metaText}</Text>
          {monthlyEquivalent !== null && (
            <Text style={styles.monthlyEq}>${monthlyEquivalent.toFixed(2)}/mo</Text>
          )}
        </View>
        <Text style={[styles.cost, !active && styles.mutedText]}>
          ${cost.toFixed(2)}
          <Text style={styles.cycle}>{cycleSuffix}</Text>
        </Text>
      </TouchableOpacity>

      {/* Actions — siblings of body, not nested inside it */}
      <View style={styles.actions}>
        <ToggleSwitch value={active} onToggle={(val) => onToggle(subscription.id, val)} />
        <TouchableOpacity onPress={() => onDelete(subscription.id)} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  paused: { opacity: 0.5 },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  left: { flex: 1, gap: 3 },
  name: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  monthlyEq: { fontSize: fontSize.xs, color: colors.textDim },
  cost: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700' },
  cycle: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '400' },
  mutedText: { color: colors.textDim },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
  },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: colors.textDim, fontSize: fontSize.sm },
});
