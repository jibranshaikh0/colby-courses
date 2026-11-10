// Pure scoring for Rate A Mule student reviews. No DOM, no network.
// review_score = (mean(answered) - 3) / 2, range [-1, +1], positive = easier.
// Inspired by the Dartmouth/Layup -1..+1 range only; not their method, not validated against it.

export function isValidAnswer(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

// Returns { ok, errors } - a review with any error must be rejected, never stored.
export function validateAnswers(answers, questions) {
  const errors = [];
  for (const q of questions) {
    const v = answers[q.id];
    if (v === null || v === undefined) {
      if (q.required) errors.push(q.id + ': missing required answer');
    } else if (!isValidAnswer(v)) {
      errors.push(q.id + ': out of range (need integer 1-5)');
    }
  }
  return { ok: errors.length === 0, errors };
}

// Returns the per-review score in [-1,+1] rounded to 3 decimals, or null when the
// review must not be scored (invalid input, missing required answers, or fewer than
// 3 answered questions as a defensive floor for future survey changes).
export function reviewScore(answers, questions) {
  const { ok } = validateAnswers(answers, questions);
  if (!ok) return null;
  const vals = [];
  for (const q of questions) {
    const v = answers[q.id];
    if (v !== null && v !== undefined) vals.push(v);
  }
  if (vals.length < 3) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(((mean - 3) / 2) * 1000) / 1000;
}

// Aggregate = plain mean of per-review scores (one reviewer, one vote).
// Returns null below the display gate (minN); the caller shows count-only.
export function aggregate(scores, minN = 5) {
  const vals = scores.filter((s) => s !== null && s !== undefined);
  if (vals.length < minN) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(mean * 1000) / 1000;
}

export function formatScore(s) {
  if (s === null || s === undefined) return 'n/a';
  if (Math.abs(s) < 0.005) return '0.00'; // matches index.html's zero guard
  return (s > 0 ? '+' : '') + s.toFixed(2);
}
