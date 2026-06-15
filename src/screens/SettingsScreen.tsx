import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAsyncStorage } from '../hooks/useAsyncStorage';
import {
  Paycheck, Subscription, Bill, BudgetCategory,
  SavingsGoal, SavingsTracker, AppSettings,
} from '../types';
import { colors, spacing, radius, fontSize } from '../theme';

const DEFAULT_SETTINGS: AppSettings = { payFrequency: 'biweekly' };

const FREQ_OPTIONS: { key: AppSettings['payFrequency']; label: string }[] = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'biweekly', label: 'Biweekly' },
  { key: 'semimonthly', label: '2×/month' },
  { key: 'monthly', label: 'Monthly' },
];

interface BackupData {
  version: number;
  exportedAt: string;
  paychecks: Paycheck[];
  subscriptions: Subscription[];
  bills: Bill[];
  budgetCategories: BudgetCategory[];
  savingsGoals: SavingsGoal[];
  savingsTracker: SavingsTracker | null;
}

function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.version === 'number' &&
    Array.isArray(d.paychecks) &&
    Array.isArray(d.subscriptions) &&
    Array.isArray(d.bills) &&
    Array.isArray(d.budgetCategories) &&
    Array.isArray(d.savingsGoals)
  );
}

export default function SettingsScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { data: paychecks, save: savePaychecks } = useAsyncStorage<Paycheck[]>('paychecks', []);
  const { data: subscriptions, save: saveSubscriptions } = useAsyncStorage<Subscription[]>('subscriptions', []);
  const { data: bills, save: saveBills } = useAsyncStorage<Bill[]>('bills', []);
  const { data: budgetCategories, save: saveBudgetCategories } = useAsyncStorage<BudgetCategory[]>('budgetCategories', []);
  const { data: savingsGoals, save: saveSavingsGoals } = useAsyncStorage<SavingsGoal[]>('savingsGoals', []);
  const { data: savingsTracker, save: saveSavingsTracker } = useAsyncStorage<SavingsTracker | null>('savingsTracker', null);
  const { data: settings, save: saveSettings } = useAsyncStorage<AppSettings>('appSettings', DEFAULT_SETTINGS);

  const [confirmClear, setConfirmClear] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // ── Backup ──────────────────────────────────────────────────────────────────

  function applyBackup(backup: BackupData) {
    savePaychecks(backup.paychecks);
    saveSubscriptions(backup.subscriptions);
    saveBills(backup.bills);
    saveBudgetCategories(backup.budgetCategories);
    saveSavingsGoals(backup.savingsGoals);
    if (backup.savingsTracker) saveSavingsTracker(backup.savingsTracker);
  }

  async function handleExport() {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString().slice(0, 10),
      paychecks, subscriptions, bills, budgetCategories, savingsGoals, savingsTracker,
    };
    const json = JSON.stringify(backup, null, 2);

    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-backup-${backup.exportedAt}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      try {
        await Share.share({ title: 'Finance App Backup', message: json });
      } catch {
        // user cancelled share sheet
      }
    }
  }

  function handleImport() {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          let data: unknown;
          try { data = JSON.parse(text); } catch {
            alert('Could not parse file as JSON.');
            return;
          }
          if (!isValidBackup(data)) {
            alert('This file does not appear to be a valid Finance App backup.');
            return;
          }
          if (window.confirm(`Replace all current data with backup from ${data.exportedAt}?\n\nThis cannot be undone.`)) {
            applyBackup(data);
            window.location.reload();
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      setImportText('');
      setImportError('');
      setImportModalVisible(true);
    }
  }

  function handleNativeImport() {
    let data: unknown;
    try { data = JSON.parse(importText); } catch {
      setImportError('Invalid JSON — check your paste and try again.');
      return;
    }
    if (!isValidBackup(data)) {
      setImportError('Not a valid Finance App backup file.');
      return;
    }
    applyBackup(data);
    setImportModalVisible(false);
    Alert.alert('Restored', 'Backup restored. Navigate to each tab to see updated data.');
  }

  // ── Clear all ────────────────────────────────────────────────────────────────

  async function handleClearAll() {
    await savePaychecks([]);
    await saveSubscriptions([]);
    await saveBills([]);
    await saveBudgetCategories([]);
    await saveSavingsGoals([]);
    await saveSavingsTracker(null);
    setConfirmClear(false);
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      Alert.alert('Done', 'All data has been cleared.');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── DATA ── */}
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.listRow} onPress={handleExport}>
            <Text style={styles.listLabel}>Export JSON</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.sep} />
          <TouchableOpacity style={styles.listRow} onPress={handleImport}>
            <Text style={styles.listLabel}>Import JSON</Text>
            <Text style={styles.listArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.sep} />
          {!confirmClear ? (
            <TouchableOpacity style={styles.listRow} onPress={() => setConfirmClear(true)}>
              <Text style={[styles.listLabel, { color: colors.danger }]}>Clear All Data</Text>
              <Text style={styles.listArrow}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.clearBlock}>
              <Text style={styles.clearWarning}>
                Permanently delete all financial data. Preferences are kept. This cannot be undone.
              </Text>
              <View style={styles.clearActions}>
                <TouchableOpacity style={styles.clearCancelBtn} onPress={() => setConfirmClear(false)}>
                  <Text style={styles.clearCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.clearDangerBtn} onPress={handleClearAll}>
                  <Text style={styles.clearDangerText}>Delete All</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── INCOME ── */}
        <Text style={styles.sectionLabel}>INCOME</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Pay Frequency</Text>
          <View style={styles.freqGrid}>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.slice(0, 2).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.freqBtn, settings.payFrequency === key && styles.freqBtnActive]}
                  onPress={() => saveSettings({ ...settings, payFrequency: key })}
                >
                  <Text style={[styles.freqBtnText, settings.payFrequency === key && styles.freqBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.slice(2, 4).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.freqBtn, settings.payFrequency === key && styles.freqBtnActive]}
                  onPress={() => saveSettings({ ...settings, payFrequency: key })}
                >
                  <Text style={[styles.freqBtnText, settings.payFrequency === key && styles.freqBtnTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </View>

        {/* ── ABOUT ── */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.aboutName}>Finance App</Text>
          <Text style={styles.aboutDesc}>
            Data is stored locally on this device and never sent to a server.
          </Text>
        </View>

      </ScrollView>

      {/* Import modal (native only) */}
      <Modal visible={importModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Restore Backup</Text>
            <Text style={styles.modalSubtitle}>
              Paste your exported JSON below. This will replace all current data.
            </Text>
            <TextInput
              style={styles.importTextInput}
              value={importText}
              onChangeText={(v) => { setImportText(v); setImportError(''); }}
              placeholder="Paste JSON here…"
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            {importError ? <Text style={styles.importError}>{importError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setImportModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleNativeImport}>
                <Text style={styles.saveText}>Restore</Text>
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
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  title: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700' },

  content: { padding: spacing.md, paddingTop: 0, gap: spacing.sm, paddingBottom: 40 },

  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textDim,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: spacing.sm,
    marginBottom: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // List rows
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  listLabel: { fontSize: fontSize.md, color: colors.text },
  listArrow: { fontSize: fontSize.lg, color: colors.textDim },
  sep: { height: 1, backgroundColor: colors.border },

  // Clear all confirmation
  clearBlock: { padding: spacing.md, gap: spacing.sm },
  clearWarning: { fontSize: fontSize.sm, color: colors.textMuted },
  clearActions: { flexDirection: 'row', gap: spacing.sm },
  clearCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  clearCancelText: { color: colors.textMuted, fontWeight: '600', fontSize: fontSize.sm },
  clearDangerBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  clearDangerText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },

  // Income section
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },


  freqGrid: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 },
  freqRow: { flexDirection: 'row', gap: 6 },
  freqBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  freqBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  freqBtnText: { color: colors.textMuted, fontWeight: '500', fontSize: fontSize.sm },
  freqBtnTextActive: { color: colors.primary },

  // About
  aboutName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '700',
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  aboutDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
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
  importTextInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    color: colors.text,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 160,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  importError: { fontSize: fontSize.sm, color: colors.danger },
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
