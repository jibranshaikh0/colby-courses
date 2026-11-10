// Flag-gated entry point. With REVIEWS_ENABLED false this module loads and does
// nothing, so every phase can merge dark. The ?reviewsPreview=1 query parameter
// enables the UI for LOCAL PREVIEW ONLY and must be removed before shipping.
import { REVIEWS_ENABLED } from './config.js';
import { mountStudentReviews } from './ui.js';

// The preview parameter is honored only on localhost, so a forgotten removal is
// harmless in production: the mock UI can never appear on the public site this way.
const preview = new URLSearchParams(location.search).has('reviewsPreview') &&
  ['localhost', '127.0.0.1'].includes(location.hostname);
if (REVIEWS_ENABLED || preview) {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'reviews/reviews.css';
  document.head.appendChild(css);
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
    });
  }
  document.addEventListener('toggle', (ev) => mountInto(ev.target), true);
  // Cards opened before this module finished loading would have missed the toggle
  // event; sweep for them (and again once data has rendered).
  document.querySelectorAll('details.course[open]').forEach(mountInto);
  setTimeout(() => document.querySelectorAll('details.course[open]').forEach(mountInto), 1000);
}
