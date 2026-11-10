// Flag-gated entry point. With REVIEWS_ENABLED false this module loads and does
// nothing, so every phase can merge dark. The ?reviewsPreview=1 query parameter
// enables the UI for LOCAL PREVIEW ONLY and must be removed before shipping.
import { REVIEWS_ENABLED } from './config.js';
import { mountStudentReviews } from './ui.js';

const preview = new URLSearchParams(location.search).has('reviewsPreview');
if (REVIEWS_ENABLED || preview) {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'reviews/reviews.css';
  document.head.appendChild(css);
  document.addEventListener('toggle', (ev) => {
    const d = ev.target;
    if (d.tagName === 'DETAILS' && d.classList.contains('course') && d.open &&
        !d.querySelector('.student-reviews')) {
      const body = d.querySelector('.card-body');
      if (body) mountStudentReviews(body, {
        courseId: d.dataset.id,
        instructorId: null, // working default: course-level; course+instructor is open question 7
        term: 'Fall 2026',
      });
    }
  }, true);
}
