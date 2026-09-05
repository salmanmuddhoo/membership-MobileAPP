// One place for colour, spacing and type. Brand-neutral placeholders with
// Al Barakah's green as primary; swap here, nowhere else.
export const colors = {
  primary: '#0F5C4C',
  primaryDark: '#0B443A',
  primarySoft: '#E3F1ED',
  accent: '#C8A24C',
  bg: '#F6F7F5',
  surface: '#FFFFFF',
  border: '#DDE3DF',
  text: '#15201C',
  muted: '#5C6B65',
  danger: '#B42318',
  dangerSoft: '#FEE4E2',
  success: '#067647',
  successSoft: '#DCFAE6',
  warning: '#B54708',
  warningSoft: '#FEF0C7',
  info: '#175CD3',
  infoSoft: '#E0ECFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
  title: { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  small: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
};
