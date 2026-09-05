import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { api, ApiError } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { Banner, Body, Button, Screen, Spacer, TextField, Title } from '@/ui';

export default function Verify() {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{
    challengeId: string;
    sentTo: string;
    mobile: string;
    purpose: 'sign_in' | 'sign_up';
  }>();
  const [challengeId, setChallengeId] = useState(params.challengeId);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(30);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function verify() {
    setError(null);
    setProblem(null);
    setBusy(true);
    try {
      const session = await api.verifyOtp(challengeId, code.trim());
      await signIn(session);
      const isMember = session.identity.kind !== 'applicant';
      if (params.purpose === 'sign_up' && !isMember) {
        router.replace('/(apply)');
      } else {
        router.replace('/(member)/home');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.details.code?.[0]) setError(e.details.code[0]);
        else setProblem(e.userMessage);
      } else setProblem('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setProblem(null);
    try {
      const challenge = await api.requestOtp(params.mobile, params.purpose);
      setChallengeId(challenge.challengeId);
      setResendIn(30);
    } catch (e) {
      setProblem(e instanceof ApiError ? e.userMessage : 'Could not resend. Try again.');
    }
  }

  return (
    <Screen>
      <Title>Enter the code</Title>
      <Body muted>Sent by SMS to {params.sentTo}.</Body>
      <Spacer size="xl" />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      <TextField
        label="6-digit code"
        value={code}
        onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        error={error}
        autoFocus
        onSubmitEditing={verify}
        style={{ letterSpacing: 8, fontSize: 24, textAlign: 'center' }}
      />
      <Button title="Continue" onPress={verify} loading={busy} disabled={code.length !== 6} />
      <Spacer />
      <Button
        title={resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
        variant="ghost"
        onPress={resend}
        disabled={resendIn > 0}
      />
    </Screen>
  );
}
