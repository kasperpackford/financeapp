import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import { Subscription, Bill, BudgetCategory, SavingsGoal, Paycheck, AppSettings } from '../types';
import { colors, spacing, radius, fontSize } from '../theme';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function nextBillingDate(sub: Subscription): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sub.billingCycle === 'monthly') {
    const candidate = new Date(today.getFullYear(), today.getMonth(), sub.billingDay);
    if (candidate <= today) {
      return new Date(today.getFullYear(), today.getMonth() + 1, sub.billingDay).toISOString().slice(0, 10);
    }
    return candidate.toISOString().slice(0, 10);
  }

  if (sub.billingCycle === 'quarterly') {
    const startMonth = (sub.billingMonth ?? 1) - 1;
    const quarterMonths = [0, 3, 6, 9].map(o => (startMonth + o) % 12);
    for (let ahead = 0; ahead <= 12; ahead++) {
      const d = new Date(today.getFullYear(), today.getMonth() + ahead, sub.billingDay);
      if (quarterMonths.includes(d.getMonth()) && d > today) {
        return d.toISOString().slice(0, 10);
      }
    }
    return new Date(today.getFullYear(), today.getMonth() + 3, sub.billingDay).toISOString().slice(0, 10);
  }

  // annual
  const month = (sub.billingMonth ?? 1) - 1;
  const thisYear = new Date(today.getFullYear(), month, sub.billingDay);
  if (thisYear > today) return thisYear.toISOString().slice(0, 10);
  return new Date(today.getFullYear() + 1, month, sub.billingDay).toISOString().slice(0, 10);
}

