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
import { BudgetCategory } from '../types';
import BudgetCategoryCard from '../components/BudgetCategoryCard';
import { colors, spacing, radius, fontSize } from '../theme';

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const DEFAULT_FORM = { name: '', monthlyLimit: '' };

export default function SpendingScreen() {
  const { data: categories, save, reload } = useAsyncStorage<BudgetCategory[]>('budgetCategories', []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<BudgetCategory | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);

  const totalAllocated = categories.reduce((sum, c) => sum + c.monthlyLimit, 0);

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  }

  function openEdit(cat: BudgetCategory) {
    setEditing(cat);
    setForm({ name: cat.name, monthlyLimit: cat.monthlyLimit.toString() });
    setModalVisible(true);
  }

  function handleSave() {
    const monthlyLimit = parseFloat(form.monthlyLimit);
    if (!form.name.trim() || isNaN(monthlyLimit) || monthlyLimit < 0) {
      Alert.alert('Invalid input', 'Please enter a valid name and limit.');
      return;
    }
    if (editing) {
      save(
        categories.map((c) =>
          c.id === editing.id ? { ...c, name: form.name.trim(), monthlyLimit } : c
        )
      );
    } else {
      save([...categories, { id: generateId(), name: form.name.trim(), monthlyLimit }]);
    }
    setModalVisible(false);
  }

  function handleDelete(id: string) {
    save(categories.filter((c) => c.id !== id));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Spending</Text>
          <Text style={styles.subtitle}>${totalAllocated.toFixed(2)}/mo allocated</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {categories.length === 0 && (
          <Text style={styles.empty}>
            No spending categories yet. Tap + Add to create one.
          </Text>
        )}
        {categories.map((cat) => (
          <BudgetCategoryCard
            key={cat.id}
            category={cat}
            onPress={openEdit}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              {editing ? 'Edit Category' : 'New Category'}
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Groceries, Gas, Clothing…"
              placeholderTextColor={colors.textDim}
            />

            <Text style={styles.label}>Monthly Limit ($)</Text>
            <TextInput
              style={styles.input}
              value={form.monthlyLimit}
              onChangeText={(v) => setForm((f) => ({ ...f, monthlyLimit: v }))}
              keyboardType="decimal-pad"
              placeholder="0.00"
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
