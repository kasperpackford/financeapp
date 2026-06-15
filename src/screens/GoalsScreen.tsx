import React, { useState } from 'react';
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
import { SavingsGoal } from '../types';
import GoalCard from '../components/GoalCard';
import { colors, spacing, radius, fontSize } from '../theme';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_FORM = {
  name: '',
  targetAmount: '',
  monthlyContribution: '',
  currentAmount: '',
};

type ModalMode = 'add' | 'edit';

export default function GoalsScreen() {
  const { data: goals, save } = useAsyncStorage<SavingsGoal[]>('savingsGoals', []);
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<ModalMode>('add');
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const totalMonthlyCommitted = goals.reduce((sum, g) => sum + g.monthlyContribution, 0);

  function openAdd() {
    setMode('add');
    setEditing(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  }

  function openEdit(goal: SavingsGoal) {
    setMode('edit');
    setEditing(goal);
    setForm({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      monthlyContribution: goal.monthlyContribution.toString(),
      currentAmount: goal.currentAmount.toString(),
    });
    setModalVisible(true);
  }

  function handleSave() {
    const targetAmount = parseFloat(form.targetAmount);
    const monthlyContribution = parseFloat(form.monthlyContribution);
    const currentAmount = parseFloat(form.currentAmount || '0');

    if (!form.name.trim() || isNaN(targetAmount) || targetAmount <= 0) {
      Alert.alert('Invalid input', 'Enter a valid name and target amount.');
      return;
    }
    if (isNaN(monthlyContribution) || monthlyContribution < 0) {
      Alert.alert('Invalid input', 'Enter a valid monthly contribution.');
      return;
    }

    if (mode === 'edit' && editing) {
      save(
        goals.map((g) =>
          g.id === editing.id
            ? {
                ...g,
                name: form.name.trim(),
                targetAmount,
                monthlyContribution,
                currentAmount: isNaN(currentAmount) ? g.currentAmount : currentAmount,
              }
            : g
        )
      );
    } else {
      save([
        ...goals,
        {
          id: generateId(),
          name: form.name.trim(),
          targetAmount,
          monthlyContribution,
          currentAmount: 0,
        },
      ]);
    }
    setModalVisible(false);
  }

  function handleDelete(id: string) {
    save(goals.filter((g) => g.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>${totalMonthlyCommitted.toFixed(2)}/mo committed</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {goals.length === 0 && (
          <Text style={styles.empty}>No goals yet. Tap + Add to set one.</Text>
        )}
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onPress={openEdit} onDelete={handleDelete} />
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <>
                <Text style={styles.modalTitle}>{mode === 'edit' ? 'Edit Goal' : 'New Goal'}</Text>

                <Text style={styles.label}>Goal Name</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="PC upgrade, Europe trip…"
                  placeholderTextColor={colors.textDim}
                />

                <Text style={styles.label}>Target Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={form.targetAmount}
                  onChangeText={(v) => setForm((f) => ({ ...f, targetAmount: v }))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textDim}
                />

                <Text style={styles.label}>Monthly Contribution ($)</Text>
                <TextInput
                  style={styles.input}
                  value={form.monthlyContribution}
                  onChangeText={(v) => setForm((f) => ({ ...f, monthlyContribution: v }))}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textDim}
                />

                {mode === 'edit' && (
                  <>
                    <Text style={styles.label}>Current Amount Saved ($)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.currentAmount}
                      onChangeText={(v) => setForm((f) => ({ ...f, currentAmount: v }))}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textDim}
                    />
                  </>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Text style={styles.saveText}>Save</Text>
                  </TouchableOpacity>
                </View>
            </>
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
  hint: { color: colors.textDim, textAlign: 'center', marginTop: spacing.md, fontSize: fontSize.xs },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.sm,
  },
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
