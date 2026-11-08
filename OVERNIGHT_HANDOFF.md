# OVERNIGHT_HANDOFF.md - Colby Courses

**Status: LIVE.** Production https://rateamule.me/ now serves `main` 080ee02 (verified live 2026-11-08).

This documentation update reflects the state verified on 2026-11-08: production serves `main` `080ee02`, and the
screenshots and commit graph in `docs/` are historical snapshots of `ef61adb` from before that update.

## What shipped since the previous handoff

- Landing view and catalog improvements.
- Exact meeting-pattern filter (replaces any "meets on a day" filter) and grouping by meeting pattern.
- Subject labels (`CODE: Name`) with per-code provenance in `subject-names.md` (public main `443709a`).
- Campus lawn/tower landing background (`39d33c9`).
- Ratings-unavailable fix (`74f9232`), landing error surface fix (`6e179cf`) and README meeting-pattern
  wording (`5f643a4`).
- `CNAME` and the custom domain rateamule.me.
- "Rate A Mule" hero and title, and brand assets: favicon (SVG and PNG), apple-touch-icon, and og-image,
  plus Open Graph and Twitter link-preview metadata.

## Verification summary

**Reviews.** The redesign build was checked with a scoped verification covering data correctness; filter and
search behavior, compared against an independent model; ratings attribution per professor-course; axe
accessibility (0 violations); contrast and no-overflow layout at 1440, 390 and 320 px in light and dark; error
and failure paths; and hostile-data XSS probes.

**Open findings after retest:** Critical 0, High 0, Medium 2, Low 16, Info 11.

Open Mediums:

- Same-hash navigation links do nothing: top-nav links that target the already-active view, including the
  URL-state half. No ruling yet.
- RESOLVED by `080ee02` (live): course codes typed without a space found nothing. Deferred at review time;
  this is a specific fix resolution, not a global QA clearance. See "Post-delivery fixes".

Closed and verified during retest:

- The removed "Meets on" day filter: closed by a written project ruling (Nov 7, 2026); README corrected.
- Ratings-failure false zeros: fixed. The landing shows "unavailable" plus a notice.
- Invisible course-data failure: fixed. The landing shows an alert, unavailable stats and disabled controls.

Notable Lows: malformed-but-parseable data files (junk arrays) can still display false zeros, and focus
falls to `<body>` after a landing link is used in the data-failure state. Notable Infos: raw parser text in
the error message presentation, and minor documentation nits.

**Design choice, not a bug:** a valid but EMPTY ratings array (`[]`) deliberately shows 861/0/0 with no
notice.

**Test environment and limits.** Linux container, headless Chromium 153 via Playwright, axe-core 4.10.2;
light and dark at 1440, 390 and 320 px widths. No Safari, Firefox or real-device testing was performed.

**Branding patch.** The Rate A Mule branding patch was verified separately from the main build verification. It apply-checked clean against 0ad7f1a, and the hero, the titles and the 4 brand
assets were verified live over HTTP (200) on the production domain.

### Ponytail audit limits

- A Ponytail audit (upstream project v5.3.3) was performed manually using the upstream audit guidance.
- The Ponytail plugin itself was not installed and its code was not executed.
- Ponytail's advertised token/cost savings were not tested; no savings claim is made.
- Cleanup after the audit was reported but not independently verified as exhaustive.
- Its findings overlapped the review findings: its top finding is the spaceless course-code search issue (the
  Medium deferred at review, resolved by `080ee02`); its failure-state findings correspond to the landed
  fixes `74f9232` and `6e179cf`; the rest were deferred as recorded.

## Post-delivery fixes (search/footer fix LIVE in `080ee02`, verified live 2026-11-08)

- After delivery, a report came in that searching `cs231` returned CS 166-A (its description mentions CS231)
  instead of the real CS 231 sections. Root cause, confirmed in the shipped code: search was a plain
  case-insensitive substring match over section, instructor, description and owner text, so compact codes only
  matched accidental description mentions and spaced codes only matched exact spacing.
- The fix shipped as an incremental patch: course-code-aware matching. A bare code returns all lectures and
  labs of the course, case- and space-insensitive, with section-letter and lab qualifiers. Free-text search and
  all filters are unchanged. Verified against the live dataset (861 sections): `cs231` and `CS 231` return
  exactly the 4 CS 231 sections, `ec133` returns all 6, `cs166` returns CS 166-A, lab queries like `cs231l`
  return the 2 lab sections, and free text is unchanged.
- The same patch adds "and Humza Sehbai" to the footer Made-by line. All existing credits and thanks are
  preserved verbatim.
- The search/footer patch is merged and live (`080ee02`, verified 2026-11-08) and resolves the deferred
  spaceless-codes Medium.
