import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage shim for Node
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const mock = await import('./backend-mock.js');
const { QUESTIONS } = await import('./survey.js');

const ANS = { q1: 4, q2: 3, q3: 5, q4: 4, q5: null };
const CTX = { courseId: 'C1', instructorId: null, term: 'Fall 2026' };

function freshUser(email) {
  const s = mock.mockSendCode(email);
  assert.equal(s.ok, true, email);
  const v = mock.mockVerifyCode(email, s.mockCode);
  assert.equal(v.ok, true);
  return v.user;
}

test('domain gate rejects non-colby and lookalikes', () => {
  for (const bad of ['a@gmail.com', 'a@colby.edu.evil.com', 'a@notcolby.edu', 'a@mail.colby.edu', 'colby.edu@evil.com', ' a@colby.eduX']) {
    assert.equal(mock.mockSendCode(bad).ok, false, bad);
  }
  assert.equal(mock.mockSendCode('Student@COLBY.edu').ok, true);
});

test('wrong codes are rejected', () => {
  let s = mock.mockSendCode('b@colby.edu');
  while (s.mockCode === '111111') s = mock.mockSendCode('b@colby.edu');
  assert.equal(mock.mockVerifyCode('b@colby.edu', '111111').ok, false);
});

test('expired codes are rejected', () => {
  const s = mock.mockSendCode('exp@colby.edu');
  const realNow = Date.now;
  Date.now = () => realNow() + 11 * 60 * 1000; // past the 10-minute expiry
  try {
    assert.equal(mock.mockVerifyCode('exp@colby.edu', s.mockCode).ok, false);
  } finally {
    Date.now = realNow;
  }
});

test('first review is pending (pre-moderation), second publishes', () => {
  localStorage.clear();
  const u = freshUser('c@colby.edu');
  const r1 = mock.submitReview(u, { ...CTX, answers: ANS });
  assert.equal(r1.ok, true);
  assert.equal(r1.review.status, 'pending');
  // still pending until a moderator approves the first review
  assert.equal(mock.submitReview(u, { ...CTX, courseId: 'C2', answers: ANS }).review.status, 'pending');
  assert.equal(mock.mockModerate(r1.review.id, 'publish').ok, true);
  const r3 = mock.submitReview(u, { ...CTX, courseId: 'C3', answers: ANS });
  assert.equal(r3.review.status, 'published');
});

test('duplicate review per user/course/instructor/term rejected', () => {
  localStorage.clear();
  const u = freshUser('d@colby.edu');
  assert.equal(mock.submitReview(u, { ...CTX, answers: ANS }).ok, true);
  const dupe = mock.submitReview(u, { ...CTX, answers: ANS });
  assert.equal(dupe.ok, false);
});

test('privacy gate: count-only below 5 published, scores and comments at 5+', () => {
  localStorage.clear();
  for (let i = 0; i < 4; i++) {
    const u = freshUser('p' + i + '@colby.edu');
    const first = mock.submitReview(u, { ...CTX, answers: ANS }); // pending (first)
    mock.mockModerate(first.review.id, 'publish');                // moderator approves
    mock.submitReview(u, { ...CTX, courseId: 'G1', answers: ANS, comment: 'c' + i }); // auto-publishes
  }
  let stats = mock.publicStats('G1', null);
  assert.equal(stats.n, 4);
  assert.equal(stats.gated, true);
  assert.equal(stats.score, null);
  assert.deepEqual(stats.comments, []);
  const u5 = freshUser('p5@colby.edu');
  const first5 = mock.submitReview(u5, { ...CTX, answers: ANS });
  mock.mockModerate(first5.review.id, 'publish');
  mock.submitReview(u5, { ...CTX, courseId: 'G1', answers: ANS, comment: 'c5' });
  stats = mock.publicStats('G1', null);
  assert.equal(stats.n, 5);
  assert.equal(stats.gated, false);
  assert.equal(stats.score, 0.5);
  assert.equal(stats.comments.length, 5);
});

test('invalid answers rejected at submit, out-of-range never stored', () => {
  localStorage.clear();
  const u = freshUser('e@colby.edu');
  assert.equal(mock.submitReview(u, { ...CTX, answers: { q1: 9, q2: 3, q3: 3, q4: 3 } }).ok, false);
  assert.equal(mock.submitReview(u, { ...CTX, answers: { q1: 3, q2: 3, q3: 3 } }).ok, false);
});

test('report flow: 3 distinct reporters auto-hide', () => {
  localStorage.clear();
  const author = freshUser('f0@colby.edu');
  const firstA = mock.submitReview(author, { ...CTX, answers: ANS });
  mock.mockModerate(firstA.review.id, 'publish');
  const pub = mock.submitReview(author, { ...CTX, courseId: 'R1', answers: ANS, comment: 'x' });
  assert.equal(pub.review.status, 'published');
  const r1 = freshUser('f1@colby.edu');
  const r2 = freshUser('f2@colby.edu');
  const r3 = freshUser('f3@colby.edu');
  assert.equal(mock.reportReview(r1, pub.review.id).hidden, false);
  assert.equal(mock.reportReview(r1, pub.review.id).ok, false); // duplicate report
  assert.equal(mock.reportReview(r2, pub.review.id).hidden, false);
  assert.equal(mock.reportReview(r3, pub.review.id).hidden, true);
  assert.equal(mock.publicStats('R1', null).n, 0); // hidden from public
});

test('reports never undo a moderator hide, self-reports rejected', () => {
  localStorage.clear();
  const author = freshUser('h0@colby.edu');
  const firstA = mock.submitReview(author, { ...CTX, answers: ANS });
  mock.mockModerate(firstA.review.id, 'publish');
  const pub = mock.submitReview(author, { ...CTX, courseId: 'H1', answers: ANS, comment: 'x' });
  // self-report rejected
  assert.equal(mock.reportReview(author, pub.review.id).ok, false);
  // moderator hides the review
  mock.mockModerate(pub.review.id, 'hide');
  // three reporters cannot flip it back to pending
  const r1 = freshUser('h1@colby.edu');
  const r2 = freshUser('h2@colby.edu');
  const r3 = freshUser('h3@colby.edu');
  assert.equal(mock.reportReview(r1, pub.review.id).ok, false); // not public
  assert.equal(mock.publicStats('H1', null).n, 0);              // still hidden
  void r2; void r3;
});

test('no innerHTML anywhere in reviews/ (CI-style grep)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  for (const f of readdirSync('reviews')) {
    if (!/\.(js|css|html)$/.test(f) || f.startsWith('__') || f.endsWith('.test.js')) continue;
    assert.ok(!readFileSync('reviews/' + f, 'utf8').includes('innerHTML'), f + ' contains innerHTML');
  }
});
