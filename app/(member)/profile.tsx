import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { ApiError, type FieldSubject } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { isMemberSubject, missingKeys, partyTitle, visibleFields } from '@/forms/validate';
import { useMe, useReference } from '@/hooks/queries';
import { confirmDialog } from '@/lib/dialog';
import { forDisplay } from '@/lib/phone';
import { formatDate } from '@/lib/format';
import { Banner, Body, Button, Card, Empty, Heading, Loading, Row, Spacer } from '@/ui';
import { colors, spacing } from '@/ui/theme';

export default function Profile() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const me = useMe();
  const reference = useReference();

  const profile = me.data;
  const membershipType = reference.data?.membershipTypes.find(
    t => t.code === profile?.membershipType?.code
  );

  async function confirmSignOut() {
    if (!(await confirmDialog('Sign out?', 'You will need a new code to sign in again.', 'Sign out', true))) return;
    await signOut();
    router.replace('/(auth)/welcome');
  }

  if (me.isLoading || reference.isLoading) return <Loading />;

  if (!profile || profile.kind === 'applicant') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Empty title="No membership record yet">
          Signed in as {session ? forDisplay(session.identity.mobile) : ''}. Your details appear here once a membership application is approved.
        </Empty>
        <Button title="Sign out" variant="ghost" onPress={confirmSignOut} />
      </ScrollView>
    );
  }

  const parties = profile.parties.filter(p => isMemberSubject(p.subject));
  const counts = new Map<FieldSubject, number>();
  for (const p of parties) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);

  // Fields on the membership type with nothing on record — the only ones
  // the member may fill in themselves (officer direction): what is on
  // record changes at a branch.
  const incomplete = membershipType ? parties.reduce((n, p) => n + missingKeys(membershipType, p).length, 0) : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={() => me.refetch()} tintColor={colors.primary} />}
    >
      {me.error ? <Banner tone="danger">{me.error instanceof ApiError ? me.error.userMessage : 'Could not load.'}</Banner> : null}
      {profile.pendingUpdate ? (
        <Banner tone="info" title="Update pending">
          Sent {formatDate(profile.pendingUpdate.submittedAt)}. Staff will verify it before your record changes.
        </Banner>
      ) : profile.lastUpdate?.status === 'declined' ? (
        <Banner tone="warning" title="Your last update was not applied">
          {profile.lastUpdate.comment ?? 'Visit a branch with your ID.'}
        </Banner>
      ) : incomplete > 0 ? (
        <Banner tone="warning" title="Some details are missing">
          {incomplete} required {incomplete === 1 ? 'detail is' : 'details are'} not on your record. You can complete them here.
        </Banner>
      ) : null}

      <Card>
        <Row label="Member No." value={profile.memberNo ?? '—'} />
        <Row label="Member since" value={formatDate(profile.joinedAt)} last />
      </Card>

      {parties.map(party => {
        const fields = membershipType ? visibleFields(membershipType, party.subject) : [];
        if (fields.length === 0 && Object.keys(party.values).length === 0) return null;
        // The member's own details are the page; only another party (a
        // minor's guardian) gets a heading of its own.
        const heading = party.subject === 'applicant' ? null : partyTitle(party.subject, party.ordinal, counts.get(party.subject) ?? 1);
        return (
          <React.Fragment key={`${party.subject}-${party.ordinal}`}>
            {heading ? <Heading>{heading}</Heading> : <Spacer />}
            <Card>
              {(fields.length > 0
                ? fields.map(f => ({ key: f.fieldKey, label: f.label, type: f.dataType }))
                : Object.keys(party.values).map(k => ({ key: k, label: k, type: 'text' }))
              ).map((f, i, all) => {
                const raw = party.values[f.key] ?? '';
                const value = f.type === 'phone' && raw ? forDisplay(raw) : raw;
                return <Row key={f.key} label={f.label} value={value} last={i === all.length - 1} />;
              })}
            </Card>
          </React.Fragment>
        );
      })}

      <Spacer />
      {incomplete > 0 ? (
        <Button
          title="Complete my details"
          onPress={() => router.push('/details-edit')}
          disabled={!!profile.pendingUpdate}
        />
      ) : null}
      <Spacer size="xl" />
      <Button title="Sign out" variant="ghost" onPress={confirmSignOut} />
      <Spacer size="sm" />
      <Body muted style={styles.signedInAs}>
        Signed in as {session ? forDisplay(session.identity.mobile) : ''}
      </Body>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  signedInAs: { textAlign: 'center' },
});
