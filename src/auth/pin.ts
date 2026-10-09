// The PIN that unlocks the app once a phone is linked.
//
// What it is for: the session in the keychain already gets the person in
// without their NIC, AB Number or a code. The PIN stops whoever picks up the
// unlocked phone from reading balances — a lock on the app, not a second
// password. It is checked on the device only; the server never sees it.
//
// What it is not: a defence against someone who has extracted the keychain.
// A four-digit space is far too small for any hash to resist offline
// guessing, so the stored record is a salted digest (so two phones with the
// same PIN hold different bytes) and the real protection is the attempt
// limit: five wrong PINs sign the device out — five tries in ten thousand —
// and getting back in means linking again with a code to the registered
// mobile.
//
// Four digits (officer direction, October 2026); it was six. A phone that
// set a six-digit PIN before keeps it until the next unlock, then is asked
// for a new four-digit one (LockGate): the record says its own length.
//
// Pure: the digest is injected so the rule can be tested without a device.
export const PIN_LENGTH = 4;
// What a record from before the change holds, having no length of its own.
export const LEGACY_PIN_LENGTH = 6;
export const MAX_PIN_ATTEMPTS = 5;

export interface PinRecord {
  salt: string;
  hash: string;
  // Wrong PINs since the last right one; kept on the device so killing the
  // app does not reset the count.
  failures: number;
  // How many digits this PIN has. Absent on a record set before PINs were
  // four digits: those are six.
  length?: number;
}

export type Digest = (text: string) => Promise<string>;

// The number of digits the stored PIN has, for the unlock screen.
export function pinLengthOf(record: PinRecord): number {
  return record.length ?? LEGACY_PIN_LENGTH;
}

// A record set before PINs were four digits: unlocked with the old PIN,
// then replaced.
export function needsNewPin(record: PinRecord): boolean {
  return pinLengthOf(record) !== PIN_LENGTH;
}

export function isWellFormedPin(pin: string, length: number = PIN_LENGTH): boolean {
  return new RegExp(`^\\d{${length}}$`).test(pin);
}

// The handful of PINs anyone would try first: one digit repeated, or a
// straight run up or down (1234, 4321). Refused at set-up, not at unlock.
export function isWeakPin(pin: string): boolean {
  if (!isWellFormedPin(pin)) return true;
  if (/^(\d)\1+$/.test(pin)) return true;
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  return steps.every(s => s === 1) || steps.every(s => s === -1);
}

export async function createPinRecord(pin: string, salt: string, digest: Digest): Promise<PinRecord> {
  return { salt, hash: await digest(`${salt}:${pin}`), failures: 0, length: pin.length };
}

export async function matchesPin(record: PinRecord, pin: string, digest: Digest): Promise<boolean> {
  if (!isWellFormedPin(pin, pinLengthOf(record))) return false;
  return (await digest(`${record.salt}:${pin}`)) === record.hash;
}

// How many more wrong PINs before the device is signed out.
export function attemptsLeft(record: PinRecord): number {
  return Math.max(0, MAX_PIN_ATTEMPTS - record.failures);
}
