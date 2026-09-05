// The application form, one party per step, driven by the membership
// type's field configuration.
//
// Every step saves the draft to the server on Next and keeps a local copy
// of anything typed since (S-302: a dropped connection loses nothing). A
// step refuses to advance with an invalid field on it, but the draft is
// saved regardless — a half-typed number should not cost the rest.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, type Application, type MembershipType, type PartyValues } from '@/api';
import { PartyForm } from '@/forms/PartyForm';
import { usePartyValues } from '@/forms/usePartyValues';
import { partyTitle, subjectsOf } from '@/forms/validate';
import { useApplication, useDeleteDraft, useReference, useSaveDraft } from '@/hooks/queries';
import { confirmDialog } from '@/lib/dialog';
import { clearDraft, loadDraft, storeDraft } from '@/store/drafts';
import { Banner, Body, Button, Empty, Loading, Screen, Spacer } from '@/ui';
import { colors, spacing, type } from '@/ui/theme';

export default function FormScreen() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const application = useApplication(id);
  const reference = useReference();
  const [local, setLocal] = useState<PartyValues[] | null | undefined>(undefined);

  useEffect(() => {
    loadDraft(id).then(setLocal);
  }, [id]);

  if (application.isLoading || reference.isLoading || local === undefined) return <Loading />;
  const app = application.data;
  const membershipType = reference.data?.membershipTypes.find(t => t.code === app?.membershipTypeCode);
  if (!app || !membershipType) return <Empty title="That application no longer exists" />;
  if (!['draft', 'returned'].includes(app.status)) {
    return <Empty title="Already submitted">This application can no longer be changed.</Empty>;
  }

  // Whatever was typed since the last successful save wins over the server
  // copy — the local copy is only ever newer.
  const initial = local ?? app.parties;
  return (
    <Wizard
      key={`${app.id}-${step ?? '0'}`}
      app={app}
      membershipType={membershipType}
      initial={initial}
      stepIndex={Number(step ?? 0)}
    />
  );
}

function Wizard({
  app,
  membershipType,
  initial,
  stepIndex,
}: {
  app: Application;
  membershipType: MembershipType;
  initial: PartyValues[];
  stepIndex: number;
}) {
  const router = useRouter();
  const save = useSaveDraft(app.id);
  const remove = useDeleteDraft();
  const form = usePartyValues(membershipType, initial);
  const [problem, setProblem] = useState<string | null>(null);

  // One step per party, in the order the officer's form shows them.
  const steps = useMemo(() => {
    const ordered: PartyValues[] = [];
    for (const subject of subjectsOf(membershipType)) {
      for (const p of form.parties.filter(x => x.subject === subject)) ordered.push(p);
    }
    return ordered;
  }, [membershipType, form.parties]);
  const counts = new Map<string, number>();
  for (const p of steps) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);

  const current = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  // Keep the local copy current while typing.
  useEffect(() => {
    if (form.dirty) storeDraft(app.id, form.parties);
  }, [app.id, form.parties, form.dirty]);

  async function persist(): Promise<boolean> {
    if (!form.dirty) return true;
    try {
      const saved = await save.mutateAsync(form.parties);
      form.markSaved(saved.parties);
      await clearDraft(app.id);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'network') {
        // Kept locally; the next save will carry it.
        return true;
      }
      setProblem(e instanceof ApiError ? e.userMessage : 'Could not save. Try again.');
      return false;
    }
  }

  async function next() {
    setProblem(null);
    const valid = form.validateOne(current);
    const saved = await persist();
    if (!valid) {
      setProblem('Some details need attention. Check the fields marked in red.');
      return;
    }
    if (!saved) return;
    if (isLast) {
      router.push({ pathname: '/(apply)/[id]/documents', params: { id: app.id } });
    } else {
      router.push({ pathname: '/(apply)/[id]/form', params: { id: app.id, step: String(stepIndex + 1) } });
    }
  }

  async function back() {
    await persist();
    if (stepIndex === 0) router.back();
    else router.push({ pathname: '/(apply)/[id]/form', params: { id: app.id, step: String(stepIndex - 1) } });
  }

  async function discard() {
    if (!(await confirmDialog('Delete this application?', 'Everything typed so far will be lost.', 'Delete', true))) return;
    try {
      await remove.mutateAsync(app.id);
      await clearDraft(app.id);
      router.dismissAll();
      router.replace('/(member)/home');
    } catch (e) {
      setProblem(e instanceof ApiError ? e.userMessage : 'Could not delete.');
    }
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button title="Back" variant="secondary" onPress={back} style={{ flex: 1 }} />
          <Button title={isLast ? 'Documents' : 'Next'} onPress={next} loading={save.isPending} style={{ flex: 2 }} />
        </View>
      }
    >
      <View style={styles.progress}>
        {steps.map((s, i) => (
          <View key={`${s.subject}${s.ordinal}`} style={[styles.dot, i <= stepIndex && styles.dotDone]} />
        ))}
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      <Text style={type.small}>
        {app.reference} · step {stepIndex + 1} of {steps.length + 2}
      </Text>
      <Text style={type.title}>{partyTitle(current.subject, current.ordinal, counts.get(current.subject) ?? 1)}</Text>
      {current.subject === 'nominee' ? (
        <Body muted>The person who receives your shares and savings, as provided in the Society&apos;s rules.</Body>
      ) : current.subject === 'guardian' ? (
        <Body muted>The guardian must be an active member. Enter the Member No. shown on their card.</Body>
      ) : current.subject === 'employment' ? (
        <Body muted>Optional, but it speeds up any financing application later.</Body>
      ) : null}
      {app.status === 'returned' && app.returnComment ? (
        <Banner tone="warning" title="Returned for correction">{app.returnComment}</Banner>
      ) : null}
      <Spacer />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      <PartyForm
        type={membershipType}
        party={current}
        errors={form.errors}
        readOnlyKeys={current.subject === 'applicant' ? ['mobile'] : []}
        onChange={(k, v) => form.setValue(current.subject, current.ordinal, k, v)}
      />
      {app.status === 'draft' ? (
        <Button title="Delete this application" variant="ghost" onPress={discard} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.sm },
  progress: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotDone: { backgroundColor: colors.primary },
});
