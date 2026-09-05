import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApplication } from '@/hooks/queries';
import { formatDateTime, statusLabel } from '@/lib/format';
import { Badge, Banner, Body, Button, Card, Empty, Heading, Loading, Row, Screen, Spacer, Title } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

export default function Status() {
  const { id, justSubmitted } = useLocalSearchParams<{ id: string; justSubmitted?: string }>();
  const router = useRouter();
  const application = useApplication(id);
  if (application.isLoading) return <Loading />;
  const app = application.data;
  if (!app) return <Empty title="That application no longer exists" />;

  const tone =
    app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : app.status === 'returned' ? 'warning' : 'info';

  return (
    <Screen footer={<Button title="Done" onPress={() => { router.dismissAll(); router.replace('/(member)/applications'); }} />}>
      {justSubmitted ? (
        <Banner tone="success" title="Application submitted">
          Keep the reference below. You will be contacted on your mobile once it has been reviewed.
        </Banner>
      ) : null}
      <Text style={type.small}>{app.membershipTypeName} membership</Text>
      <Title>{app.reference}</Title>
      <Badge tone={tone}>{statusLabel(app.status)}</Badge>
      <Spacer />
      {app.status === 'returned' && app.returnComment ? (
        <>
          <Banner tone="warning" title="Returned for correction">{app.returnComment}</Banner>
          <Button title="Correct and resubmit" onPress={() => router.replace({ pathname: '/(apply)/[id]/form', params: { id: app.id, step: '0' } })} />
        </>
      ) : null}
      <Card>
        <Row label="Submitted" value={formatDateTime(app.submittedAt)} />
        <Row label="Decided" value={formatDateTime(app.decidedAt)} last />
      </Card>
      <Heading>What happens next</Heading>
      <Body muted>
        {app.status === 'approved'
          ? 'Visit a branch with your ID to pay the fees, sign the form and collect your membership card.'
          : app.status === 'rejected'
            ? 'The Society was unable to approve this application. Contact a branch if you would like to discuss it.'
            : 'The regional office checks the application first, then the Secretary reviews it. You will be told if anything needs correcting.'}
      </Body>
      <Heading>History</Heading>
      <Card>
        {app.timeline.map((t, i) => (
          <View key={`${t.at}${i}`} style={[styles.event, i === app.timeline.length - 1 && styles.eventLast]}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={type.body}>{t.label}</Text>
              <Text style={type.small}>{formatDateTime(t.at)}</Text>
              {t.comment ? <Text style={[type.small, { marginTop: 2 }]}>{t.comment}</Text> : null}
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  event: { flexDirection: 'row', gap: spacing.md, paddingBottom: spacing.md, alignItems: 'flex-start' },
  eventLast: { paddingBottom: 0 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
