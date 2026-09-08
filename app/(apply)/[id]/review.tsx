// Everything on the application, read back before it goes. Submission is
// refused with the fields named when something is missing; each named
// section links straight to its step.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api';
import { missingFields, partyTitle, subjectsOf, visibleFields } from '@/forms/validate';
import { useApplication, useReference, useSubmitApplication } from '@/hooks/queries';
import { forDisplay } from '@/lib/phone';
import { statusLabel } from '@/lib/format';
import { clearDraft } from '@/store/drafts';
import { Badge, Banner, Body, Button, Card, Empty, Heading, Loading, Row, Screen, Spacer, Title } from '@/ui';
import { spacing, type } from '@/ui/theme';

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const application = useApplication(id);
  const reference = useReference();
  const submit = useSubmitApplication(id);
  const [problem, setProblem] = useState<string | null>(null);
  const [serverDetails, setServerDetails] = useState<Record<string, string[]>>({});

  if (application.isLoading || reference.isLoading) return <Loading />;
  const app = application.data;
  const membershipType = reference.data?.membershipTypes.find(t => t.code === app?.membershipTypeCode);
  if (!app || !membershipType) return <Empty title="That application no longer exists" />;

  const steps = subjectsOf(membershipType).flatMap(s => app.parties.filter(p => p.subject === s));
  const counts = new Map<string, number>();
  for (const p of steps) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);
  const missing = missingFields(membershipType, app.parties);
  const missingDocs = app.documents.filter(d => d.requirement === 'required' && !['filed', 'verified'].includes(d.status));
  const serverProblems = Object.entries(serverDetails);
  const canSubmit = missing.length === 0 && missingDocs.length === 0;

  async function send() {
    setProblem(null);
    setServerDetails({});
    try {
      await submit.mutateAsync();
    } catch (e) {
      if (e instanceof ApiError) {
        // userMessage, not message: it carries the correlation id, which is
        // the whole of what makes a failure here traceable to its request
        // in the server log.
        setProblem(e.userMessage);
        if (e.code === 'validation_failed') setServerDetails(e.details);
      } else {
        setProblem(`Could not submit: ${(e as Error).message ?? 'unknown error'}`);
      }
      return;
    }
    // Past this point the application has been submitted. Clearing the
    // draft and moving on are tidying up after that fact, and a failure in
    // either is not a failed submission — inside the try above, one would
    // have been reported as if the whole thing had gone wrong.
    await clearDraft(app!.id).catch(() => {});
    router.replace({ pathname: '/(apply)/[id]/status', params: { id: app!.id, justSubmitted: '1' } });
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="Submit application" onPress={send} loading={submit.isPending} disabled={!canSubmit} style={{ flex: 2 }} />
        </View>
      }
    >
      <Text style={type.small}>{app.reference} · review</Text>
      <Title>Check and submit</Title>
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      {serverProblems.length > 0 ? (
        <Card>
          {serverProblems.map(([path, messages]) => (
            <Text key={path} style={[type.small, { marginBottom: 4 }]}>• {messages[0]}</Text>
          ))}
        </Card>
      ) : null}
      {missing.length > 0 ? (
        <Banner tone="warning" title="Still to fill in">
          {missing.map(m => m.label).join(', ')}
        </Banner>
      ) : null}
      {missingDocs.length > 0 ? (
        <Banner tone="warning" title="Documents still missing">
          {missingDocs.map(d => d.documentName).join(', ')}
        </Banner>
      ) : null}

      {steps.map((party, index) => {
        const fields = visibleFields(membershipType, party.subject);
        return (
          <React.Fragment key={`${party.subject}${party.ordinal}`}>
            <View style={styles.sectionHead}>
              <Heading>{partyTitle(party.subject, party.ordinal, counts.get(party.subject) ?? 1)}</Heading>
              <Button
                title="Edit"
                variant="ghost"
                onPress={() => router.push({ pathname: '/(apply)/[id]/form', params: { id: app.id, step: String(index) } })}
              />
            </View>
            <Card>
              {fields.map((f, i) => {
                const raw = party.values[f.fieldKey] ?? '';
                const value = f.dataType === 'phone' && raw ? forDisplay(raw) : raw;
                return (
                  <Row
                    key={f.fieldKey}
                    label={f.label}
                    value={value || (f.isMandatory ? <Badge tone="warning">Missing</Badge> : '—')}
                    last={i === fields.length - 1}
                  />
                );
              })}
            </Card>
          </React.Fragment>
        );
      })}

      <View style={styles.sectionHead}>
        <Heading>Documents</Heading>
        <Button title="Edit" variant="ghost" onPress={() => router.push({ pathname: '/(apply)/[id]/documents', params: { id: app.id } })} />
      </View>
      <Card>
        {app.documents.map((d, i) => (
          <Row
            key={d.checklistItemId}
            label={d.documentName}
            value={<Badge tone={['filed', 'verified'].includes(d.status) ? 'success' : d.requirement === 'required' ? 'warning' : 'info'}>{statusLabel(d.status)}</Badge>}
            last={i === app.documents.length - 1}
          />
        ))}
      </Card>

      <Heading>Fees payable on approval</Heading>
      <Card>
        {membershipType.fees.map((f, i) => (
          <Row key={f.code} label={f.name} value={`Rs ${f.amount}${f.requirement === 'optional' ? ' (optional)' : ''}`} last={i === membershipType.fees.length - 1} />
        ))}
      </Card>
      <Spacer size="sm" />
      <Body muted>
        By submitting, you confirm the details are true and agree to the Society&apos;s rules. You will sign the printed form at the branch.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
