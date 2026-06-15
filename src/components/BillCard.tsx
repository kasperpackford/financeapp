import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bill } from '../types';
import { colors, spacing, radius, fontSize } from '../theme';

interface Props {
  bill: Bill;
  onPress: (bill: Bill) => void;
  onDelete: (id: string) => void;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export default function BillCard({ bill, onPress, onDelete }: Props) {
  const { name, amount, dueDate, recurring } = bill;
  const days = daysUntil(dueDate);
  const overdue = days < 0;
  const soon = days >= 0 && days <= 5;
  const urgencyColor = overdue ? colors.danger : soon ? colors.warning : colors.textMuted;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.body} onPress={() => onPress(bill)} activeOpacity={0.7}>
        <View style={styles.left}>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.dueLabel, { color: urgencyColor }]}>
              {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `Due in ${days}d`}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.date}>{formatDate(dueDate)}</Text>
            {recurring && <Text style={styles.recurringBadge}>↻</Text>}
          </View>
        </View>
        <Text style={styles.amount}>${amount.toFixed(2)}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onDelete(bill.id)} style={styles.deleteBtn}>
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
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
  },
  left: { flex: 1, gap: 4 },
  name: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueLabel: { fontSize: fontSize.sm, fontWeight: '500' },
  dot: { color: colors.textDim, fontSize: fontSize.sm },
  date: { fontSize: fontSize.sm, color: colors.textMuted },
  recurringBadge: { color: colors.primary, fontSize: fontSize.sm },
  amount: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700' },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: colors.textDim, fontSize: fontSize.sm },
});
