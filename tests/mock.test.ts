// The mock backend enforces the contract's rules end to end: sign in,
// start an application, save a draft, refuse an incomplete submission,
// file the documents, submit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockTransport } from '../src/api/mock/transport.ts';
import { memberApi } from '../src/api/member.ts';
import { ApiError } from '../src/api/client.ts';

async function signIn(api: ReturnType<typeof memberApi>, mobile: string) {
  const challenge = await api.requestOtp(mobile, 'sign_in');
  const session = await api.verifyOtp(challenge.challengeId, '123456');
  return session;
}

test('an existing member signs in and reads their record', async () => {
  const api = memberApi(createMockTransport());
  const session = await signIn(api, '5789 1234');
  assert.equal(session.identity.kind, 'member');
  assert.equal(session.identity.memberNo, 'AB0001');
  const me = await api.me(session.accessToken);
  assert.equal(me.parties.find(p => p.subject === 'applicant')?.values.surname, 'Peerally');
  const accounts = await api.accounts(session.accessToken);
  assert.equal(accounts.length, 2);
});

test('a wrong code is refused with a field message', async () => {
  const api = memberApi(createMockTransport());
  const challenge = await api.requestOtp('5789 1234', 'sign_in');
  await assert.rejects(api.verifyOtp(challenge.challengeId, '000000'), (e: unknown) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, 'validation_failed');
    assert.ok(e.details.code?.[0]);
    return true;
  });
});

test('a new applicant applies end to end', async () => {
  const api = memberApi(createMockTransport());
  const session = await signIn(api, '5999 0000');
  assert.equal(session.identity.kind, 'applicant');
  const token = session.accessToken;

  const app = await api.startApplication(token, 'individual');
  assert.equal(app.status, 'draft');
  assert.equal(app.parties.find(p => p.subject === 'applicant')?.values.mobile, '+23059990000');

  // A second one is refused while the first is open.
  await assert.rejects(api.startApplication(token, 'individual'), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'conflict');
    return true;
  });

  // Submitting with nothing filled in names every gap.
  await assert.rejects(api.submitApplication(token, app.id), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'validation_failed');
    assert.ok('applicant.1.surname' in e.details);
    assert.ok('nominee.1.nic' in e.details);
    assert.ok('document.id_card' in e.details);
    return true;
  });

  const saved = await api.saveDraft(token, app.id, [
    {
      subject: 'applicant',
      ordinal: 1,
      values: {
        surname: 'Doe',
        name: 'Jane',
        nic: 'D0101901234567',
        gender: 'Female',
        address: '1 Main Road',
        mobile: '5999 0000',
      },
    },
    { subject: 'nominee', ordinal: 1, values: { surname: 'Doe', name: 'John', nic: 'D0101881234567', address: '1 Main Road' } },
  ]);
  assert.equal(saved.parties.find(p => p.subject === 'applicant')?.values.surname, 'Doe');

  for (const doc of saved.documents.filter(d => d.requirement === 'required')) {
    const ticket = await api.beginUpload(token, app.id, {
      checklistItemId: doc.checklistItemId,
      fileName: 'scan.jpg',
      sizeBytes: 1024,
      contentType: 'image/jpeg',
    });
    await api.commitUpload(token, app.id, ticket.uploadId);
  }

  const submitted = await api.submitApplication(token, app.id);
  assert.equal(submitted.status, 'new');
  assert.ok(submitted.submittedAt);
  // Phones were normalised at submit.
  assert.equal(submitted.parties.find(p => p.subject === 'applicant')?.values.mobile, '+23059990000');

  // And can no longer be edited.
  await assert.rejects(api.saveDraft(token, app.id, []), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'conflict');
    return true;
  });
});

test('a member capturing details must fill every mandatory field', async () => {
  const api = memberApi(createMockTransport());
  const session = await signIn(api, '5789 1234');
  const me = await api.me(session.accessToken);
  const broken = me.parties.map(p =>
    p.subject === 'nominee' ? { ...p, values: { ...p.values, nic: '' } } : p
  );
  await assert.rejects(api.submitDetails(session.accessToken, broken), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'validation_failed');
    assert.ok('nominee.1.nic' in e.details);
    return true;
  });
  const request = await api.submitDetails(session.accessToken, me.parties);
  assert.equal(request.status, 'pending');
  const after = await api.me(session.accessToken);
  assert.equal(after.pendingUpdate?.id, request.id);
});
