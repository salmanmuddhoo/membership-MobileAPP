import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, type MembershipType } from '@/api';
import { useApplications, useReference, useStartApplication } from '@/hooks/queries';
import { formatMoney, statusLabel } from '@/lib/format';
import { Banner, Body, Button, Card, Loading, Screen, Spacer, Title } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

export default function ChooseType() {
  const router = useRouter();
  const reference = useReference();
  const applications = useApplications();
  const start = useStartApplication();
  const [problem, setProblem] = useState<string | null>(null);

  if (reference.isLoading || applications.isLoading) return <Loading />;

  const open = applications.data?.find(a => !['approved', 'rejected'].includes(a.status));
  if (open) {
    return (
      <Screen>
        <Title>Application in progress</Title>
        <Body muted>
          {open.reference} · {open.membershipTypeName} · {statusLabel(open.status)}
        </Body>
        <Spacer size="xl" />
        <Button
          title={['draft', 'returned'].includes(open.status) ? 'Continue' : 'See status'}
          onPress={() =>
            ['draft', 'returned'].includes(open.status)
              ? router.replace({ pathname: '/(apply)/[id]/form', params: { id: open.id, step: '0' } })
              : router.replace({ pathname: '/(apply)/[id]/status', params: { id: open.id } })
          }
        />
      </Screen>
    );
  }

  async function choose(t: MembershipType) {
    setProblem(null);
    try {
      const app = await start.mutateAsync(t.code);
      router.replace({ pathname: '/(apply)/[id]/form', params: { id: app.id, step: '0' } });
    } catch (e) {
      setProblem(e instanceof ApiError ? e.userMessage : 'Something went wrong. Please try again.');
    }
  }

  const total = (t: MembershipType) =>
    t.fees
      .filter(f => f.requirement === 'required')
      .reduce((sum, f) => sum + Number(f.amount), 0)
      .toFixed(2);

  return (
    <Screen>
      <Title>Which membership?</Title>
      <Body muted>Your answers are saved as you go. You can stop and come back.</Body>
      <Spacer />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      {reference.error ? <Banner tone="danger">Could not load the membership types.</Banner> : null}
      {reference.data?.membershipTypes.map(t => (
        <Card key={t.id} onPress={() => !start.isPending && choose(t)}>
          <Text style={type.subheading}>{t.name}</Text>
          <Text style={type.small}>{t.description}</Text>
          <View style={styles.fees}>
            {t.fees
              .filter(f => f.requirement !== 'not_applicable')
              .map(f => (
                <Text key={f.code} style={type.small}>
                  {f.name}: {formatMoney(f.amount)}
                  {f.requirement === 'optional' ? ' (optional)' : ''}
                </Text>
              ))}
            <Text style={styles.total}>Payable on approval: {formatMoney(total(t))}</Text>
          </View>
          <Text style={type.small}>
            Documents: {t.checklist.map(c => c.documentName + (c.requirement === 'optional' ? ' (optional)' : '')).join(', ')}
          </Text>
        </Card>
      ))}
      {start.isPending ? <Loading label="Starting your application" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fees: { marginVertical: spacing.sm, gap: 2 },
  total: { ...type.label, color: colors.primary, marginTop: spacing.xs },
});
