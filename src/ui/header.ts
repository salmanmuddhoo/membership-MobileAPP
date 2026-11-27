// How a screen's header looks, in one place. Light, on the page's own
// paper-white with no rule beneath: the dark emerald is kept for the
// surfaces that carry the brand (home, welcome, lock), so it means
// something when it appears.
import { colors } from './theme';

// A screen opened on top of another: centred title, back arrow alone.
export const stackHeader = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17, color: colors.text },
  headerTitleAlign: 'center' as const,
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: { backgroundColor: colors.bg },
};

// A tab's own screen: a large title on the left, as a heading for the page.
export const tabHeader = {
  headerStyle: { backgroundColor: colors.bg },
  headerShadowVisible: false,
  headerTintColor: colors.text,
  headerTitleAlign: 'left' as const,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 26, letterSpacing: -0.4, color: colors.text },
};
