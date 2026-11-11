import { test } from 'node:test';
import assert from 'node:assert/strict';

// localStorage shim for Node (shared by every module instance below)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

// Minimal DOM stub - enough for ui.js (createElement/createTextNode/appendChild/
// textContent/addEventListener). Lets us walk a rendered tree in Node.
class StubEl {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.listeners = {};
    this.attrs = {};
    this.className = '';
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    };
  }
  appendChild(c) { this.children.push(c); return c; }
  prepend(c) { this.children.unshift(c); return c; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  remove() { this.removed = true; }
  set textContent(v) { this.children = v === '' ? [] : [{ text: String(v) }]; }
  get textContent() {
    return this.children.map((c) => (c.text !== undefined ? c.text : c.textContent)).join('');
  }
}
globalThis.document = {
  createElement: (t) => new StubEl(t),
  createTextNode: (t) => ({ text: String(t) }),
};

const mock = await import('./backend-mock.js');
const ui = await import('./ui.js');
const { TEST_STORAGE_KEY } = await import('./config.js');

const ANS = { q1: 4, q2: 3, q3: 5, q4: 4, q5: null };
const TERM = 'Fall 2026';

function freshUser(email) {
  const s = mock.mockSendCode(email);
  assert.equal(s.ok, true, email);
  const v = mock.mockVerifyCode(email, s.mockCode);
  assert.equal(v.ok, true);
  return v.user;
}

function walk(n, fn) {
  if (!n) return;
  fn(n);
  (n.children || []).forEach((c) => walk(c, fn));
}

test('test namespace is isolated from the developer-preview namespace', () => {
  localStorage.clear();
  mock.useStorageKey(TEST_STORAGE_KEY);
  const u = freshUser('iso@colby.edu');
  const r = mock.submitReview(u, { courseId: 'I1', instructorId: null, term: TERM, answers: ANS });
  mock.mockModerate(r.review.id, 'publish');
  mock.useStorageKey(mock.MOCK_STORAGE_KEY);
  assert.equal(mock.publicStats('I1', null).n, 0, 'preview namespace sees no test data');
  assert.equal(mock.currentUser(), null, 'preview namespace has no test session');
  mock.useStorageKey(TEST_STORAGE_KEY);
  assert.equal(mock.publicStats('I1', null).n, 1);
  assert.equal(mock.currentUser()?.email, 'iso@colby.edu');
});

test('simulated session and reviews persist across a module reload (browser restart)', async () => {
  localStorage.clear();
  mock.useStorageKey(TEST_STORAGE_KEY);
  const u = freshUser('stay@colby.edu');
  const r = mock.submitReview(u, { courseId: 'P1', instructorId: null, term: TERM, answers: ANS });
  assert.equal(r.ok, true);
  // A fresh module instance = a new page load against the same localStorage.
  const fresh = await import('./backend-mock.js?reload=1');
  fresh.useStorageKey(TEST_STORAGE_KEY);
  assert.equal(fresh.currentUser()?.email, 'stay@colby.edu');
  assert.equal(fresh.myReviews(u, 'P1', null).length, 1);
  assert.ok(store.has(TEST_STORAGE_KEY), 'data lives under the test key');
  assert.equal(store.has(mock.MOCK_STORAGE_KEY), false, 'preview key untouched');
});

test('public stats never expose user ids or emails (input privacy)', () => {
  localStorage.clear();
  mock.useStorageKey(TEST_STORAGE_KEY);
  for (let i = 0; i < 5; i++) {
    const u = freshUser('priv' + i + '@colby.edu');
    const first = mock.submitReview(u, { courseId: 'PV0', instructorId: null, term: TERM, answers: ANS });
    mock.mockModerate(first.review.id, 'publish');
    mock.submitReview(u, { courseId: 'PV1', instructorId: null, term: TERM, answers: ANS, comment: 'note ' + i });
  }
  const stats = mock.publicStats('PV1', null);
  assert.equal(stats.gated, false);
  const json = JSON.stringify(stats);
  assert.ok(!json.includes('@'), 'no email addresses in the public payload');
  assert.ok(!json.includes('userId'), 'no user ids in the public payload');
  for (const c of stats.comments) assert.deepEqual(Object.keys(c).sort(), ['comment', 'id', 'term']);
});

test('XSS payloads are stored verbatim and render as text only (no img/script nodes)', () => {
  localStorage.clear();
  mock.useStorageKey(TEST_STORAGE_KEY);
  const payload = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  for (let i = 0; i < 5; i++) {
    const u = freshUser('x' + i + '@colby.edu');
    const first = mock.submitReview(u, { courseId: 'XS0', instructorId: null, term: TERM, answers: ANS });
    mock.mockModerate(first.review.id, 'publish');
    mock.submitReview(u, {
      courseId: 'XS1', instructorId: null, term: TERM, answers: ANS,
      comment: i === 0 ? payload : 'ordinary comment ' + i,
    });
  }
  // stored verbatim (no silent mutation), rendered as text (no markup)
  assert.ok(JSON.stringify(store.get(TEST_STORAGE_KEY)).includes(payload));
  const card = new StubEl('div');
  ui.mountStudentReviews(card, { courseId: 'XS1', instructorId: null, term: TERM, testMode: true });
  let bad = 0;
  let foundPayload = false;
  walk(card, (n) => {
    if (n.tagName === 'IMG' || n.tagName === 'SCRIPT') bad++;
    if (n.text !== undefined && n.text.includes('<img src=x onerror=')) foundPayload = true;
  });
  assert.equal(bad, 0, 'payload never becomes an element');
  assert.equal(foundPayload, true, 'payload shows as plain text');
});

