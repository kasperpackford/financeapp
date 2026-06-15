import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import { SavingsTracker } from '../types';
import ProgressBar from '../components/ProgressBar';
import { colors, spacing, radius, fontSize } from '../theme';

const DEFAULT_TRACKER: SavingsTracker = {
  tfsaBalance: 0,
  monthlyContribution: 0,
  returnRate: 5,
};

const PROJECTION_YEARS = [1, 5, 10, 20, 30];

function compoundGrowth(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal + monthlyContribution * n;
  const grown = principal * Math.pow(1 + r, n);
  const contributions = monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
  return grown + contributions;
}

function formatLarge(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function SavingsScreen() {
  const { data: rawTracker, save, reload } = useAsyncStorage<SavingsTracker | null>('savingsTracker', DEFAULT_TRACKER);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const tracker = rawTracker ?? DEFAULT_TRACKER;

  const [localBalance, setLocalBalance] = useState('');
  const [localContrib, setLocalContrib] = useState('');
  const [localRate, setLocalRate] = useState('');

  const balance = parseFloat(localBalance) || tracker.tfsaBalance;
  const contribution = parseFloat(localContrib) || tracker.monthlyContribution;
  const rate = parseFloat(localRate) !== undefined && localRate !== '' ? parseFloat(localRate) : tracker.returnRate;

  const projections = useMemo(
    () =>
      PROJECTION_YEARS.map((y) => ({
        years: y,
        value: compoundGrowth(tracker.tfsaBalance, tracker.monthlyContribution, tracker.returnRate, y),
      })),
    [tracker]
  );

  function handleBlur() {
    const updates: Partial<SavingsTracker> = {};
    const b = parseFloat(localBalance);
    const c = parseFloat(localContrib);
    const r = parseFloat(localRate);
    if (localBalance !== '' && !isNaN(b)) updates.tfsaBalance = b;
    if (localContrib !== '' && !isNaN(c)) updates.monthlyContribution = c;
    if (localRate !== '' && !isNaN(r)) updates.returnRate = r;
    if (Object.keys(updates).length > 0) {
      save({ ...tracker, ...updates });
      setLocalBalance('');
      setLocalContrib('');
      setLocalRate('');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>TFSA Savings</Text>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Current Balance</Text>
            <TextInput
              style={styles.bigInput}
              value={localBalance !== '' ? localBalance : tracker.tfsaBalance > 0 ? tracker.tfsaBalance.toString() : ''}
              onChangeText={setLocalBalance}
              onBlur={handleBlur}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={colors.textDim}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Monthly Contribution</Text>
            <TextInput
              style={styles.bigInput}
              value={localContrib !== '' ? localContrib : tracker.monthlyContribution > 0 ? tracker.monthlyContribution.toString() : ''}
              onChangeText={setLocalContrib}
              onBlur={handleBlur}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={colors.textDim}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.rateRow}>
              <Text style={styles.sectionLabel}>Annual Return Rate</Text>
              <Text style={styles.rateDisplay}>{tracker.returnRate}%</Text>
            </View>
            <TextInput
              style={styles.input}
              value={localRate !== '' ? localRate : tracker.returnRate.toString()}
              onChangeText={setLocalRate}
              onBlur={handleBlur}
              keyboardType="decimal-pad"
              placeholder="5"
              placeholderTextColor={colors.textDim}
            />
            <View style={styles.ratePresets}>
              {[3, 5, 7, 10].map((r) => (
                <Text
                  key={r}
                  onPress={() => {
                    save({ ...tracker, returnRate: r });
                    setLocalRate('');
                  }}
                  style={[styles.preset, tracker.returnRate === r && styles.presetActive]}
                >
                  {r}%
                </Text>
              ))}
            </View>
          </View>

          <Text style={styles.projectionTitle}>Growth Projection</Text>

          {projections.map(({ years, value }, i) => {
            const maxValue = projections[projections.length - 1].value;
            const progress = maxValue > 0 ? value / maxValue : 0;
            return (
              <View key={years} style={styles.projRow}>
                <Text style={styles.projLabel}>{years}yr</Text>
                <View style={styles.projBar}>
                  <ProgressBar progress={progress} color={colors.success} height={8} />
                </View>
                <Text style={styles.projValue}>{formatLarge(value)}</Text>
              </View>
            );
          })}

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Projections assume monthly compounding and constant contributions. Past returns do not guarantee future results.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  title: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700', marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500' },
  bigInput: {
    fontSize: fontSize.xxl,
    color: colors.text,
    fontWeight: '700',
    padding: 0,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateDisplay: { fontSize: fontSize.xl, color: colors.primary, fontWeight: '700' },
  ratePresets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '500',
    backgroundColor: colors.surfaceAlt,
  },
  presetActive: { borderColor: colors.primary, color: colors.primary, backgroundColor: colors.primaryDim },
  projectionTitle: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  projRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  projLabel: { width: 32, fontSize: fontSize.sm, color: colors.textMuted },
  projBar: { flex: 1 },
  projValue: { width: 72, fontSize: fontSize.sm, color: colors.text, fontWeight: '600', textAlign: 'right' },
  disclaimer: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: { fontSize: fontSize.xs, color: colors.textDim, lineHeight: 16 },
});
