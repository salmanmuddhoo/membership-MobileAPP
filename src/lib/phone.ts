// Telephone numbers in full international form — a port of the web
// application's src/lib/applications/phone.ts, so the phone refuses exactly
// what the server would refuse, before a round trip.
//
// Mauritius is +230. Local numbers are 8 digits for mobiles (leading 5) and
// 7 or 8 for fixed lines. Anything ambiguous is refused, not guessed.
const MAURITIUS = '+230';

export class PhoneFormatError extends Error {
  constructor(
    readonly input: string,
    message: string
  ) {
    super(message);
    this.name = 'PhoneFormatError';
  }
}

export function toInternational(input: string): string {
  const raw = input.trim();
  if (raw === '') throw new PhoneFormatError(input, 'A number is required.');

  const cleaned = raw.replace(/[\s\-().]/g, '');
  const withPlus = cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : cleaned;

  if (withPlus.startsWith('+')) {
    const digits = withPlus.slice(1);
    if (!/^\d{8,15}$/.test(digits)) {
      throw new PhoneFormatError(
        input,
        'An international number must be 8 to 15 digits after the country code.'
      );
    }
    return `+${digits}`;
  }

  if (!/^\d+$/.test(withPlus)) {
    throw new PhoneFormatError(
      input,
      'A number may contain only digits, spaces, brackets, dots and hyphens.'
    );
  }

  if (withPlus.startsWith('230') && withPlus.length === 11) {
    return `${MAURITIUS}${withPlus.slice(3)}`;
  }

  if (withPlus.length === 7 || withPlus.length === 8) {
    return `${MAURITIUS}${withPlus}`;
  }

  throw new PhoneFormatError(
    input,
    `${raw} is not a number this can place. Enter a Mauritian number as 8 ` +
      'digits, or any other number in full international form starting with +.'
  );
}

export function forDisplay(e164: string): string {
  if (e164.startsWith(MAURITIUS) && e164.length === 12) {
    const local = e164.slice(4);
    return `${MAURITIUS} ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  return e164;
}
