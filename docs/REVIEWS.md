# Student reviews (Rate A Mule)

Status: in local development behind `REVIEWS_ENABLED` (default false) in `reviews/config.js`.
A simulated PUBLIC TEST MODE (`?reviewsTest=1`, below) is available for UI testing.
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
  publish immediately. Users can never set their own status or role. (Mock: these
  rules are enforced by the mock adapter's code only; localStorage is user-editable,
  and `moderate` is exposed on the client adapter for preview. The real backend must
  enforce them server-side and keep moderation off the client adapter.)
- Report flow: 3 distinct reporters auto-hide a review until moderation.
- User text is rendered with `textContent` only; `innerHTML` is banned in `reviews/`
  (checked by a test that greps the directory).

## Local preview

Serve the repo root (`python3 -m http.server`) and open the catalog with
`?reviewsPreview=1` appended, e.g. `http://localhost:8000/?reviewsPreview=1#catalog`.
The query flag is honored ONLY on localhost/127.0.0.1, so it can never enable the mock
UI on the public site; removing it before shipping is still required.

## Public test mode

`?reviewsTest=1` opens the simulated UI on any host, for public UI testing only.
Safeguards baked in (`reviews/boot.js`, `reviews/ui.js`, `reviews/testmode.test.js`):

- Explicit opt-in: until the visitor reads the disclosure and clicks "Enter test
  mode", no review UI appears. The opt-in is stored in this browser only.
- A persistent TEST MODE banner stays pinned to the top of every view while test
  mode is active: no review or sign-in details are sent, test entries stay in
  this browser, identity is SIMULATED.
- Isolation: test accounts/reviews live in a separate localStorage namespace
  (`TEST_STORAGE_KEY` in `reviews/config.js`), never mixed with developer-preview
  data or the imported RMP files. "Exit test mode" wipes that namespace and the
  opt-in, then strips the query parameter.
- No verification claims: test-mode wording never says or implies real accounts,
  sent email, passwordless auth or verified status. Sign-in is labeled simulated
  and the on-screen code is labeled as not emailed.
- No network: a test greps `reviews/` for fetch/XHR/WebSocket/sendBeacon/EventSource
  and remote dynamic imports; the mock adapter is the only backend.

## Tests

`node --test 'reviews/*.test.js'` - golden scoring vectors, domain gate, pre-moderation,
dedupe, privacy gate, report auto-hide, storage isolation, simulated-session persistence
across reload, public-payload privacy (no ids/emails), XSS render-as-text, test-mode
simulated wording, no-network grep. (Note: `node --test reviews/` misruns the bare
directory; use the glob.)
