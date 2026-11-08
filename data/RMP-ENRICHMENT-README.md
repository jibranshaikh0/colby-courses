# RMP Enrichment for Colby Courses (Fall 2026)

Package contents:
- `rmp-course-ratings-fall2026.json` - course-specific ratings, one entry per Fall 2026 section (861).
- `build_rmp_enrichment.py` - the exact, self-contained script that produces it (queries embedded).
- `rmp_teachers.json` - raw GraphQL response: all 460 Colby College teachers on RMP.
- `rmp_reviews.json` - raw GraphQL responses: 1,467 reviews across 169 RMP profiles. These are
  the 145 profiles used as strict matches plus 24 candidate profiles (same last name) that did
  NOT pass the strict rule and are therefore unused. This is a REDUCED snapshot, not the full
  pull: profiles with no name candidate are omitted (the original snapshot notes also say 5
  duplicate RMP ids were collapsed; that cannot be re-verified from the bundled files). For the
  complete set, rerun `python3 build_rmp_enrichment.py --fetch` (pulls all 460 teachers), then
  rerun `python3 build_rmp_enrichment.py` to rebuild.
- `courses-fall2026.json` - the repo's own input data (Workday Fall 2026 sections).

Reproduce: `python3 data/build_rmp_enrichment.py` (offline, uses bundled raw inputs). Paths
resolve relative to the script, so it can be run from any directory.
Refetch raw inputs: `python3 data/build_rmp_enrichment.py --fetch` downloads raw inputs only
(hits the live RMP endpoint, all 460 teachers); run the build again afterward. The request
header `Authorization: Basic dGVzdDp0ZXN0` is base64 of `test:test`, the static value RMP's own
public web client sends; it is not a secret.

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
There is no minimum-n threshold: a single direct review is shown, always with its n.

## Professor identity matching (strict)

Full normalized first-name token equality plus exact normalized last name
(normalization: strip accents, lowercase, letters/spaces only; documented nickname map
in the script, e.g. Abby->Abigail). Every multi-word last-name suffix is tried longest
first ("Arnout van der Meer" tries "van der meer", "der meer", "meer"); the single last
token is the final fallback, which covers middle names and initials. One RMP profile may
map to only one Workday name. Anything weaker is EXCLUDED from scored data and listed per
section as `excluded: true` with a reason.

Of 293 unique Fall 2026 instructor names: 146 strict name matches, 145 usable, 148 excluded:

| Reason | Names | Meaning |
|---|---|---|
| `no-rmp-lastname` | 112 | no RMP profile with that last name |
| `lastname-only` | 31 | last name exists on RMP but no first-name match |
| `ambiguous-first-name` | 4 | two RMP profiles both match (see below) |
| `reviews-not-in-snapshot` | 1 | strict match, but its reviews are not in the reduced snapshot |
| `ambiguous-rmp-profile` | 0 | two Workday names map to one RMP profile |

Known false negatives (deliberately not "fixed", since each fix would broaden the rules and
needs an explicit product decision):
- Duplicate RMP profiles of what is likely one person - Kerill O'Neill, Steve Wurtzler,
  Veronique Plesch, Tina Beachy - are `ambiguous-first-name`; profiles are never merged.
- Arnout van der Meer (RMP "Arnout Van Der Meer", 13 ratings; teaches GS 276-B, HI 141-A,
  HI 276-B) matches strictly, but his reviews are not in the bundled snapshot. He is excluded
  rather than shown as "0 reviews"; a full `--fetch` refresh would recover him.
- Workday nicknames outside the map (e.g. Josh/Joshua, Jeff/Jeffery, Kim/Kimberly) and RMP
  spelling variants (e.g. Lindwood/Linwood) stay `lastname-only`.

## Course-code normalization

Both sides use the same normalization: strip everything except A-Z0-9, uppercase. Workday
numbers can contain a space, so "BI" + "163 L" -> BI163L, matching RMP's "BI163L"; suffix
letters are preserved and BI163L is never mapped onto BI163. The only alias applied is
BIOxxx -> BIxxx (digits only), only when the BIO form is NOT a Fall-2026 code and the BI form
IS (RMP writes Biology as BIO, Workday as BI). No other equivalences. The build aborts if two
distinct Workday codes would normalize to the same key.

## Layup List scale source

https://github.com/layuplist/layup-list, `apps/web/models/vote.py`: each vote's value is
bounded to -1..+1 (`abs(value) > 1` is rejected) and votes are summed into the course's
`difficulty_score` / `quality_score`. The direction used here (easier = +1, harder = -1) is
the convention stated by the original enrichment notes; vote.py itself does not encode
which end means "easy", and that direction was not re-verified against Layup List's UI.

## Metrics

`difficulty_n`, `quality_n`, `wta_n` are the per-metric denominators (reviews where that
field is present); averages divide by those counts. Would-take-again is often missing, so
`wta_n` can be much smaller than the review count (the site always shows each n).
`easiness_proxy = (3 - avg_difficulty)/2` maps RMP 1-5 difficulty onto [-1, +1], the
vote-value units Dartmouth Layup List uses. It is a linear PROXY, not a measured
Dartmouth-equivalent score, and is never multiplied by review volume (Layup List scores are
raw Dartmouth vote counts).

## Coverage (this build)

- 145 usable strict matches of 293 unique Fall 2026 instructor names.
- 680 of those professors' bundled reviews carry a Fall 2026 course code (any code offered
  this term, including courses that professor is not teaching this term).
- 91 professor-course pairs taught this term have direct reviews (382 reviews in total).
- 113 of 861 sections have at least one direct professor-course review (24 professor-section
  entries rest on a single review). The reference build (3d159d5) reported 110; the +3 delta is
  the lab/suffix course-code fix, traced section by section in `RMP-COVERAGE-DELTA.md`.
