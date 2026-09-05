import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { api, ApiError } from '@/api';
import { toInternational, PhoneFormatError } from '@/lib/phone';
import { Banner, Body, Button, Screen, Spacer, TextField, Title } from '@/ui';

export default function SignIn() {
  const router = useRouter();
  const { purpose } = useLocalSearchParams<{ purpose?: 'sign_in' | 'sign_up' }>();
  const signingUp = purpose === 'sign_up';
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
      const challenge = await api.requestOtp(e164, signingUp ? 'sign_up' : 'sign_in');
      router.push({
        pathname: '/(auth)/verify',
        params: {
          challengeId: challenge.challengeId,
          sentTo: challenge.sentTo,
          mobile: e164,
          purpose: signingUp ? 'sign_up' : 'sign_in',
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
      <Title>{signingUp ? 'Start your application' : 'Welcome back'}</Title>
      <Body muted>
        {signingUp
          ? 'Enter your mobile number. A code will be sent to it so your application can be saved as you go.'
          : 'Enter the mobile number on your membership record. A code will be sent to it.'}
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
