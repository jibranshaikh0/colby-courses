// Student reviews UI. User-generated content is rendered with textContent only -
// never innerHTML - so review text cannot inject markup.
//
// Two simulated display modes share this module:
// - developer preview (localhost): "LOCAL MOCK PREVIEW" wording;
// - public TEST MODE (?reviewsTest=1, ctx.testMode): "TEST SIMULATION" wording,
//   simulated sign-in, and NO claims of real accounts, email or verification.
import { QUESTIONS, FOOTNOTE } from './survey.js';
import { MIN_REVIEWS_FOR_DISPLAY } from './config.js';
import { formatScore } from './score.js';
import { backend } from './api.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

export function mountStudentReviews(cardBody, ctx) {
  const root = el('div', 'student-reviews');
  cardBody.appendChild(root);
  render(root, ctx);
}

// Persistent banner pinned to the top of every view while public test mode is
// active. Unmistakable by design: navy bar, gold rule, plain-language wording.
export function mountTestBanner(doc, { onExit }) {
  const bar = el('div', 'sr-testbanner');
  bar.setAttribute('role', 'status');
  bar.appendChild(el('span', 'sr-testbanner-text',
    'TEST MODE - student reviews preview. Nothing is sent: all data stays in this browser. Identity is SIMULATED - no real accounts, no email.'));
  const exit = el('button', 'sr-testbanner-exit', 'Exit test mode');
  exit.type = 'button';
  exit.addEventListener('click', onExit);
  bar.appendChild(exit);
  doc.body.prepend(bar);
  doc.body.classList.add('sr-testmode');
  return bar;
}

// Explicit opt-in shown before any review UI appears in public test mode.
// Returns the gate element so the caller can remove it after entry.
export function mountTestOptIn(container, { onEnter, onLeave }) {
  const gate = el('div', 'sr-testgate');
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-labelledby', 'sr-testgate-title');
  const card = el('div', 'sr-testgate-card');
  const title = el('h2', 'sr-testgate-title', 'Student reviews - public test');
  title.id = 'sr-testgate-title';
  card.appendChild(title);
  card.appendChild(el('p', 'sr-testgate-lede',
    'This link opens the student-reviews preview in TEST MODE. Before anything appears:'));

  const facts = [
    'Nothing you enter is sent anywhere. Test data stays in this browser only, in storage reserved for this test.',
    'Sign-in and identity are SIMULATED. There are no real accounts, no email is sent and nothing is verified.',
    "Reviews and scores here are simulated and kept separate from the site's imported RateMyProfessors data.",
  ];
  const ul = el('ul', 'sr-testgate-facts');
  for (const f of facts) ul.appendChild(el('li', null, f));
  card.appendChild(ul);

  const agree = el('label', 'sr-testgate-agree');
  const cb = el('input'); cb.type = 'checkbox';
  agree.appendChild(cb);
  agree.appendChild(el('span', null, ' I understand this is a simulation: nothing is sent or saved outside this browser.'));
  card.appendChild(agree);

  const row = el('div', 'sr-testgate-actions');
  const enter = el('button', 'sr-btn sr-btn-primary', 'Enter test mode');
  enter.type = 'button'; enter.disabled = true;
  cb.addEventListener('change', () => { enter.disabled = !cb.checked; });
  enter.addEventListener('click', onEnter);
  const leave = el('button', 'sr-btn', 'Leave');
  leave.type = 'button';
  leave.addEventListener('click', onLeave);
  row.appendChild(enter); row.appendChild(leave);
  card.appendChild(row);
  gate.appendChild(card);
  container.prepend(gate);
  return gate;
}

function render(root, ctx) {
  root.textContent = '';
  const testMode = ctx.testMode === true;
  const user = backend.currentUser();

  const head = el('p', 'sr-head',
    testMode ? 'Student reviews (Rate A Mule)'
             : 'Student reviews (Rate A Mule, Colby email verified)');
  if (backend.kind === 'mock') {
    head.appendChild(el('span', 'sr-mock', testMode
      ? 'TEST SIMULATION - no real accounts, no email, nothing leaves this browser'
      : 'LOCAL MOCK PREVIEW - no email is sent, nothing leaves this browser'));
  }
  root.appendChild(head);

  // Public stats block (privacy gate: count-only below the threshold).
  const stats = backend.publicStats(ctx.courseId, ctx.instructorId);
  const box = el('div', 'sr-stats');
  if (stats.n === 0) {
    box.appendChild(el('p', 'sr-none', 'No student reviews yet.'));
  } else if (stats.gated) {
    box.appendChild(el('p', 'sr-gate', stats.n + ' student review' + (stats.n === 1 ? '' : 's') +
      ' - scores and comments appear once ' + MIN_REVIEWS_FOR_DISPLAY + ' are published.'));
  } else {
    const line = el('p', 'sr-score');
    line.appendChild(el('span', 'sr-value', 'Student score: ' + formatScore(stats.score)));
    line.appendChild(document.createTextNode(' (easier ↑ / harder ↓)  n = ' + stats.n + ' reviews '));
    if (stats.limited) line.appendChild(el('span', 'sr-limited', 'Limited data'));
    box.appendChild(line);
    const ul = el('ul', 'sr-comments');
    for (const c of stats.comments) {
      const li = el('li', 'sr-comment');
      li.appendChild(el('span', 'sr-term', c.term + ': '));
      li.appendChild(el('span', 'sr-text', c.comment));
      if (user) {
        const btn = el('button', 'sr-report', 'Report');
        btn.type = 'button';
        btn.addEventListener('click', () => {
          const r = backend.reportReview(user, c.id);
          if (r.ok && r.hidden) btn.textContent = 'Hidden pending moderation';
          else if (r.ok) btn.textContent = 'Reported';
          else btn.textContent = r.error;
          btn.disabled = true;
        });
        li.appendChild(btn);
      }
      ul.appendChild(li);
    }
    box.appendChild(ul);
  }
  root.appendChild(box);
  root.appendChild(el('p', 'sr-foot', FOOTNOTE));

  if (user) {
    root.appendChild(el('p', 'sr-user',
      (testMode ? 'Signed in (simulated) as ' : 'Signed in (mock) as ') + user.email));
    const out = el('button', 'sr-btn', 'Sign out');
    out.type = 'button';
    out.addEventListener('click', () => { backend.signOut(); render(root, ctx); });
    root.appendChild(out);
    root.appendChild(buildForm(root, ctx, user));
    const mine = backend.myReviews(user, ctx.courseId, ctx.instructorId);
    if (mine.length) {
      const ul = el('ul', 'sr-mine');
      for (const r of mine) {
        ul.appendChild(el('li', 'sr-minerow',
          'Your review: score ' + formatScore(r.score) + ' - ' +
          (r.status === 'pending' ? 'pending moderation (only you can see it)' : r.status)));
      }
      root.appendChild(ul);
    }
  } else {
    root.appendChild(buildSignIn(root, ctx, testMode));
  }
}

