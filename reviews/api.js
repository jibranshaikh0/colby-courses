// Backend adapter. 'mock' = local preview only (see backend-mock.js header).
// 'supabase' is reserved for the account-owned real backend and is NOT implemented
// here; selecting it before setup fails loudly rather than pretending to work.
import { BACKEND } from './config.js';
import * as mock from './backend-mock.js';

function notConfigured() {
  throw new Error('Supabase backend is not configured. The account-owned project, custom SMTP and Turnstile setup must happen first; use BACKEND="mock" for local preview.');
}

export const backend = BACKEND === 'mock' ? {
  kind: 'mock',
  isColbyEmail: mock.isColbyEmail,
  sendCode: mock.mockSendCode,
  verifyCode: mock.mockVerifyCode,
  currentUser: mock.currentUser,
  signOut: mock.signOut,
  submitReview: mock.submitReview,
  publicStats: mock.publicStats,
  myReviews: mock.myReviews,
  reportReview: mock.reportReview,
  moderate: mock.mockModerate,
} : {
  kind: 'supabase',
  isColbyEmail: mock.isColbyEmail,
  sendCode: notConfigured, verifyCode: notConfigured, currentUser: notConfigured,
  signOut: notConfigured, submitReview: notConfigured, publicStats: notConfigured,
  myReviews: notConfigured, reportReview: notConfigured, moderate: notConfigured,
};
