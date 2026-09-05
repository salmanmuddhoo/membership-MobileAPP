// The handful of controls every screen is built from. Deliberately plain
// React Native — no component library to fight, nothing to look wrong when
// the platform's own controls change.
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from './theme';

// --- layout -----------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  padded = true,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  footer?: React.ReactNode;
}) {
  const inner = padded ? styles.padded : undefined;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[inner, styles.scrollContent]}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, inner]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={[type.title, styles.title]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={[type.heading, styles.heading]}>{children}</Text>;
}
export function Body({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={muted ? type.small : type.body}>{children}</Text>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={[type.small, styles.rowLabel]}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text style={[type.body, styles.rowValue]}>{value === '' ? '—' : value}</Text>
      ) : (
        <View style={styles.rowValue}>{value}</View>
      )}
    </View>
  );
}

export function Spacer({ size = 'lg' }: { size?: keyof typeof spacing }) {
  return <View style={{ height: spacing[size] }} />;
}

// --- feedback ---------------------------------------------------------------

type Tone = 'info' | 'success' | 'warning' | 'danger';
const toneStyle: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: colors.infoSoft, fg: colors.info },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export function Banner({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
}) {
  const t = toneStyle[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]} accessibilityRole="alert">
      {title ? <Text style={[type.label, { color: t.fg }]}>{title}</Text> : null}
      {children ? (
        <Text style={[type.small, { color: t.fg, marginTop: title ? 2 : 0 }]}>{children}</Text>
      ) : null}
    </View>
  );
}

export function Badge({ tone = 'info', children }: { tone?: Tone; children: React.ReactNode }) {
  const t = toneStyle[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={[type.small, { marginTop: spacing.md }]}>{label}</Text> : null}
    </View>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <Text style={type.subheading}>{title}</Text>
      {children ? (
        <Text style={[type.small, { marginTop: spacing.sm, textAlign: 'center' }]}>{children}</Text>
      ) : null}
    </View>
  );
}

// --- controls ---------------------------------------------------------------

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        off && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  hint,
  required,
  style,
  ...input
}: TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, input.editable === false && styles.inputReadOnly, style]}
        accessibilityLabel={label}
        {...input}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function ChoiceField({
  label,
  value,
  choices,
  onChange,
  error,
  required,
}: {
  label: string;
  value: string;
  choices: string[];
  onChange: (value: string) => void;
  error?: string | null;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={type.label}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View style={styles.chips}>
        {choices.map(choice => {
          const selected = choice === value;
          return (
            <Pressable
              key={choice}
              onPress={() => onChange(selected ? '' : choice)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { padding: spacing.lg },
  scrollContent: { paddingBottom: spacing.xxl },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  title: { marginBottom: spacing.sm },
  heading: { marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { flex: 1 },
  rowValue: { flex: 1.4, alignItems: 'flex-end' },
  banner: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, minHeight: 200 },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.primarySoft },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: colors.danger },
  buttonText: { fontSize: 16, fontWeight: '600' },
  buttonText_primary: { color: '#fff' },
  buttonText_secondary: { color: colors.primary },
  buttonText_ghost: { color: colors.primary },
  buttonText_danger: { color: '#fff' },
  field: { marginBottom: spacing.lg },
  input: {
    marginTop: spacing.xs,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  inputReadOnly: { backgroundColor: colors.bg, color: colors.muted },
  errorText: { color: colors.danger, fontSize: 13, marginTop: spacing.xs },
  hintText: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, color: colors.text },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
});
