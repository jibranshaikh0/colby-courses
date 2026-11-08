# RMP coverage delta: 110 -> 113 sections is a fix, not drift

| | Commit | Rated sections (direct professor-AND-course evidence) |
|---|---|---|
| Reference ratings build (authored outside Claude Code) | `3d159d5` | **110 / 861** |
| Reference UI build `2d88b0a` + `236f8d3`, and check 3 of the handoff brief's 11-check suite | same data as `3d159d5` | asserts exactly 110 |
| Corrected pipeline (Claude Code), lab/suffix course-code fix | `3f3b3a7` | **113 / 861** |
| Every later commit on `cc-redesign` | `e53586e` and later | 113 / 861 (unchanged) |

Exactly **3 sections gained** direct evidence. **No section lost** evidence. No other rating changed.

## The 3 sections

| workday_id | Section | Instructor (Workday) | RMP profile | Reviews attached (RMP id / legacyId / class / date) |
|---|---|---|---|---|
| `15194$69291` | BI 163 L-A1 - Lab:Cell'r Basis of Life | Serena Graham | `VGVhY2hlci0yNzYzMjEx` | `UmF0aW5nLTM4MzcxNTI4` / 38371528 / BI163L / 2023-11-10; `UmF0aW5nLTM1NzA2MTAx` / 35706101 / BI163L / 2022-01-05 |
| `15194$69288` | BI 163 L-D2 - Lab:Cell'r Basis of Life | Serena Graham | same | the same 2 reviews |
| `15194$69263` | BI 163 L-F1 - Lab:Cell'r Basis of Life | Serena Graham | same | the same 2 reviews |

Resulting figures, the same for each of the 3 sections:
- difficulty 2.5/5 (n=2)
- quality 4.0/5 (n=2)
- 50% would take again (n=2)
- easiness proxy +0.25

## Root cause

Workday stores some course numbers with a space: `subject="BI"`, `number="163 L"`. The 98 lab and suffix sections in this term, across 32 course codes, are affected.

`3d159d5` built the set of valid course codes as `(subject + number).upper()`, which gives `"BI163 L"`. It normalized RMP class strings with `norm_class`, which strips everything except A-Z0-9, so RMP's `"BI163L"` stayed `"BI163L"`. The two forms can never be equal. Every exact-code review for a lab or suffix course was therefore dropped. That contradicted the README's own rule, `"BI 279 L" -> BI279L`.

`3f3b3a7` applies `norm_class` on both sides through `wd_code()`. In the bundled snapshot, the only reviews this recovers are Serena Graham's two `BI163L` reviews.

## Why this is not broadening

- **The professor is exact.** Serena Graham is the Workday instructor on exactly these 3 sections. The other BI 163 L sections are taught by Josh Steele, Russell Johnson, Scott Guay, Tina Beachy and Sarah Gibbs. They gain nothing.
- **The course code is exact.** Serena Graham has 5 bundled reviews, with classes BI163, BI163L, BI164 and BI164L. Only the two `BI163L` reviews attach. Her `BI163` lecture review does not attach to the labs, because `BI163L` is never mapped onto `BI163`.
- **Nothing else changed.** The BIO->BI alias is unchanged and still applies to digit-only codes. The build aborts if two distinct Workday codes would ever normalize to the same key; in this data there are 0 such collisions.

## Verification chain

1. **Independent data audit.** This was the orchestrating Claude Code session, before any change.
   - Rebuilding `3d159d5` offline reproduced its JSON byte for byte, with 110 sections and 90 rated pairs.
   - Each attached review checked out against its professor and course, with 0 bad attributions.
   - This audit did **not** catch the lab-code bug: it only checked the attributions that were made, not the ones that were missed.
2. **Reviewer finding.** The native `ecc:code-reviewer` reviewed `04c5c17..3d159d5`.
   - Finding 5 (MEDIUM, 90% confidence): "Lab/suffix course codes never match."
   - Its evidence was Serena Graham's BI 163 L-A1/D2/F1, and it predicted 113.
3. **Independent reproduction.** A separate script by the orchestrator, before any code change, found:
   - 98 affected sections across 32 codes
   - 0 normalization collisions
   - exactly one professor-class pair dropped by the bug: Serena Graham, `BI163L`, 2 reviews
4. **Fix and categorized rebuild diff.** Commit `3f3b3a7`.
   - A script diffed the previous JSON against the new one and put every change in a category:
     - 98 × `course_code` space removed (`"BI163 L"` -> `"BI163L"`)
     - 3 × lab-code reviews (the 3 sections above)
     - 0 unexpected
   - Coverage went 110 -> 113.
   - The cumulative diff from `3d159d5` to the current JSON adds only:
     - 3 × Arnout van der Meer, whose exclusion reason changed and who stays unrated
     - 49 × `rmp_name` whitespace changes
5. **Second review.** The native `ecc:code-reviewer` reviewed `3d159d5..cc-redesign` and returned APPROVE.
   - It independently re-derived 110 -> 113.
   - It found 0 strictness violations across every attached review.
   - It found 0 rating changes other than these 3 sections.
6. **UI evidence.** The extended Playwright suite (check E01) counts 113 rated cards in the DOM, against a count recomputed from the JSON.
   - The brief's 11-check suite as written gives 10/11. The only failure is check 3, which hard-codes 110.
   - With only that assertion set to the recomputed 113, it gives 11/11.

## Re-verify it yourself

```bash
python3 -c "import json,subprocess;f=lambda d:{e['workday_id'] for e in d if any(not p.get('excluded') and p.get('course_review_count',0)>0 for p in e['professors'])};o=f(json.loads(subprocess.check_output(['git','show','3d159d5:data/rmp-course-ratings-fall2026.json'])));n=f(json.load(open('data/rmp-course-ratings-fall2026.json')));print(len(o),len(n),sorted(n-o),sorted(o-n))"
```

Run it from the repo root. It prints `110 113 ['15194$69263', '15194$69288', '15194$69291'] []`.

```bash
python3 data/build_rmp_enrichment.py
```

This rebuilds offline from the bundled snapshot. The output ends with `sections with >=1 course-pair review: 113 / 861`.

## Not changed, by design

Coverage could be higher. Any of the following would broaden the matching rules, so each is left for an explicit product decision:
- merging duplicate RMP profiles (Kerill O'Neill, Steve Wurtzler, Veronique Plesch, Tina Beachy)
- adding nickname mappings
- a live `--fetch` to recover Arnout van der Meer, who has 13 ratings missing from the bundled snapshot

See `RMP-ENRICHMENT-README.md`.
