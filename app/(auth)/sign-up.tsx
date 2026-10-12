// A new applicant has no AB Number. They choose how their code arrives —
// by WhatsApp to a number they give, or by email to an address they give —
// and the code proves it is theirs, so the application can be saved as they
// go and staff have a confirmed way to reach them. The NIC is captured on
// the application itself.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { api, ApiError } from '@/api';
import type { CodeChannel, SignUpRequest } from '@/api/types';
import { toInternational, PhoneFormatError } from '@/lib/phone';
import { Banner, Body, Button, OptionField, Screen, Spacer, TextField, Title } from '@/ui';

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export default function SignUp() {
  const router = useRouter();
  const [channel, setChannel] = useState<CodeChannel>('phone');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function choose(next: CodeChannel) {
    setChannel(next);
    setError(null);
  }

  async function send() {
    setError(null);
    setProblem(null);
    let input: SignUpRequest;
    if (channel === 'email') {
      const address = email.trim().toLowerCase();
      if (!EMAIL.test(address)) {
        setError('Enter an email address, e.g. name@example.com.');
        return;
      }
      input = { channel: 'email', email: address };
    } else {
      try {
        input = { channel: 'phone', mobile: toInternational(mobile) };
      } catch (e) {
        setError(e instanceof PhoneFormatError ? e.message : 'Check the number.');
        return;
      }
    }
    setBusy(true);
    try {
      const challenge = await api.startSignUp(input);
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
        const field = e.details.mobile?.[0] ?? e.details.email?.[0];
        if (field) setError(field);
        else setProblem(e.userMessage);
      } else setProblem('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const typed = channel === 'email' ? email : mobile;

  return (
    <Screen>
      <Title>Become a member</Title>
      <Body muted>
        Choose how you want to receive your code, then enter your WhatsApp number or email address. The code lets your application be saved as you go. You will need your NIC for the application.
      </Body>
      <Spacer size="xl" />
      {problem ? <Banner tone="danger">{problem}</Banner> : null}
      <OptionField
        label="Receive my code by"
        value={channel}
        options={[
          { value: 'phone', label: 'WhatsApp', detail: 'To the WhatsApp number you enter' },
          { value: 'email', label: 'Email', detail: 'To the email address you enter' },
        ]}
        onChange={v => choose(v as CodeChannel)}
      />
      {channel === 'email' ? (
        <TextField
          key="email"
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="name@example.com"
          error={error}
          onSubmitEditing={send}
          returnKeyType="send"
        />
      ) : (
        <TextField
          key="mobile"
          label="WhatsApp number"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="5789 1234"
          hint="A Mauritian number as 8 digits, or any number starting with +."
          error={error}
          onSubmitEditing={send}
          returnKeyType="send"
        />
      )}
      <Button title="Send code" onPress={send} loading={busy} disabled={typed.trim() === ''} />
    </Screen>
  );
}
