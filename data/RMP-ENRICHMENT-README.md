# RMP Enrichment for Colby Courses (Fall 2026)

Package contents:
- `rmp-course-ratings-fall2026.json` - course-specific ratings, one entry per Fall 2026 section.
- `build_rmp_enrichment.py` - the exact, self-contained script that produced it (queries embedded).
- `rmp_teachers.json` - raw GraphQL response: all 460 Colby College teachers on RMP.
- `rmp_reviews.json` - raw GraphQL responses: 1,467 reviews across the 169 name-matched teachers. This is a REDUCED snapshot, not the full pull: 5 duplicate RMP ids collapsed and teachers with no name match are omitted. For the complete set, rerun `python3 build_rmp_enrichment.py --fetch` (pulls all 460 teachers), then rerun `python3 build_rmp_enrichment.py` to rebuild.
- `courses-fall2026.json` - the repo's own input data (Workday Fall 2026 sections).

Reproduce: `python3 build_rmp_enrichment.py` (offline, uses bundled raw inputs).
Refetch raw inputs: `python3 build_rmp_enrichment.py --fetch` downloads raw inputs only (hits the live RMP endpoint, all 460 teachers); run `python3 build_rmp_enrichment.py` again afterward to rebuild the output.

## Source

RateMyProfessors public GraphQL endpoint, https://www.ratemyprofessors.com/graphql,
fetched 2026-11-08. School: Colby College, id U2Nob29sLTI1MA== (legacyId 250, Waterville ME).
Queries (TeacherSearch list + TeacherRatingsPageQuery) are embedded verbatim in the script.
Every review in the output carries its RMP `id`/`legacyId` for audit.

## Attribution rules

A review counts toward a section ONLY if both hold:
- the review's professor IS that section's instructor per Workday, and
- the review's course code equals that section's course code (subject+number, e.g. CS152).
No cross-professor pooling, no career-wide averages anywhere in the output.
Reviews from any term count (same professor, same course); no date restriction applied.

## Professor identity matching (strict)

Full normalized first-name token equality plus exact normalized last name
(normalization: strip accents, lowercase, letters/spaces only; documented nickname map
in the script, e.g. Abby->Abigail). Matches that are last-name-only or have multiple
first-name candidates are EXCLUDED from scored data and listed per section as
`excluded: true` with the reason. 145 of 293 unique Fall 2026 instructors matched
under these rules; 148 excluded.

## Course-code normalization

Strip everything except A-Z0-9, uppercase; suffix letters preserved ("BI 279 L" -> BI279L).
The only alias applied is BIOxxx -> BIxxx, only when the BIO form is NOT a Fall-2026 code
and the BI form IS (RMP writes Biology as BIO, Workday as BI). No other equivalences.

## Layup List scale source

Vote values and score semantics: https://github.com/layuplist/layup-list
(apps/web/models/vote.py: difficulty votes easy=+1 ... hard=-1, summed per course).

## Metrics

`difficulty_n`, `quality_n`, `wta_n` are the per-metric denominators (reviews where that
field is present); averages divide by those counts. `easiness_proxy = (3 - avg_difficulty)/2`
maps RMP 1-5 difficulty onto [-1, +1], the vote-value units Dartmouth Layup List uses.
It is a linear PROXY, not a measured Dartmouth-equivalent score, and is never multiplied
by review volume (Layup List scores are raw Dartmouth vote counts).

## Coverage (this build)

- 145 of 293 unique Fall 2026 instructors strictly name-matched.
- 678 of the bundled matched-teacher reviews land on a Fall 2026 course code
  (the rest are courses not offered this term, so they cannot attach to any section).
- 110 of 861 sections have at least one direct professor-course review.
