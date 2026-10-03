// The sliding cards on the home screen: what the Society is promoting. Each
// card is its picture — the title and text written on the web application
// are for the administrator's list and for a screen reader, not the phone's
// screen (officer direction). A card with no picture has nothing to show
// here and is left out. One card a page, a dot per card, and a slow
// auto-advance that stops the moment the person touches it.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Promotion } from '../api';
import { colors, radius, spacing } from './theme';

const ADVANCE_EVERY_MS = 6_000;
// Landscape, as a banner is.
const ASPECT = 16 / 9;

export function showablePromotions(items: Promotion[]): Promotion[] {
  return items.filter(p => !!p.imageUrl);
}

export function PromotionCarousel({ items }: { items: Promotion[] }) {
  const { width } = useWindowDimensions();
  const pageWidth = width - 2 * spacing.lg;
  const stride = pageWidth + spacing.md;
  const list = useRef<FlatList<Promotion>>(null);
  const [page, setPage] = useState(0);
  const [touched, setTouched] = useState(false);

  // Keep the dots honest when the person swipes.
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / stride);
      setPage(Math.max(0, Math.min(items.length - 1, next)));
    },
    [items.length, stride]
  );

  useEffect(() => {
    if (touched || items.length < 2) return;
    const t = setInterval(() => {
      setPage(current => {
        const next = (current + 1) % items.length;
        list.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, ADVANCE_EVERY_MS);
    return () => clearInterval(t);
  }, [items.length, touched]);

  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={list}
        data={items}
        keyExtractor={p => p.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={stride}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ gap: spacing.md }}
        onScrollBeginDrag={() => setTouched(true)}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: stride, offset: stride * index, index })}
        renderItem={({ item }) => <PromotionCard item={item} width={pageWidth} />}
      />
      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PromotionCard({ item, width }: { item: Promotion; width: number }) {
  const open = item.linkUrl ? () => Linking.openURL(item.linkUrl!).catch(() => undefined) : undefined;
  return (
    <Pressable
      onPress={open}
      disabled={!open}
      accessibilityRole={open ? 'link' : 'image'}
      accessibilityLabel={item.body ? `${item.title}. ${item.body}` : item.title}
      style={({ pressed }) => [
        styles.card,
        { width, height: width / ASPECT, backgroundColor: item.accent ?? colors.primarySoft },
        pressed && open && styles.pressed,
      ]}
    >
      <Image source={{ uri: item.imageUrl ?? undefined }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  pressed: { opacity: 0.92 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
});
