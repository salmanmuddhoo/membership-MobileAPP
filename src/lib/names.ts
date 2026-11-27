// What to call the signed-in person. The greeting uses their given names in
// full — "Muhammud Salman", not "Muhammud": many members go by two given
// names, and the first word alone is not their name.
import type { MemberProfile } from '../api/types';

// The applicant party's Name field holds the given names, Surname the
// family name. Before the profile has loaded, or when Name is blank, the
// display name less its last word (the surname) stands in; a one-word
// display name is kept whole.
export function givenNames(profile: Pick<MemberProfile, 'parties'> | null | undefined, displayName: string): string {
  const name = profile?.parties.find(p => p.subject === 'applicant')?.values.name?.trim();
  if (name) return name.replace(/\s+/g, ' ');
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.slice(0, -1).join(' ') : (words[0] ?? '');
}

// Two letters for the avatar: the first given name's and the surname's.
export function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}
