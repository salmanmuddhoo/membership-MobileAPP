// A member capturing their own details.
//
// The same form the officer captures with, rendered from the same field
// configuration, pre-filled with what is on record. It does not change the
// record directly: what is sent is a change request that staff verify
// (docs/member-api.md, "Why a change request"), so the member sees "pending"
// until they do.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { ApiError } from '@/api';
import { PartyForm } from '@/forms/PartyForm';
import { usePartyValues } from '@/forms/usePartyValues';
import { partyTitle, subjectsOf } from '@/forms/validate';
import { useMe, useReference, useSubmitDetails } from '@/hooks/queries';
import { notify } from '@/lib/dialog';
import { Banner, Body, Button, Empty, Heading, Loading, Screen } from '@/ui';
import { type } from '@/ui/theme';

export default function DetailsEdit() {
  const me = useMe();
  const reference = useReference();
  if (me.isLoading || reference.isLoading) return <Loading />;
  const profile = me.data;
  const membershipType = reference.data?.membershipTypes.find(t => t.code === profile?.membershipType?.code);
  if (!profile || !membershipType) return <Empty title="Details cannot be edited right now" />;
  return <DetailsForm membershipType={membershipType} initial={profile.parties} />;
}

function DetailsForm({
  membershipType,
  initial,
}: {
  membershipType: NonNullable<ReturnType<typeof useReference>['data']>['membershipTypes'][number];
  initial: NonNullable<ReturnType<typeof useMe>['data']>['parties'];
}) {
  const router = useRouter();
  const submit = useSubmitDetails();
  const [problem, setProblem] = useState<string | null>(null);
  const form = usePartyValues(membershipType, initial);
  const subjects = subjectsOf(membershipType);
  const counts = new Map<string, number>();
  for (const p of form.parties) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);

  async function send() {
    setProblem(null);
    if (!form.validateEverything()) {
      setProblem('Some details need attention. Check the fields marked in red.');
      return;
    }
    try {
      await submit.mutateAsync(form.parties);
      await notify('Sent for verification', 'Your record will change once staff have checked the details.');
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'validation_failed') {
          form.applyServerErrors(e.details);
          setProblem(e.message);
        } else setProblem(e.userMessage);
      } else setProblem('Something went wrong. Please try again.');
    }
  }

  return (
    <Screen
      footer={
        <Button title="Send for verification" onPress={send} loading={submit.isPending} />
      }
    >
      <Body muted>
        Check each section and correct anything that has changed. Staff verify the details before your record changes.
      </Body>
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      {subjects.map(subject =>
        form.parties
          .filter(p => p.subject === subject)
          .map(party => (
            <React.Fragment key={`${party.subject}-${party.ordinal}`}>
              <Heading>{partyTitle(party.subject, party.ordinal, counts.get(party.subject) ?? 1)}</Heading>
              <PartyForm
                type={membershipType}
                party={party}
                errors={form.errors}
                readOnlyKeys={party.subject === 'applicant' ? ['mobile'] : []}
                onChange={(k, v) => form.setValue(party.subject, party.ordinal, k, v)}
              />
            </React.Fragment>
          ))
      )}
      <Text style={type.small}>To change the mobile number you sign in with, visit a branch with your ID.</Text>
    </Screen>
  );
}
