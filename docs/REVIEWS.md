# Student reviews (Rate A Mule)

Status: in local development behind `REVIEWS_ENABLED` (default false) in `reviews/config.js`.
The full plan lives with the owning account; this file records the decisions baked into the code.

## Provenance rules (non-negotiable)

1. RMP data stays in its current files and build pipeline, read-only, attributed
   "RateMyProfessors (imported)". Nothing here modifies those files.
2. Student reviews are a NEW, separate data source. Every number is labeled with its
   source and its own count; there is no blended score, no combined n, no mixed sort key.
3. No wording implies the two scores are equivalent or that either is an official
   Layup List score. The required UI footnote is `FOOTNOTE` in `reviews/survey.js`.

## Survey and score

- Survey v1 (`reviews/survey.js`): 5 questions, Q1-Q4 required, Q5 optional, each rated
  1-5 with all five anchors labeled. Direction: 1 = hardest, 5 = easiest for every question.
- Per-review score: `(mean(answered) - 3) / 2` in [-1, +1] (`reviews/score.js`). Missing
  answers are rejected, never defaulted to 3. Out-of-range values are rejected, never coerced.
- Aggregate: plain mean of per-review scores, one reviewer one vote. Display gate: a course
  shows scores and comments only at 5+ published reviews; below that it shows the count only.

## Sign-in (mock now, real backend later)

- Plan recommendation: passwordless one-time code to a `@colby.edu` address, enforced
  server-side. Mailbox control does not prove current student status; the UI says
  "Colby email verified", never "verified student".
- TODAY everything runs through `reviews/backend-mock.js`, a LOCAL MOCK: no email is
  sent, the code is shown on screen, data lives in localStorage. Never describe mock
  behavior as production auth. `reviews/api.js` selects the adapter; the `supabase`
  option fails loudly until the account-owned project is set up.

## Privacy and moderation

- Public view never exposes user_id or email.
- A user's first review is `pending` until a moderator approves it; later reviews
  publish immediately. Users can never set their own status or role.
- Report flow: 3 distinct reporters auto-hide a review until moderation.
- User text is rendered with `textContent` only; `innerHTML` is banned in `reviews/`.

## Local preview

Serve the repo root (`python3 -m http.server`) and open the catalog with
`?reviewsPreview=1` appended, e.g. `http://localhost:8000/?reviewsPreview=1#/catalog`.
The query flag exists for local preview only and must be removed before shipping.

## Tests

`node --test 'reviews/*.test.js'` - golden scoring vectors, domain gate, pre-moderation,
dedupe, privacy gate, report auto-hide. (Note: `node --test reviews/` misruns the bare
directory; use the glob.)
