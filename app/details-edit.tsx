// A member completing their own details.
//
// The same form the officer captures with, rendered from the same field
// configuration — but only the fields with nothing on record (officer
// direction: what is on record changes at a branch). It does not change the
// record directly: what is sent is a change request that staff verify
// (docs/member-api.md, "Why a change request"), so the member sees "pending"
// until they do.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { ApiError } from '@/api';
import { PartyForm } from '@/forms/PartyForm';
import { usePartyValues } from '@/forms/usePartyValues';
import { fieldPath, isMemberSubject, missingKeys, partyTitle, subjectsOf, validateAll } from '@/forms/validate';
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
  // Employment and nominee details are not the member's to edit here; they
  // are sent back exactly as they are on record, and only what is shown is
  // checked.
  const subjects = subjectsOf(membershipType).filter(isMemberSubject);
  const shown = form.parties.filter(p => isMemberSubject(p.subject));
  const counts = new Map<string, number>();
  for (const p of shown) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);
  // What was empty when the form opened is what the member may fill in;
  // the rest goes back exactly as it is on record and is not checked.
  const [editable] = useState(() => new Map(initial.map(p => [`${p.subject}.${p.ordinal}`, missingKeys(membershipType, p)])));
  const editableKeys = (p: { subject: string; ordinal: number }) => editable.get(`${p.subject}.${p.ordinal}`) ?? [];

  async function send() {
    setProblem(null);
    const all = validateAll(membershipType, shown);
    const found = Object.fromEntries(
      Object.entries(all).filter(([path]) =>
        shown.some(p => editableKeys(p).some(k => fieldPath(p.subject, p.ordinal, k) === path))
      )
    );
    form.setErrors(found);
    if (Object.keys(found).length > 0) {
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
        Fill in what is missing from your record. Staff verify the details before your record changes; what is already on record changes at a branch.
      </Body>
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      {subjects.map(subject =>
        form.parties
          .filter(p => p.subject === subject && editableKeys(p).length > 0)
          .map(party => (
            <React.Fragment key={`${party.subject}-${party.ordinal}`}>
              {party.subject === 'applicant' ? null : (
                <Heading>{partyTitle(party.subject, party.ordinal, counts.get(party.subject) ?? 1)}</Heading>
              )}
              <PartyForm
                type={membershipType}
                party={party}
                errors={form.errors}
                readOnlyKeys={party.subject === 'applicant' ? ['mobile'] : []}
                onlyKeys={editableKeys(party)}
                onChange={(k, v) => form.setValue(party.subject, party.ordinal, k, v)}
              />
            </React.Fragment>
          ))
      )}
      <Text style={type.small}>To change anything already on record, including the mobile number you sign in with, visit a branch with your ID.</Text>
    </Screen>
  );
}
