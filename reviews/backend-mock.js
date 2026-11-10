// MOCK backend adapter for Rate A Mule student reviews - LOCAL PREVIEW ONLY.
// Everything here runs in the browser against localStorage. Nothing is real:
// no email is sent, the "verification code" is shown on screen, accounts and
// reviews live only in this browser. It exists so the UI, survey, scoring,
// privacy gates and moderation flow can be exercised end-to-end before the
// account-owned real backend (Supabase) is set up. Never describe any behavior
// of this adapter as production passwordless auth.
import { QUESTIONS, SURVEY_VERSION } from './survey.js';
import { validateAnswers, reviewScore, aggregate } from './score.js';
import { MIN_REVIEWS_FOR_DISPLAY } from './config.js';

const LS_KEY = 'rateamule-reviews-mock-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || { users: [], reviews: [], reports: [] }; }
  catch { return { users: [], reviews: [], reports: [] }; }
}
function save(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
export function isColbyEmail(email) { return /^[^@\s]+@colby\.edu$/.test(normalizeEmail(email)); }

// MOCK sign-in: returns a code that the UI displays directly (no email exists here).
export function mockSendCode(email) {
  const e = normalizeEmail(email);
  if (!isColbyEmail(e)) return { ok: false, error: 'Only @colby.edu addresses are accepted.' };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const db = load();
  db.pending = { email: e, code, expires: Date.now() + 10 * 60 * 1000 };
  save(db);
  return { ok: true, mockCode: code };
}

export function mockVerifyCode(email, code) {
  const e = normalizeEmail(email);
  const db = load();
  const p = db.pending;
  if (!p || p.email !== e) return { ok: false, error: 'No code was requested for this address.' };
  if (Date.now() > p.expires) return { ok: false, error: 'Code expired. Request a new one.' };
  if (String(code).trim() !== p.code) return { ok: false, error: 'Wrong code.' };
  let user = db.users.find((u) => u.email === e);
  if (!user) { user = { id: 'u' + (db.users.length + 1) + '-' + Math.random().toString(36).slice(2, 8), email: e }; db.users.push(user); }
  db.pending = null;
  db.session = { userId: user.id };
  save(db);
  return { ok: true, user: { id: user.id, email: user.email } };
}

export function currentUser() {
  const db = load();
  if (!db.session) return null;
  const u = db.users.find((x) => x.id === db.session.userId);
  return u ? { id: u.id, email: u.email } : null;
}

export function signOut() {
  const db = load(); db.session = null; save(db);
}

// First-review pre-moderation, mirrored from the plan: a user's first review stays
// 'pending' (visible only to them); later reviews publish immediately.
export function submitReview(user, { courseId, instructorId = null, term, answers, comment } = {}) {
  const db = load();
  const text = String(comment ?? '');
  const cleanAnswers = {};
  for (const q of QUESTIONS) {
    if (answers && q.id in Object(answers)) cleanAnswers[q.id] = answers[q.id];
  }
  const { ok, errors } = validateAnswers(cleanAnswers, QUESTIONS);
  if (!ok) return { ok: false, errors };
  if (text.length > 1500) return { ok: false, errors: ['comment: too long (max 1500)'] };
  const dupe = db.reviews.find((r) =>
    r.userId === user.id && r.courseId === courseId &&
    r.instructorId === instructorId && r.term === term && r.status !== 'deleted');
  if (dupe) return { ok: false, errors: ['You already reviewed this course/instructor/term.'] };
  const hasPublished = db.reviews.some((r) => r.userId === user.id && r.status === 'published');
  const review = {
    id: 'r' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    userId: user.id, courseId, instructorId, term,
    surveyVersion: SURVEY_VERSION,
    answers: cleanAnswers, comment: text,
    score: reviewScore(answers, QUESTIONS),
    status: hasPublished ? 'published' : 'pending',
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);
  save(db);
  return { ok: true, review };
}

// Public path: published only, never exposes userId/email. Privacy gate: below
// MIN_REVIEWS_FOR_DISPLAY the caller gets a count only - no scores, no comments.
export function publicStats(courseId, instructorId = null) {
  const db = load();
  const rows = db.reviews.filter((r) =>
    r.courseId === courseId && r.instructorId === instructorId && r.status === 'published');
  const n = rows.length;
  if (n < MIN_REVIEWS_FOR_DISPLAY) return { n, gated: true, score: null, comments: [] };
  return {
    n, gated: false,
    score: aggregate(rows.map((r) => r.score), MIN_REVIEWS_FOR_DISPLAY),
    limited: n < 10,
    comments: rows.filter((r) => r.comment).map((r) => ({ id: r.id, term: r.term, comment: r.comment })),
  };
}

// Author view: a signed-in user sees their own reviews including pending.
export function myReviews(user, courseId, instructorId = null) {
  const db = load();
  return db.reviews.filter((r) =>
    r.userId === user.id && r.courseId === courseId &&
    r.instructorId === instructorId && r.status !== 'deleted');
}

// MOCK moderation action, standing in for the account-owned moderator queue:
// publish approves a pending review, hide removes it from the public view.
export function mockModerate(reviewId, action) {
  const db = load();
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) return { ok: false, error: 'Review not found.' };
  if (action === 'publish') review.status = 'published';
  else if (action === 'hide') review.status = 'hidden';
  else return { ok: false, error: 'Unknown moderation action.' };
  save(db);
  return { ok: true, status: review.status };
}

export function reportReview(reporter, reviewId) {
  const db = load();
  const review = db.reviews.find((r) => r.id === reviewId);
  if (!review) return { ok: false, error: 'Review not found.' };
  if (review.userId === reporter.id) return { ok: false, error: 'You cannot report your own review.' };
  if (review.status !== 'published') return { ok: false, error: 'This review is not public.' };
  if (db.reports.some((x) => x.reviewId === reviewId && x.reporterId === reporter.id)) {
    return { ok: false, error: 'You already reported this review.' };
  }
  db.reports.push({ reviewId, reporterId: reporter.id, at: new Date().toISOString() });
  const distinct = new Set(db.reports.filter((x) => x.reviewId === reviewId).map((x) => x.reporterId));
  // Only a published review can be auto-hidden; a moderator's hide is never undone here.
  if (distinct.size >= 3 && review.status === 'published') review.status = 'pending';
  save(db);
  return { ok: true, hidden: distinct.size >= 3 };
}
