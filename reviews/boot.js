// Flag-gated entry point. With REVIEWS_ENABLED false this module loads and does
// nothing, so every phase can merge dark.
//
// Two simulated preview paths exist while the real backend remains account-owned
// work. Both run locally in the browser - no review or sign-in details are sent:
// - ?reviewsPreview=1, honored only on localhost/127.0.0.1: developer preview.
// - ?reviewsTest=1, honored on any host: PUBLIC TEST MODE. Requires an explicit
//   opt-in click, shows a persistent TEST MODE banner, keeps simulated data in
//   an isolated localStorage namespace, and never claims real accounts, email
//   or verification. "Exit test mode" wipes the namespace and the opt-in.
import { REVIEWS_ENABLED, TEST_STORAGE_KEY } from './config.js';
import { useStorageKey } from './backend-mock.js';
import { mountStudentReviews, mountTestBanner, mountTestOptIn } from './ui.js';

const TEST_OPTIN_KEY = 'rateamule-reviews-test-optin';

function stripTestParam() {
  const url = new URL(location.href);
  url.searchParams.delete('reviewsTest');
  location.href = url.toString();
}

function injectCss() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'reviews/reviews.css';
  document.head.appendChild(css);
}

function activate(testMode) {
  injectCss();
  if (testMode) {
    mountTestBanner(document, {
      onExit: () => {
        try {
          localStorage.removeItem(TEST_STORAGE_KEY);
          localStorage.removeItem(TEST_OPTIN_KEY);
        } catch { /* storage unavailable: the exit navigation still applies */ }
        stripTestParam();
      },
    });
  }
  function mountInto(d) {
    if (d.tagName !== 'DETAILS' || !d.classList.contains('course') || !d.open) return;
    if (d.querySelector('.student-reviews')) return;
    const body = d.querySelector('.card-body');
    if (!body) return;
    // The card's data-id is the section-level workday_id. Reviews key on the
    // course code instead (e.g. "AA 120B-A" -> "AA 120B") so sections share one
    // review pool and can reach the display gate. Cross-listed edge cases are a
    // Phase 0 check before any real data is collected.
    const codeEl = d.querySelector('.sum-title .code');
    const sectionCode = codeEl ? codeEl.textContent.trim() : d.dataset.id;
    mountStudentReviews(body, {
      courseId: sectionCode.replace(/-[^-]*$/, ''),
      sectionId: d.dataset.id,
      instructorId: null, // working default: course-level; course+instructor is open question 7
      term: 'Fall 2026',
      testMode,
    });
  }
  document.addEventListener('toggle', (ev) => mountInto(ev.target), true);
  // Cards opened before this module finished loading would have missed the toggle
  // event; sweep for them (and again once data has rendered).
  document.querySelectorAll('details.course[open]').forEach(mountInto);
  setTimeout(() => document.querySelectorAll('details.course[open]').forEach(mountInto), 1000);
}

const params = new URLSearchParams(location.search);
// The preview parameter is honored only on localhost, so a forgotten removal is
// harmless in production: the mock UI can never appear on the public site this way.
const devPreview = params.has('reviewsPreview') &&
  ['localhost', '127.0.0.1'].includes(location.hostname);

if (REVIEWS_ENABLED || devPreview) {
  activate(false);
} else if (params.has('reviewsTest')) {
  // Isolation first: every mock read/write below lands in the test namespace.
  useStorageKey(TEST_STORAGE_KEY);
  let optedIn = false;
  try { optedIn = localStorage.getItem(TEST_OPTIN_KEY) === '1'; } catch { /* treated as not opted in */ }
  if (optedIn) {
    activate(true);
  } else {
    injectCss();
    const gate = mountTestOptIn(document.body, {
      onEnter: () => {
        try { localStorage.setItem(TEST_OPTIN_KEY, '1'); } catch { /* the banner still makes the mode obvious */ }
        gate.remove();
        activate(true);
      },
      onLeave: stripTestParam,
    });
  }
}
