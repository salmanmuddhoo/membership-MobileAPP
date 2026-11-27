// One place for colour, spacing and type: swap here, nowhere else.
//
// Al Barakah's emerald and the gold of its emblem's laurel, on a warm
// paper-white rather than a cold grey. Dark emerald carries the brand
// surfaces (the home screen's header, the lock, the welcome); white cards
// sit on the paper with a soft shadow, not a hairline box.
export const colors = {
  primary: '#0F5C4C',
  primaryDark: '#0B443A',
  primaryDeep: '#072E27',
  primarySoft: '#E3EFEA',
  accent: '#C8A24C',
  accentSoft: '#F6EDD5',
  accentInk: '#7A5B14',
  bg: '#F5F4EF',
  surface: '#FFFFFF',
  border: '#E4E2DA',
  divider: '#EFEDE6',
  text: '#14201C',
  muted: '#5E6B66',
  subtle: '#8B9590',
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255,255,255,0.72)',
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
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

// boxShadow renders the same on Android, iOS and the web preview.
export const shadow = {
  card: { boxShadow: '0px 4px 18px rgba(11, 68, 58, 0.07)' },
  raised: { boxShadow: '0px 10px 30px rgba(7, 46, 39, 0.16)' },
  tile: { boxShadow: '0px 6px 14px rgba(15, 92, 76, 0.22)' },
};

// Glass, for what is pressed: a tinted fill a little see-through (the
// emerald header's gold stars show through it), a top rim catching the
// light, and a soft glow inside. No blur: the buttons sit on flat colour,
// where a blur has nothing to soften, and it would cost a native module.
// GlassSheen (./Glass) adds the highlight across the top.
export const glass = {
  emerald: {
    backgroundColor: 'rgba(15, 92, 76, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    boxShadow:
      'inset 0px 1px 1px rgba(255, 255, 255, 0.35), inset 0px -8px 16px rgba(7, 46, 39, 0.35), 0px 8px 20px rgba(15, 92, 76, 0.28)',
  },
  danger: {
    backgroundColor: 'rgba(180, 35, 24, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    boxShadow:
      'inset 0px 1px 1px rgba(255, 255, 255, 0.35), inset 0px -8px 16px rgba(90, 12, 6, 0.3), 0px 8px 20px rgba(180, 35, 24, 0.25)',
  },
  // Frosted white on the paper: the quieter choice.
  frost: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(15, 92, 76, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 1)',
    boxShadow: 'inset 0px 1px 1px rgba(255, 255, 255, 0.9), 0px 6px 16px rgba(11, 68, 58, 0.10)',
  },
  // Clear glass on the dark emerald surfaces.
  onDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    boxShadow: 'inset 0px 1px 1px rgba(255, 255, 255, 0.22), 0px 6px 16px rgba(0, 0, 0, 0.18)',
  },
};

export const type = {
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.8, color: colors.text },
  title: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.4, color: colors.text },
  heading: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2, color: colors.text },
  subheading: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  small: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  // The small capitals above a section: "QUICK ACTIONS".
  eyebrow: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.subtle,
  },
};
