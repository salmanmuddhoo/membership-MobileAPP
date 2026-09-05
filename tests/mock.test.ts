// The mock backend enforces the contract's rules end to end: sign in,
// start an application, save a draft, refuse an incomplete submission,
// file the documents, submit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockTransport } from '../src/api/mock/transport.ts';
import { memberApi } from '../src/api/member.ts';
import { ApiError } from '../src/api/client.ts';

type Api = ReturnType<typeof memberApi>;

async function linkMember(api: Api, nic = 'P1503881234567', abNumber = 'AB0001') {
  const challenge = await api.linkMember({ nic, abNumber });
  return api.verifyOtp(challenge.challengeId, '123456');
}

async function signUp(api: Api, mobile: string) {
  const challenge = await api.startSignUp(mobile);
  return api.verifyOtp(challenge.challengeId, '123456');
}

test('NIC + AB Number identify the member; the code goes to the number on record', async () => {
  const api = memberApi(createMockTransport());
  const challenge = await api.linkMember({ nic: 'P1503881234567', abNumber: 'AB0001' });
  assert.equal(challenge.purpose, 'link_member');
  // Never a number, masked or not: the answer must not say the pair matched.
  assert.equal(challenge.sentTo, null);
  const session = await api.verifyOtp(challenge.challengeId, '123456');
  assert.equal(session.identity.kind, 'member');
  assert.equal(session.identity.memberNo, 'AB0001');
  assert.equal(session.identity.mobile, '+23057891234');
});

test('a NIC and AB Number that do not belong to one active member get the same answer, and open nothing', async () => {
  const api = memberApi(createMockTransport());
  for (const pair of [
    { nic: 'P1503881234567', abNumber: 'AB0002' },
    { nic: 'X0000000000000', abNumber: 'AB0001' },
  ]) {
    const miss = await api.linkMember(pair);
    assert.equal(miss.purpose, 'link_member');
    assert.equal(miss.sentTo, null);
    await assert.rejects(api.verifyOtp(miss.challengeId, '123456'), (e: unknown) => {
      assert.ok(e instanceof ApiError && e.code === 'validation_failed');
      return true;
    });
  }
  await assert.rejects(api.linkMember({ nic: 'bad', abNumber: '1' }), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'validation_failed');
    assert.ok(e.details.nic && e.details.abNumber);
    return true;
  });
});

test("a member's own mobile used for sign-up yields only an applicant session", async () => {
  const api = memberApi(createMockTransport());
  const session = await signUp(api, '5789 1234');
  assert.equal(session.identity.kind, 'applicant');
  assert.equal(session.identity.memberNo, null);
  const me = await api.me(session.accessToken);
  assert.equal(me.kind, 'applicant');
  assert.deepEqual(me.parties, []);
  await assert.rejects(api.transactions(session.accessToken, 'acc-msa'), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'not_found');
    return true;
  });
});

test('the session, not NIC + AB Number, is what gets a linked member back in', async () => {
  const api = memberApi(createMockTransport());
  const first = await linkMember(api);
  const renewed = await api.refresh(first.refreshToken);
  assert.equal(renewed.identity.memberNo, 'AB0001');
  assert.notEqual(renewed.accessToken, first.accessToken);
  // Rotated: the old refresh token is dead.
  await assert.rejects(api.refresh(first.refreshToken), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'unauthenticated');
    return true;
  });
  // Logout revokes it; the device must link again.
  await api.logout(renewed.accessToken, renewed.refreshToken);
  await assert.rejects(api.refresh(renewed.refreshToken));
  await assert.rejects(api.me(renewed.accessToken), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'unauthenticated');
    return true;
  });
});

test('a linked member reads their record', async () => {
  const api = memberApi(createMockTransport());
  const session = await linkMember(api);
  const me = await api.me(session.accessToken);
  assert.equal(me.parties.find(p => p.subject === 'applicant')?.values.surname, 'Peerally');
  const accounts = await api.accounts(session.accessToken);
  assert.equal(accounts.length, 2);
});

test('a wrong code is refused with a field message; five of them burn the challenge', async () => {
  const api = memberApi(createMockTransport());
  const challenge = await api.linkMember({ nic: 'P1503881234567', abNumber: 'AB0001' });
  for (let i = 0; i < 4; i++) {
    await assert.rejects(api.verifyOtp(challenge.challengeId, '000000'), (e: unknown) => {
      assert.ok(e instanceof ApiError);
      assert.equal(e.code, 'validation_failed');
      assert.ok(e.details.code?.[0]);
      return true;
    });
  }
  await assert.rejects(api.verifyOtp(challenge.challengeId, '000000'), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'not_found');
    return true;
  });
  await assert.rejects(api.verifyOtp(challenge.challengeId, '123456'), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'not_found');
    return true;
  });
});

test('a new applicant applies end to end', async () => {
  const api = memberApi(createMockTransport());
  const session = await signUp(api, '5999 0000');
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
  assert.equal(submitted.status, 'received');
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
  const session = await linkMember(api);
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
