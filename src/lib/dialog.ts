// Confirmations and notices that work on every platform. React Native's
// Alert is a no-op on web, which would make "Sign out" and "Delete" do
// nothing there; the browser's own dialogs are the fallback.
import { Alert, Platform } from 'react-native';

export function confirmDialog(
  title: string,
  message: string,
  confirmLabel: string,
  destructive = false
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm ? globalThis.confirm(`${title}\n\n${message}`) : true);
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (globalThis.alert) globalThis.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise(resolve => {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }]);
  });
}

// Offer a few ways to do something. iOS gets its action sheet, Android an
// alert with one button per option; web has neither, so the first option
// is taken directly (the caller puts the most general one first there).
export function chooseOption(
  title: string,
  message: string,
  options: { label: string; onPress: () => void }[]
): void {
  if (Platform.OS === 'web') {
    options[0]?.onPress();
    return;
  }
  Alert.alert(title, message, [
    ...options.map(o => ({ text: o.label, onPress: o.onPress })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