test('test-mode UI carries SIMULATED wording and no verification claims', () => {
  localStorage.clear();
  mock.useStorageKey(TEST_STORAGE_KEY);
  const card = new StubEl('div');
  ui.mountStudentReviews(card, { courseId: 'W1', instructorId: null, term: TERM, testMode: true });
  const all = card.textContent;
  assert.ok(/SIMULATED|SIMULATION/.test(all), 'simulated wording present');
  assert.ok(!/Colby email verified/.test(all), 'no email-verified claim in test mode');
  assert.ok(!/verified student/i.test(all), 'no verified-student claim in test mode');
  // banner and opt-in furniture
  const body = new StubEl('body');
  const gate = ui.mountTestOptIn(body, { onEnter: () => {}, onLeave: () => {} });
  assert.ok(/TEST MODE/.test(gate.textContent));
  assert.ok(/SIMULATED/.test(gate.textContent));
  const bar = ui.mountTestBanner({ body }, { onExit: () => {} });
  assert.ok(/TEST MODE/.test(bar.textContent));
  assert.ok(/SIMULATED/.test(bar.textContent));
});

test('opt-in gate blocks review UI until explicit entry (boot control flow)', async () => {
  localStorage.clear();
  const head = new StubEl('head');
  const body = new StubEl('body');
  const cardBody = new StubEl('div');
  const openCard = {
    tagName: 'DETAILS', open: true, dataset: { id: 'AA120B-A' },
    classList: { contains: (c) => c === 'course' },
    querySelector: (sel) => {
      if (sel === '.student-reviews') return cardBody.children.find((c) => c.className === 'student-reviews') || null;
      if (sel === '.card-body') return cardBody;
      if (sel === '.sum-title .code') return { textContent: 'AA 120B-A' };
      return null;
    },
  };
  globalThis.location = { search: '?reviewsTest=1', hostname: 'rateamule.me', href: 'https://rateamule.me/?reviewsTest=1' };
  globalThis.document = {
    createElement: (t) => new StubEl(t),
    createTextNode: (t) => ({ text: String(t) }),
    head, body,
    addEventListener: () => {},
    querySelectorAll: (sel) => (sel === 'details.course[open]' ? [openCard] : []),
  };
  await import('./boot.js?gate=1');
  const gate = body.children.find((c) => c.className === 'sr-testgate');
  assert.ok(gate, 'opt-in gate is shown');
  assert.equal(cardBody.children.length, 0, 'no review UI mounts before opt-in');
  assert.ok(!body.children.find((c) => c.className === 'sr-testbanner'), 'no banner before opt-in');
  // explicit entry: tick the checkbox, then click "Enter test mode"
  let checkbox, enter;
  walk(gate, (n) => {
    if (n.tagName === 'INPUT' && n.listeners.change) checkbox = n;
    if (n.tagName === 'BUTTON' && n.textContent === 'Enter test mode') enter = n;
  });
  assert.ok(checkbox && enter);
  assert.equal(enter.disabled, true, 'enter stays disabled until the box is ticked');
  checkbox.checked = true;
  checkbox.listeners.change.forEach((f) => f());
  assert.equal(enter.disabled, false);
  enter.listeners.click.forEach((f) => f());
  assert.ok(gate.removed, 'gate removed after entry');
  assert.ok(body.children.find((c) => c.className === 'sr-testbanner'), 'banner appears after entry');
  assert.ok(cardBody.children.find((c) => c.className === 'student-reviews'), 'review UI mounts after entry');
});

test('stored opt-in activates test mode directly on later loads', async () => {
  localStorage.clear();
  localStorage.setItem('rateamule-reviews-test-optin', '1');
  const head = new StubEl('head');
  const body = new StubEl('body');
  globalThis.location = { search: '?reviewsTest=1', hostname: 'rateamule.me', href: 'https://rateamule.me/?reviewsTest=1' };
  globalThis.document = {
    createElement: (t) => new StubEl(t),
    createTextNode: (t) => ({ text: String(t) }),
    head, body,
    addEventListener: () => {},
    querySelectorAll: () => [],
  };
  await import('./boot.js?gate=2');
  assert.ok(!body.children.find((c) => c.className === 'sr-testgate'), 'no second gate');
  assert.ok(body.children.find((c) => c.className === 'sr-testbanner'), 'banner shows directly');
});

test('no network primitives anywhere in reviews/ (grep)', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const pat = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|import\s*\(\s*['"]https?:/;
  for (const f of readdirSync('reviews')) {
    if (!/\.js$/.test(f) || f.endsWith('.test.js')) continue;
    assert.ok(!pat.test(readFileSync('reviews/' + f, 'utf8')), f + ' references the network');
  }
});
