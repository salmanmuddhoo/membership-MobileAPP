// Where a sign-in code went, in words: by WhatsApp, SMS or email, and to
// which number or address, masked as the server sent it.
import type { OtpChallenge } from '../api/types';
import { OFFICE_PHONE } from './office';

export function asSentBy(raw: string | undefined): OtpChallenge['sentBy'] {
  return raw === 'whatsapp' || raw === 'sms' || raw === 'email' ? raw : undefined;
}

// "A code has been sent by WhatsApp to +230 5*** *428." For a member, what
// to do if it never comes: the number or email on record may be out of date.
// A server from before the choice sends no channel: that was always SMS.
export function whereItWent(
  purpose: 'link_member' | 'sign_up',
  sentBy: OtpChallenge['sentBy'],
  sentTo: string | null
): string {
  const email = sentBy === 'email';
  const by = email ? 'by email' : sentBy === 'whatsapp' ? 'by WhatsApp' : 'by SMS';
  const thing = email ? 'email address' : 'mobile number';
  const to = sentTo ?? (purpose === 'link_member' ? `the ${thing} on your membership record` : `your ${email ? 'email' : 'mobile'}`);
  const sent = `A code has been sent ${by} to ${to}.`;
  const spam = email ? ' If you cannot find it, look in your spam or junk folder.' : '';
  if (purpose !== 'link_member') return sent + spam;
  return (
    `${sent}${spam} If nothing arrives in a minute or two, the ${thing} on record may no longer be yours: ` +
    `contact the Al Barakah office on ${OFFICE_PHONE}.`
  );
}