function buildSignIn(root, ctx, testMode) {
  const wrap = el('div', 'sr-signin');
  wrap.appendChild(el('p', 'sr-label', testMode
    ? 'Simulated sign-in: enter any @colby.edu-shaped address to try the review flow. No email exists in this test and nothing is verified.'
    : 'Sign in with your @colby.edu email to leave a review.'));
  const email = el('input', 'sr-input'); email.type = 'email'; email.placeholder = 'you@colby.edu';
  const send = el('button', 'sr-btn', testMode ? 'Get test code' : 'Send code'); send.type = 'button';
  const msg = el('p', 'sr-msg');
  send.addEventListener('click', () => {
    const r = backend.sendCode(email.value);
    if (!r.ok) { msg.textContent = r.error; return; }
    msg.textContent = '';
    // SIMULATED: the code is shown on screen because no email exists in the mock.
    const notice = el('p', 'sr-mockcode', (testMode
      ? 'SIMULATED: no email was sent. Your test code is '
      : 'MOCK: no email was sent. Your code is ') + r.mockCode);
    wrap.appendChild(notice);
    const code = el('input', 'sr-input'); code.inputMode = 'numeric'; code.placeholder = '6-digit code';
    const verify = el('button', 'sr-btn', 'Verify'); verify.type = 'button';
    verify.addEventListener('click', () => {
      const v = backend.verifyCode(email.value, code.value);
      if (!v.ok) { msg.textContent = v.error; return; }
      render(root, ctx);
    });
    wrap.appendChild(code); wrap.appendChild(verify);
  });
  wrap.appendChild(email); wrap.appendChild(send); wrap.appendChild(msg);
  return wrap;
}

function buildForm(root, ctx, user) {
  const form = el('div', 'sr-form');
  form.appendChild(el('p', 'sr-label', 'Your review (1 = hardest, 5 = easiest for every question)'));
  const answers = {};
  for (const q of QUESTIONS) {
    const fs = el('fieldset', 'sr-q');
    fs.appendChild(el('legend', 'sr-qtext', q.text + (q.required ? '' : ' (optional)')));
    for (let v = 1; v <= 5; v++) {
      const lab = el('label', 'sr-opt');
      const radio = el('input'); radio.type = 'radio'; radio.name = 'sr-' + q.id; radio.value = String(v);
      radio.addEventListener('change', () => { answers[q.id] = v; });
      lab.appendChild(radio);
      lab.appendChild(el('span', 'sr-num', String(v)));
      lab.appendChild(el('span', 'sr-anchor', q.anchors[v - 1]));
      fs.appendChild(lab);
    }
    form.appendChild(fs);
  }
  const comment = el('textarea', 'sr-textarea'); comment.maxLength = 1500;
  comment.placeholder = 'Optional short comment (max 1500 chars)';
  form.appendChild(comment);
  const termWrap = el('label', 'sr-term-pick');
  termWrap.appendChild(el('span', 'sr-label', 'Term you took the course: '));
  const termSel = el('select', 'sr-input');
  for (const t of ['Fall 2026', 'Spring 2026', 'Fall 2025', 'Spring 2025', 'Earlier']) {
    const o = el('option', null, t); o.value = t;
    if (t === ctx.term) o.selected = true;
    termSel.appendChild(o);
  }
  termWrap.appendChild(termSel);
  form.appendChild(termWrap);
  const attest = el('label', 'sr-attest');
  const cb = el('input'); cb.type = 'checkbox';
  attest.appendChild(cb);
  attest.appendChild(el('span', null, ' I took this course in the term selected above.'));
  form.appendChild(attest);
  const msg = el('p', 'sr-msg');
  const submit = el('button', 'sr-btn sr-btn-primary', 'Submit review'); submit.type = 'button';
  submit.addEventListener('click', () => {
    msg.textContent = '';
    if (!cb.checked) { msg.textContent = 'Please confirm you took this course.'; return; }
    const r = backend.submitReview(user, {
      courseId: ctx.courseId, instructorId: ctx.instructorId, term: termSel.value,
      answers, comment: comment.value,
    });
    if (!r.ok) { msg.textContent = r.errors.join(' '); return; }
    render(root, ctx);
  });
  form.appendChild(submit); form.appendChild(msg);
  return form;
}
