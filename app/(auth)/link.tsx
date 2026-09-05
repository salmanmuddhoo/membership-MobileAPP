// Identification: NIC + AB Number name one active member. Nothing opens
// here — the code goes to the mobile on that member's record, which the
// person typing does not get to choose. The link is made on verify.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { api, ApiError } from '@/api';
import { Banner, Body, Button, Screen, Spacer, TextField, Title } from '@/ui';

export default function LinkMember() {
  const router = useRouter();
  const [nic, setNic] = useState('');
  const [abNumber, setAbNumber] = useState('');
  const [errors, setErrors] = useState<{ nic?: string; abNumber?: string }>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setErrors({});
    setProblem(null);
    setBusy(true);
    try {
      const challenge = await api.linkMember({
        nic: nic.trim().toUpperCase(),
        abNumber: abNumber.trim().toUpperCase().replace(/\s+/g, ''),
      });
      router.push({
        pathname: '/(auth)/verify',
        params: { challengeId: challenge.challengeId, sentTo: challenge.sentTo, purpose: challenge.purpose },
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'validation_failed') {
          setErrors({ nic: e.details.nic?.[0], abNumber: e.details.abNumber?.[0] });
        } else setProblem(e.userMessage);
      } else setProblem('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const ready = nic.trim() !== '' && abNumber.trim() !== '';

  return (
    <Screen>
      <Title>Link my membership</Title>
      <Body muted>
        Enter your NIC and AB Number as shown on your membership card. A code will be sent to the mobile number on your record.
      </Body>
      <Spacer size="xl" />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      <TextField
        label="NIC"
        value={nic}
        onChangeText={setNic}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="A0101801234567"
        error={errors.nic}
        autoFocus
        returnKeyType="next"
      />
      <TextField
        label="AB Number (Shares Account No.)"
        value={abNumber}
        onChangeText={setAbNumber}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="AB0001"
        error={errors.abNumber}
        onSubmitEditing={ready ? send : undefined}
        returnKeyType="send"
      />
      <Button title="Send code" onPress={send} loading={busy} disabled={!ready} />
      <Spacer />
      <Body muted>This links this phone to your membership once. After that you will not need to enter these again.</Body>
    </Screen>
  );
}
