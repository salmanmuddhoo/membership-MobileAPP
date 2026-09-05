// Verification: the code proves the person holds the mobile the challenge
// went to. On success the session that comes back is the authentication
// from here on — for a member, this is the moment the phone is linked.
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
    purpose: 'link_member' | 'sign_up';
  }>();
  const [challengeId, setChallengeId] = useState(params.challengeId);
  const [sentTo, setSentTo] = useState(params.sentTo);
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
      if (params.purpose === 'sign_up') {
        router.replace('/(apply)');
      } else {
        router.replace('/(member)/home');
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.details.code?.[0]) setError(e.details.code[0]);
        else if (e.code === 'not_found') {
          setProblem(`${e.message} Go back to start again.`);
        } else setProblem(e.userMessage);
      } else setProblem('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setProblem(null);
    try {
      const challenge = await api.resendOtp(challengeId);
      setChallengeId(challenge.challengeId);
      setSentTo(challenge.sentTo);
      setResendIn(30);
    } catch (e) {
      setProblem(e instanceof ApiError ? e.userMessage : 'Could not resend. Try again.');
    }
  }

  return (
    <Screen>
      <Title>Enter the code</Title>
      <Body muted>
        {params.purpose === 'link_member'
          ? `Sent by SMS to the mobile on your membership record, ${sentTo}. If that number is no longer yours, visit a branch with your ID.`
          : `Sent by SMS to ${sentTo}.`}
      </Body>
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
