// The sliding cards on the home screen: what the Society is promoting. One
// card per promotion, a page at a time, a dot per card, and a slow
// auto-advance that stops the moment the person touches it.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import type { Promotion } from '../api';
import { colors, radius, spacing } from './theme';

const ADVANCE_EVERY_MS = 6_000;

export function PromotionCarousel({ items }: { items: Promotion[] }) {
  const { width } = useWindowDimensions();
  const pageWidth = width - 2 * spacing.lg;
  const list = useRef<FlatList<Promotion>>(null);
  const [page, setPage] = useState(0);
  const [touched, setTouched] = useState(false);

  // Keep the dots honest when the person swipes.
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / (pageWidth + spacing.md));
      setPage(Math.max(0, Math.min(items.length - 1, next)));
    },
    [items.length, pageWidth]
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
        snapToInterval={pageWidth + spacing.md}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ gap: spacing.md }}
        onScrollBeginDrag={() => setTouched(true)}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({
          length: pageWidth + spacing.md,
          offset: (pageWidth + spacing.md) * index,
          index,
        })}
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
  const background = item.accent ?? colors.primaryDark;
  return (
    <Pressable
      onPress={open}
      disabled={!open}
      accessibilityRole={open ? 'link' : undefined}
      style={({ pressed }) => [styles.card, { width, backgroundColor: background }, pressed && open && styles.pressed]}
    >
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" /> : null}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.body ? (
          <Text style={styles.body} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
        {open ? <Text style={styles.cta}>{item.linkLabel ?? 'Find out more'} ›</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  card: { borderRadius: radius.lg, overflow: 'hidden', minHeight: 150 },
  pressed: { opacity: 0.92 },
  image: { width: '100%', height: 120 },
  text: { padding: spacing.lg, gap: spacing.xs },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  body: { fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },
  cta: { marginTop: spacing.xs, fontSize: 14, fontWeight: '600', color: colors.accent },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 18 },
});
