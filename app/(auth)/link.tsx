// Identification: NIC + AB Number name one active member. Nothing opens
// here — the code goes to the mobile or the email on that member's record.
// The person chooses which, by WhatsApp or by email, never the number or
// address itself. The link is made on verify. A pair the server does not
// recognise stops here: the person is told to contact the office and goes
// no further (officer direction).
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking } from 'react-native';
import { api, ApiError } from '@/api';
import type { CodeChannel } from '@/api/types';
import { OFFICE_PHONE, OFFICE_PHONE_URL } from '@/lib/office';
import { Banner, Body, Button, OptionField, Screen, Spacer, TextField, Title } from '@/ui';

export default function LinkMember() {
  const router = useRouter();
  const [nic, setNic] = useState('');
  const [abNumber, setAbNumber] = useState('');
  const [channel, setChannel] = useState<CodeChannel>('phone');
  const [errors, setErrors] = useState<{ nic?: string; abNumber?: string; channel?: string }>({});
  const [problem, setProblem] = useState<string | null>(null);
  // The server said the pair names nobody: the way forward is the office.
  const [refused, setRefused] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    setErrors({});
    setProblem(null);
    setRefused(false);
    setBusy(true);
    try {
      const challenge = await api.linkMember({
        nic: nic.trim().toUpperCase(),
        abNumber: abNumber.trim().toUpperCase().replace(/\s+/g, ''),
        channel,
      });
      router.push({
        pathname: '/(auth)/verify',
        params: {
          challengeId: challenge.challengeId,
          sentTo: challenge.sentTo ?? '',
          sentBy: challenge.sentBy ?? '',
          purpose: challenge.purpose,
        },
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'validation_failed') {
          setErrors({ nic: e.details.nic?.[0], abNumber: e.details.abNumber?.[0], channel: e.details.channel?.[0] });
        } else if (e.code === 'not_found') {
          setRefused(true);
          setProblem(e.message);
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
        Enter your NIC and AB Number as shown on your membership card, and choose where we send your code: the mobile number or the email address on your record.
      </Body>
      <Spacer size="xl" />
      {problem ? (
        <Banner tone="danger" title={refused ? 'We could not send a code' : undefined}>
          {problem}
        </Banner>
      ) : null}
      {refused ? (
        <>
          <Button
            title={`Call the office on ${OFFICE_PHONE}`}
            variant="secondary"
            onPress={() => Linking.openURL(OFFICE_PHONE_URL).catch(() => undefined)}
          />
          <Spacer />
        </>
      ) : null}
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
        returnKeyType="done"
      />
      <OptionField
        label="Send my code by"
        value={channel}
        options={[
          { value: 'phone', label: 'WhatsApp', detail: 'To the mobile number on your membership record' },
          { value: 'email', label: 'Email', detail: 'To the email address on your membership record' },
        ]}
        onChange={v => setChannel(v as CodeChannel)}
        error={errors.channel}
      />
      <Button title="Send code" onPress={send} loading={busy} disabled={!ready} />
      <Spacer />
      <Body muted>This links this phone to your membership once. After that you will not need to enter these again.</Body>
    </Screen>
  );
}
