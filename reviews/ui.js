// Student reviews UI. User-generated content is rendered with textContent only -
// never innerHTML - so review text cannot inject markup.
import { QUESTIONS, FOOTNOTE } from './survey.js';
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

function render(root, ctx) {
  root.textContent = '';
  const user = backend.currentUser();

  const head = el('p', 'sr-head', 'Student reviews (Rate A Mule, Colby email verified)');
  if (backend.kind === 'mock') head.appendChild(el('span', 'sr-mock', 'LOCAL MOCK PREVIEW - no email is sent, nothing leaves this browser'));
  root.appendChild(head);

  // Public stats block (privacy gate: count-only below the threshold).
  const stats = backend.publicStats(ctx.courseId, ctx.instructorId);
  const box = el('div', 'sr-stats');
  if (stats.n === 0) {
    box.appendChild(el('p', 'sr-none', 'No student reviews yet.'));
  } else if (stats.gated) {
    box.appendChild(el('p', 'sr-gate', stats.n + ' student review' + (stats.n === 1 ? '' : 's') +
      ' - scores and comments appear once 5 are published.'));
  } else {
    const line = el('p', 'sr-score');
    line.appendChild(el('span', 'sr-value', 'Score: ' + formatScore(stats.score)));
    line.appendChild(document.createTextNode(' (easier \u2191 / harder \u2193)  n = ' + stats.n + ' reviews '));
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
    root.appendChild(el('p', 'sr-user', 'Signed in (mock) as ' + user.email));
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
    root.appendChild(buildSignIn(root, ctx));
  }
}

function buildSignIn(root, ctx) {
  const wrap = el('div', 'sr-signin');
  wrap.appendChild(el('p', 'sr-label', 'Sign in with your @colby.edu email to leave a review.'));
  const email = el('input', 'sr-input'); email.type = 'email'; email.placeholder = 'you@colby.edu';
  const send = el('button', 'sr-btn', 'Send code'); send.type = 'button';
  const msg = el('p', 'sr-msg');
  send.addEventListener('click', () => {
    const r = backend.sendCode(email.value);
    if (!r.ok) { msg.textContent = r.error; return; }
    msg.textContent = '';
    // MOCK ONLY: the code is shown on screen because no email exists in the mock.
    const notice = el('p', 'sr-mockcode', 'MOCK: no email was sent. Your code is ' + r.mockCode);
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
      lab.appendChild(el('span', 'sr-anchor', v + ' - ' + q.anchors[v - 1]));
      fs.appendChild(lab);
    }
    form.appendChild(fs);
  }
  const comment = el('textarea', 'sr-textarea'); comment.maxLength = 1500;
  comment.placeholder = 'Optional short comment (max 1500 chars)';
  form.appendChild(comment);
  const attest = el('label', 'sr-attest');
  const cb = el('input'); cb.type = 'checkbox';
  attest.appendChild(cb);
  attest.appendChild(el('span', null, ' I took this course in ' + ctx.term + '.'));
  form.appendChild(attest);
  const msg = el('p', 'sr-msg');
  const submit = el('button', 'sr-btn', 'Submit review'); submit.type = 'button';
  submit.addEventListener('click', () => {
    msg.textContent = '';
    if (!cb.checked) { msg.textContent = 'Please confirm you took this course.'; return; }
    const r = backend.submitReview(user, {
      courseId: ctx.courseId, instructorId: ctx.instructorId, term: ctx.term,
      answers, comment: comment.value,
    });
    if (!r.ok) { msg.textContent = r.errors.join(' '); return; }
    render(root, ctx);
  });
  form.appendChild(submit); form.appendChild(msg);
  return form;
}
