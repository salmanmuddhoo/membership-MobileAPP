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

test('the app offers individual only; another type is refused', async () => {
  const api = memberApi(createMockTransport());

  // Reference marks which types a new applicant may start online. The branch
  // still handles the rest, so they are present but flagged off.
  const ref = await api.reference();
  const individual = ref.membershipTypes.find(t => t.code === 'individual');
  assert.equal(individual?.onlineRegistration, true);
  assert.ok(
    ref.membershipTypes.some(t => t.code !== 'individual' && !t.onlineRegistration),
    'another, non-online-registrable type should exist'
  );

  const token = (await signUp(api, '5999 0055')).accessToken;
  await assert.rejects(api.startApplication(token, 'corporate'), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'validation_failed');
    assert.ok('membershipType' in e.details);
    return true;
  });
  // The refusal created nothing, so the applicant can still apply for individual.
  const app = await api.startApplication(token, 'individual');
  assert.equal(app.membershipTypeCode, 'individual');
});

test('a guardian sees the accounts and balances of the minors they guard', async () => {
  const api = memberApi(createMockTransport());
  const token = (await linkMember(api)).accessToken;

  const minors = await api.dependents(token);
  assert.equal(minors.length, 1);
  const zaid = minors[0];
  assert.equal(zaid.name, 'Zaid Peerally');
  assert.equal(zaid.relationship, 'Mother');
  assert.equal(zaid.accounts.length, 1);
  assert.equal(zaid.accounts[0].balance, '750.00');

  // The entries behind that balance are readable.
  const tx = await api.dependentTransactions(token, zaid.id, zaid.accounts[0].id);
  assert.deepEqual(
    tx.map(t => t.amount),
    ['750.00']
  );

  // An account that is not this minor's is not_found, the same as the backend.
  await assert.rejects(api.dependentTransactions(token, zaid.id, 'acc-msa'), (e: unknown) => {
    assert.ok(e instanceof ApiError && e.code === 'not_found');
    return true;
  });
});

test('a new applicant, who guards nobody, has no dependents', async () => {
  const api = memberApi(createMockTransport());
  const token = (await signUp(api, '5991 2323')).accessToken;
  assert.deepEqual(await api.dependents(token), []);
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

test('the home screen cards: what is being promoted, to anyone signed in', async () => {
  const api = memberApi(createMockTransport());
  await assert.rejects(api.promotions('not-a-token'), (e: unknown) => e instanceof ApiError && e.code === 'unauthenticated');
  const member = await linkMember(api);
  const cards = await api.promotions(member.accessToken);
  assert.ok(cards.length >= 1);
  assert.ok(cards.every(c => c.title && /^#[0-9a-f]{6}$/i.test(c.accent ?? '#000000')));
  const applicant = await signUp(api, '5999 1111');
  assert.deepEqual(await api.promotions(applicant.accessToken), cards);
});

test('where the card earns a discount: every outlet has a logo, a category and a percentage', async () => {
  const api = memberApi(createMockTransport());
  await assert.rejects(api.outlets('not-a-token'), (e: unknown) => e instanceof ApiError && e.code === 'unauthenticated');
  const member = await linkMember(api);
  const outlets = await api.outlets(member.accessToken);
  assert.ok(outlets.length >= 1);
  for (const o of outlets) {
    assert.match(o.logoUrl, /^https:\/\//);
    assert.equal(o.category, o.category.toLowerCase());
    assert.match(o.discountPercent, /^\d+(\.\d+)?$/);
  }
});
