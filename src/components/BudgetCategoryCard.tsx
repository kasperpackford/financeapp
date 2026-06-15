import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BudgetCategory } from '../types';
import { colors, spacing, radius, fontSize } from '../theme';

interface Props {
  category: BudgetCategory;
  onPress: (category: BudgetCategory) => void;
  onDelete: (id: string) => void;
}

export default function BudgetCategoryCard({ category, onPress, onDelete }: Props) {
  const { name, monthlyLimit } = category;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.body} onPress={() => onPress(category)} activeOpacity={0.7}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.limit}>
          ${monthlyLimit.toFixed(2)}
          <Text style={styles.limitSuffix}>/mo</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onDelete(category.id)} style={styles.deleteBtn}>
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
  },
  name: { fontSize: fontSize.md, color: colors.text, fontWeight: '600', flex: 1 },
  limit: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700' },
  limitSuffix: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '400' },
  deleteBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: colors.textDim, fontSize: fontSize.sm },
});
