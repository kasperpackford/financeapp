import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import { Subscription } from '../types';
import SubscriptionCard from '../components/SubscriptionCard';
import { colors, spacing, radius, fontSize } from '../theme';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_ROWS = [[1,2,3,4],[5,6,7,8],[9,10,11,12]];

function getQuarterMonths(startMonth: number): string {
  return [0, 3, 6, 9].map(o => MONTHS[(startMonth - 1 + o) % 12]).join(' · ');
}

const DEFAULT_FORM = {
  name: '',
  cost: '',
  billingDay: '1',
  billingMonth: '1',
  billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annual',
  active: true,
};

export default function SubscriptionsScreen() {
  const { data: subscriptions, save, reload } = useAsyncStorage<Subscription[]>('subscriptions', []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const activeTotal = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => {
      if (s.billingCycle === 'quarterly') return sum + s.cost / 3;
      if (s.billingCycle === 'annual') return sum + s.cost / 12;
      return sum + s.cost;
    }, 0);

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  }

  function openEdit(sub: Subscription) {
    setEditing(sub);
    setForm({
      name: sub.name,
      cost: sub.cost.toString(),
      billingDay: sub.billingDay.toString(),
      billingMonth: (sub.billingMonth ?? 1).toString(),
      billingCycle: sub.billingCycle,
      active: sub.active,
    });
    setModalVisible(true);
  }

  function handleSave() {
    const cost = parseFloat(form.cost);
    const billingDay = parseInt(form.billingDay, 10);
    if (!form.name.trim() || isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid input', 'Please enter a valid name and cost.');
      return;
    }
    if (isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
      Alert.alert('Invalid billing day', 'Billing day must be between 1 and 31.');
      return;
    }

    const subData = {
      name: form.name.trim(),
      cost,
      billingDay,
      billingCycle: form.billingCycle,
      active: form.active,
      billingMonth: form.billingCycle !== 'monthly'
        ? parseInt(form.billingMonth, 10)
        : undefined,
    };

    if (editing) {
      save(subscriptions.map((s) => s.id === editing.id ? { ...s, ...subData } : s));
    } else {
      save([...subscriptions, { id: generateId(), ...subData }]);
    }
    setModalVisible(false);
  }

  function handleToggle(id: string, active: boolean) {
    save(subscriptions.map((s) => (s.id === id ? { ...s, active } : s)));
  }

  function handleDelete(id: string) {
    save(subscriptions.filter((s) => s.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subscriptions</Text>
          <Text style={styles.subtitle}>${activeTotal.toFixed(2)}/mo active</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {subscriptions.length === 0 && (
          <Text style={styles.empty}>No subscriptions yet. Tap + Add to get started.</Text>
        )}
        {subscriptions.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            subscription={sub}
            onToggle={handleToggle}
            onPress={openEdit}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Subscription' : 'New Subscription'}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Netflix, Spotify…"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Cost ($)</Text>
            <TextInput
              style={styles.input}
              value={form.cost}
              onChangeText={(v) => setForm((f) => ({ ...f, cost: v }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Billing Cycle</Text>
            <View style={styles.segmentRow}>
              {(['monthly', 'quarterly', 'annual'] as const).map((cycle) => (
                <TouchableOpacity
                  key={cycle}
                  style={[styles.segment, form.billingCycle === cycle && styles.segmentActive]}
                  onPress={() => setForm((f) => ({ ...f, billingCycle: cycle }))}
                >
                  <Text style={[styles.segmentText, form.billingCycle === cycle && styles.segmentTextActive]}>
                    {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.billingCycle !== 'monthly' && (
              <>
                <Text style={styles.label}>
                  {form.billingCycle === 'quarterly' ? 'Start Month' : 'Billing Month'}
                </Text>
                <View style={styles.monthGrid}>
                  {MONTH_ROWS.map((row, ri) => (
                    <View key={ri} style={styles.monthRow}>
                      {row.map((m) => {
                        const active = parseInt(form.billingMonth, 10) === m;
                        return (
                          <TouchableOpacity
                            key={m}
                            style={[styles.monthBtn, active && styles.monthBtnActive]}
                            onPress={() => setForm((f) => ({ ...f, billingMonth: String(m) }))}
                          >
                            <Text style={[styles.monthBtnText, active && styles.monthBtnTextActive]}>
                              {MONTHS[m - 1]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
                {form.billingCycle === 'quarterly' && (
                  <Text style={styles.cycleMeta}>
                    Recurs: {getQuarterMonths(parseInt(form.billingMonth, 10) || 1)}
                  </Text>
                )}
              </>
            )}

            <Text style={styles.label}>Day of Month</Text>
            <TextInput
              style={styles.input}
              value={form.billingDay}
              onChangeText={(v) => setForm((f) => ({ ...f, billingDay: v }))}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.textDim}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700' },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addBtnText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingTop: 0 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 60, fontSize: fontSize.md },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: 0,
    maxHeight: '88%',
  },
  modalScroll: { flexShrink: 1 },
  modalScrollContent: { gap: spacing.sm, paddingBottom: 40 },
  modalTitle: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700', marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 2 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  segment: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  segmentActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  segmentText: { color: colors.textMuted, fontWeight: '500', fontSize: fontSize.sm },
  segmentTextActive: { color: colors.primary },
  monthGrid: { gap: 6 },
  monthRow: { flexDirection: 'row', gap: 6 },
  monthBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  monthBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  monthBtnText: { color: colors.textMuted, fontSize: fontSize.sm },
  monthBtnTextActive: { color: colors.primary, fontWeight: '600' },
  cycleMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: -2 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
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
