// A new applicant has no AB Number. Their mobile is verified so the
// application can be saved as they go and staff have a confirmed number;
// the NIC is captured on the application itself.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { api, ApiError } from '@/api';
import { toInternational, PhoneFormatError } from '@/lib/phone';
import { Banner, Body, Button, Screen, Spacer, TextField, Title } from '@/ui';

export default function SignUp() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    setProblem(null);
    let e164: string;
    try {
      e164 = toInternational(mobile);
    } catch (e) {
      setError(e instanceof PhoneFormatError ? e.message : 'Check the number.');
      return;
    }
    setBusy(true);
    try {
      const challenge = await api.startSignUp(e164);
      router.push({
        pathname: '/(auth)/verify',
        params: {
          challengeId: challenge.challengeId,
          sentTo: challenge.sentTo ?? '',
          purpose: challenge.purpose,
        },
      });
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.details.mobile?.[0]) setError(e.details.mobile[0]);
        else setProblem(e.userMessage);
      } else setProblem('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Become a member</Title>
      <Body muted>
        Enter your mobile number. A code will be sent to it so your application can be saved as you go. You will need your NIC for the application.
      </Body>
      <Spacer size="xl" />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      <TextField
        label="Mobile number"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        placeholder="5789 1234"
        hint="A Mauritian number as 8 digits, or any number starting with +."
        error={error}
        autoFocus
        onSubmitEditing={send}
        returnKeyType="send"
      />
      <Button title="Send code" onPress={send} loading={busy} disabled={mobile.trim() === ''} />
    </Screen>
  );
}