function fmt(n: number): string {
  return n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEFAULT_SETTINGS: AppSettings = { payFrequency: 'biweekly' };

const FREQ_MULTIPLIERS: Record<AppSettings['payFrequency'], number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

const FREQ_LABELS: Record<AppSettings['payFrequency'], string> = {
  weekly: 'weekly',
  biweekly: 'biweekly',
  semimonthly: 'semi-monthly',
  monthly: 'monthly',
};

interface UpcomingPayment {
  name: string;
  amount: number;
  daysUntil: number;
  dateLabel: string;
  type: 'subscription' | 'bill';
}

export default function DashboardScreen({ navigation }: { navigation: { navigate: (s: string) => void } }) {
  const { data: paychecks, save: savePaychecks } = useAsyncStorage<Paycheck[]>('paychecks', []);
  const { data: subscriptions } = useAsyncStorage<Subscription[]>('subscriptions', []);
  const { data: bills } = useAsyncStorage<Bill[]>('bills', []);
  const { data: budgetCategories } = useAsyncStorage<BudgetCategory[]>('budgetCategories', []);
  const { data: savingsGoals } = useAsyncStorage<SavingsGoal[]>('savingsGoals', []);
  const { data: settings } = useAsyncStorage<AppSettings>('appSettings', DEFAULT_SETTINGS);

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  // ── Paycheck calculations ──────────────────────────────────────────────────
  const sortedPaychecks = useMemo(() => {
    const indexed: [Paycheck, number][] = paychecks.map((p, i) => [p, i]);
    indexed.sort(([a, ai], [b, bi]) => {
      const d = b.date.localeCompare(a.date);
      return d !== 0 ? d : bi - ai; // same date → most recently logged wins
    });
    return indexed.map(([p]) => p);
  }, [paychecks]);

  const displayedLog = sortedPaychecks.slice(0, 8);
  const lastPaycheck = sortedPaychecks[0]?.amount ?? 0;
  const last4 = sortedPaychecks.slice(0, 4);
  const avgLast4 = last4.length > 0 ? last4.reduce((s, p) => s + p.amount, 0) / last4.length : 0;

  const multiplier = FREQ_MULTIPLIERS[settings.payFrequency];
  const projectedMonthly = avgLast4 * multiplier;
  const projectedSubLabel = `avg × ${multiplier.toFixed(2)} · ${FREQ_LABELS[settings.payFrequency]}`;

  // ── Committed spend calculations ───────────────────────────────────────────
  const subsTotal = useMemo(
    () =>
      subscriptions
        .filter((s) => s.active)
        .reduce((sum, s) => {
          if (s.billingCycle === 'quarterly') return sum + s.cost / 3;
          if (s.billingCycle === 'annual') return sum + s.cost / 12;
          return sum + s.cost;
        }, 0),
    [subscriptions]
  );

  const billsThisMonth = useMemo(() => {
    const now = new Date();
    return bills
      .filter((b) => {
        const d = new Date(b.dueDate);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  const spendingTotal = useMemo(
    () => budgetCategories.reduce((sum, c) => sum + c.monthlyLimit, 0),
    [budgetCategories]
  );

  const goalsTotal = useMemo(
    () => savingsGoals.reduce((sum, g) => sum + g.monthlyContribution, 0),
    [savingsGoals]
  );

  const totalCommitted = subsTotal + billsThisMonth + spendingTotal + goalsTotal;
  const remaining = projectedMonthly - totalCommitted;
  const remainingColor =
    remaining > 0 ? colors.success : remaining < 0 ? colors.danger : colors.textMuted;

  // ── Upcoming payments ──────────────────────────────────────────────────────
  const upcomingPayments: UpcomingPayment[] = useMemo(() => {
    const payments: UpcomingPayment[] = [];
    subscriptions
      .filter((s) => s.active)
      .forEach((s) => {
        const dateStr = nextBillingDate(s);
        payments.push({
          name: s.name,
          amount: s.cost,
          daysUntil: daysUntilDate(dateStr),
          dateLabel: formatDateLabel(dateStr),
          type: 'subscription',
        });
      });
    bills.forEach((b) => {
      const days = daysUntilDate(b.dueDate);
      if (days >= 0) {
        payments.push({
          name: b.name,
          amount: b.amount,
          daysUntil: days,
          dateLabel: formatDateLabel(b.dueDate),
          type: 'bill',
        });
      }
    });
    return payments.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  }, [subscriptions, bills]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleLogPaycheck() {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid take-home amount.');
      return;
    }
    savePaychecks([
      ...paychecks,
      { id: generateId(), amount, date: new Date().toISOString().slice(0, 10) },
    ]);
    setAmountInput('');
    setLogModalVisible(false);
  }

  function handleDeletePaycheck(id: string) {
    savePaychecks(paychecks.filter((p) => p.id !== id));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Dashboard</Text>
          <TouchableOpacity
            style={styles.gearBtn}
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.gearIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* ── Income / Paycheck card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Income</Text>
            <TouchableOpacity style={styles.logBtn} onPress={() => setLogModalVisible(true)}>
              <Text style={styles.logBtnText}>+ Log Paycheck</Text>
            </TouchableOpacity>
          </View>

          {paychecks.length === 0 ? (
            <Text style={styles.emptyIncome}>Tap + Log Paycheck to get started.</Text>
          ) : (
            <>
              <View style={styles.incomeRow}>
                <Text style={styles.incomeLabel}>Last paycheck</Text>
                <Text style={styles.incomeValue}>${fmt(lastPaycheck)}</Text>
              </View>
              <View style={styles.incomeRow}>
                <Text style={styles.incomeLabel}>Avg (last {last4.length})</Text>
                <Text style={styles.incomeValue}>${fmt(avgLast4)}</Text>
              </View>
              <View style={[styles.incomeRow, styles.projectedRow]}>
                <View>
                  <Text style={styles.projectedLabel}>Projected monthly</Text>
                  <Text style={styles.projectedSub}>{projectedSubLabel}</Text>
                </View>
                <Text style={styles.projectedValue}>${fmt(projectedMonthly)}</Text>
              </View>


              <TouchableOpacity
                onPress={() => setLogExpanded((e) => !e)}
                style={styles.logToggle}
              >
                <Text style={styles.logToggleText}>
                  {logExpanded ? '▴' : '▾'} Paycheck Log ({displayedLog.length})
                </Text>
              </TouchableOpacity>

              {logExpanded &&
                displayedLog.map((p) => (
                  <View key={p.id} style={styles.logRow}>
                    <Text style={styles.logDate}>{formatDateLabel(p.date)}</Text>
                    <Text style={styles.logAmount}>${fmt(p.amount)}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeletePaycheck(p.id)}
                      style={styles.logDeleteBtn}
                    >
                      <Text style={styles.logDeleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </>
          )}
        </View>

        {/* ── Monthly breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Breakdown</Text>
          <BreakdownRow label="Active subscriptions" value={subsTotal} color={colors.primary} />
          <BreakdownRow label="Bills this month" value={billsThisMonth} color={colors.warning} />
          <BreakdownRow label="Spending limits" value={spendingTotal} color={colors.success} />
          <BreakdownRow label="Savings contributions" value={goalsTotal} color="#a78bfa" />
          <View style={styles.divider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total committed</Text>
            <Text style={styles.totalValue}>${fmt(totalCommitted)}</Text>
          </View>
        </View>

        {/* ── Remaining balance ── */}
        <View style={[styles.remainingCard, { borderColor: remainingColor + '55' }]}>
          <Text style={styles.remainingLabel}>Remaining</Text>
          <Text style={[styles.remainingValue, { color: remainingColor }]}>
            {remaining >= 0 ? `+$${fmt(remaining)}` : `-$${fmt(Math.abs(remaining))}`}
          </Text>
          {paychecks.length === 0 && (
            <Text style={styles.remainingNote}>Log a paycheck to calculate</Text>
          )}
          {paychecks.length > 0 && remaining < 0 && (
            <Text style={[styles.remainingNote, { color: colors.danger }]}>
              ${fmt(Math.abs(remaining))} over projected income
            </Text>
          )}
        </View>

        {/* ── Next 5 payments ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next 5 Payments</Text>
          {upcomingPayments.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming payments</Text>
          ) : (
            upcomingPayments.map((p, i) => (
              <View
                key={i}
                style={[
                  styles.upcomingRow,
                  i < upcomingPayments.length - 1 && styles.upcomingBorder,
                ]}
              >
                <View style={styles.upcomingLeft}>
                  <Text style={styles.upcomingName}>{p.name}</Text>
                  <Text style={styles.upcomingMeta}>
                    {p.daysUntil === 0 ? 'Today' : `In ${p.daysUntil}d`} · {p.dateLabel}
                  </Text>
                </View>
                <View style={styles.upcomingRight}>
                  <Text style={styles.upcomingAmount}>${p.amount.toFixed(2)}</Text>
                  <Text
                    style={[
                      styles.upcomingType,
                      { color: p.type === 'bill' ? colors.warning : colors.primary },
                    ]}
                  >
                    {p.type === 'bill' ? 'Bill' : 'Sub'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* ── Log Paycheck modal ── */}
      <Modal visible={logModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined
          }
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Log Paycheck</Text>
            <Text style={styles.modalSubtitle}>After-tax take-home amount</Text>

            <TextInput
              style={styles.modalInput}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textDim}
              autoFocus
              onSubmitEditing={handleLogPaycheck}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setAmountInput('');
                  setLogModalVisible(false);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleLogPaycheck}>
                <Text style={styles.saveText}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>${fmt(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  // Header row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700' },
  gearBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: { fontSize: 20, color: colors.textMuted },

  // Card shell
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '700' },

  // Log paycheck button
  logBtn: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  logBtnText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },

  // Income rows
  emptyIncome: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  incomeValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  projectedRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  projectedLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  projectedSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  projectedValue: { fontSize: fontSize.xl, color: colors.primary, fontWeight: '700' },

  // Collapsible paycheck log
  logToggle: { paddingTop: spacing.xs },
  logToggleText: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500' },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  logDate: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted },
  logAmount: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  logDeleteBtn: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  logDeleteText: { color: colors.textDim, fontSize: fontSize.xs },

  // Breakdown
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted },
  breakdownValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  totalLabel: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  totalValue: { fontSize: fontSize.md, color: colors.text, fontWeight: '700' },

  // Remaining
  remainingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  remainingLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '500' },
  remainingValue: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  remainingNote: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },

  // Upcoming
  upcomingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  upcomingBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  upcomingLeft: { gap: 2 },
  upcomingRight: { alignItems: 'flex-end', gap: 2 },
  upcomingName: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  upcomingMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  upcomingAmount: { fontSize: fontSize.md, color: colors.text, fontWeight: '700' },
  upcomingType: { fontSize: fontSize.xs, fontWeight: '600' },
  emptyText: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.sm,
  },
  modalTitle: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700' },
  modalSubtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -4 },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  cancelBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: { color: colors.textMuted, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
});
