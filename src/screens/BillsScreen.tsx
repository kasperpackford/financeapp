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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import { Bill } from '../types';
import BillCard from '../components/BillCard';
import { colors, spacing, radius, fontSize } from '../theme';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULT_FORM = {
  name: '',
  amount: '',
  dueDate: todayISO(),
  recurring: false,
};

function billsDueThisMonth(bills: Bill[]): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return bills
    .filter((b) => {
      const d = new Date(b.dueDate);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, b) => sum + b.amount, 0);
}

export default function BillsScreen() {
  const { data: bills, save } = useAsyncStorage<Bill[]>('bills', []);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const dueThisMonth = billsDueThisMonth(bills);

  const sorted = [...bills].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  function openAdd() {
    setEditing(null);
    setForm({ ...DEFAULT_FORM, dueDate: todayISO() });
    setModalVisible(true);
  }

  function openEdit(bill: Bill) {
    setEditing(bill);
    setForm({
      name: bill.name,
      amount: bill.amount.toString(),
      dueDate: bill.dueDate,
      recurring: bill.recurring,
    });
    setModalVisible(true);
  }

  function handleSave() {
    const amount = parseFloat(form.amount);
    if (!form.name.trim() || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid input', 'Please enter a valid name and amount.');
      return;
    }
    if (!form.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
      return;
    }

    if (editing) {
      save(
        bills.map((b) =>
          b.id === editing.id
            ? { ...b, name: form.name.trim(), amount, dueDate: form.dueDate, recurring: form.recurring }
            : b
        )
      );
    } else {
      save([
        ...bills,
        { id: generateId(), name: form.name.trim(), amount, dueDate: form.dueDate, recurring: form.recurring },
      ]);
    }
    setModalVisible(false);
  }

  function handleDelete(id: string) {
    save(bills.filter((b) => b.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bills</Text>
          <Text style={styles.subtitle}>${dueThisMonth.toFixed(2)} due this month</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {sorted.length === 0 && (
          <Text style={styles.empty}>No bills yet. Tap + Add to get started.</Text>
        )}
        {sorted.map((bill) => (
          <BillCard key={bill.id} bill={bill} onPress={openEdit} onDelete={handleDelete} />
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Bill' : 'New Bill'}</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Hydro, Internet…"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={form.amount}
              onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={form.dueDate}
              onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
              placeholder="2024-01-15"
              placeholderTextColor={colors.textDim}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Recurring</Text>
              <Switch
                value={form.recurring}
                onValueChange={(v) => setForm((f) => ({ ...f, recurring: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.text}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.xs,
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
