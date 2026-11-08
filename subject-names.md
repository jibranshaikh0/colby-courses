# Subject names in the Subject dropdown

The Subject dropdown in `index.html` shows each two-letter code as `CODE: Name`.
The names come from `SUBJECT_NAMES` in `index.html`. Every name is copied verbatim from an
official Colby source. A code with no verified name shows as the bare code. Names are never guessed.

The table below is the source of truth and the test fixture. The label check fails if
`SUBJECT_NAMES` and these rows ever disagree, so keep the two in sync.

## Sources

| Key | Source | URL |
|---|---|---|
| CAT24 | Colby College Catalogue 2024-2025, table "Two-Letter Abbreviations for Course Subject Areas" | https://www.colby.edu/wp-content/uploads/2024/07/Course-Catalogue-2024-25.pdf |
| CAT25-T | Colby College Catalogue 2025-2026, table "Two-Letter Abbreviations for Course Subject Areas", p.32 | https://digitalcommons.colby.edu/catalogs/226/ |
| CAT25-B | Colby College Catalogue 2025-2026, body text, p.66 (not the abbreviations table) | https://digitalcommons.colby.edu/catalogs/226/ |
| KEY | Colby "Key to Course Descriptions" web page (live) | https://www.colby.edu/academics/course-catalogue/academic-program/key-to-course-descriptions/ |

## Names (fixture rows)

`Source` is where the shown name is copied from. Rows marked CAT24 also match the KEY table
as archived on 2025-08-07 (see "How these were checked").

| Code | Name shown | Source |
|---|---|---|
| AA | African-American Studies | CAT24 |
| AM | American Studies | CAT24 |
| AN | Ancient History | CAT24 |
| AR | Art | CAT24 |
| AS | Astronomy | CAT24 |
| AY | Anthropology | CAT24 |
| BC | Biochemistry | CAT24 |
| BI | Biology | CAT24 |
| CH | Chemistry | CAT24 |
| CI | Cinema Studies | CAT24 |
| CL | Classics | CAT24 |
| CN | Chinese | CAT24 |
| CS | Computer Science | CAT24 |
| EA | East Asian Languages and Cultures | KEY (conflicts with CAT25-T, see below) |
| EC | Economics | CAT24 |
| ED | Education | CAT24 |
| EN | English | CAT24 |
| ER | Earth Sciences | CAT25-T |
| ES | Environmental Studies | CAT24 |
| FR | French | CAT24 |
| GE | Geology | CAT24 (no Fall 2026 sections; superseded by ER, see below) |
| GK | Greek | CAT24 |
| GM | German | CAT24 |
| GO | Government | CAT24 |
| GS | Global Studies | CAT24 |
| HI | History | CAT24 |
| IM | Independent Major | CAT24 |
| IS | Integrated Studies | CAT24 |
| IT | Italian | CAT24 |
| JA | Japanese | CAT24 |
| JP | January Courses | CAT24 |
| JS | Jewish Studies | CAT24 |
| LA | Latin American Studies | CAT24 |
| LT | Latin | CAT24 |
| MA | Mathematics | CAT24 |
| ML | Modern Languages (Arabic) | CAT24 |
| MU | Music | CAT24 |
| PH | Physics | CAT24 |
| PL | Philosophy | CAT24 |
| PS | Psychology | CAT24 |
| RE | Religious Studies | CAT24 |
| RU | Russian | CAT24 |
| SC | Statistics | CAT24 |
| SO | Sociology | CAT24 |
| SP | Spanish | CAT24 |
| SR | Senior Scholar | CAT24 |
| ST | Science, Technology, and Society | CAT24 |
| TD | Performance, Theater, and Dance | CAT24 |
| TL | Transformative Learning | CAT25-B |
| WD | Writing Department | KEY (conflicts with CAT25-T, see below) |
| WG | Women’s, Gender, and Sexuality Studies | CAT25-T |

WG uses "and", as the 2025-26 table does, not "&". The apostrophe is the typographic `’` (U+2019),
as on the key page.

## Codes shown without a name

| Code | Fall 2026 sections | Why it has no name |
|---|---|---|
| AI | 1 (AI 297-A) | No verified expansion in CAT24, CAT25-T, CAT25-B or KEY |
| CE | 2 (CE 124-A, CE 200-A) | No verified expansion in CAT24, CAT25-T, CAT25-B or KEY |
| HL | 1 (HL 199-A) | No verified expansion in CAT24, CAT25-T, CAT25-B or KEY |
| PO | 3 (PO 267-A, PO 267-B, PO 461-A) | No verified expansion in CAT24, CAT25-T, CAT25-B or KEY |

These four show as the bare code (for example `AI`), never a guessed name. Section titles like
"Artificial Intelligence Lab" or "Introduction to Policy Analysis" hint at a meaning, but a course
title is not an official subject name, so it is not used. To name one of them, add it here and to
`SUBJECT_NAMES` together, with a source that prints the code next to its name.

## Conflict: EA and WD (live key page vs 2025-26 PDF)

Two official sources disagree. The app uses the live key page.

| Code | Live key page (used) | 2025-26 catalogue PDF, table p.32 |
|---|---|---|
| EA | East Asian Languages and Cultures | East Asian Studies |
| WD | Writing Department | Writing |

- Live key page: https://www.colby.edu/academics/course-catalogue/academic-program/key-to-course-descriptions/
- 2025-26 catalogue PDF: https://digitalcommons.colby.edu/catalogs/226/

Why the live page wins: it is the source Colby currently maintains, and it matches what Workday
calls the department now. The Fall 2026 data (`data/courses-fall2026.json`, field `Inventory Owner`)
uses "East Asian Languages and Cultures" for 5 EA sections and "Writing Department" for all 13 WD sections.
That field is a department name, not a subject label, so it supports the choice but is not the source.

The value before this change was "East Asian Studies" (from CAT24). WD was already "Writing Department".

## ER and GE

ER "Earth Sciences" replaces the old Geology code. The Fall 2026 data has 12 ER sections and no
GE sections. Workday names the department "Earth Sciences (formerly Geology)" for 9 of them.
GE stays in `SUBJECT_NAMES` with its CAT24 name. With no GE sections it never appears in the
dropdown, but it keeps the label correct if older data is ever loaded.

## Verification record

Verified in the prior phase, against the sources above:

- ER "Earth Sciences": 2025-26 catalogue, "Two-Letter Abbreviations" table, p.32.
- TL "Transformative Learning": 2025-26 catalogue body text, p.66.
- WG "Women’s, Gender, and Sexuality Studies" ("and", not "&"): the same 2025-26 table.
- EA "East Asian Languages and Cultures" and WD "Writing Department": the live key page.
- The EA/WD conflict between the live key page and the 2025-26 PDF (section above).

Re-checks in the 2026-11-08 development session:

- The live key page and the digitalcommons PDF were not re-fetchable from this session. Automated
  requests to both get HTTP 403 from a Cloudflare bot check. The prior-phase verification stands.
- The Internet Archive copy of the key page from 2025-08-07
  (https://web.archive.org/web/20250807164459/https://www.colby.edu/academics/course-catalogue/academic-program/key-to-course-descriptions/)
  was compared row by row. It matches every CAT24 row. It also prints ER "Earth Sciences",
  WG "Women’s, Gender, and Sexuality Studies" and WD "Writing Department", the same as above.
  It has no AI, CE, HL, PO or TL rows.
- That 2025-08-07 copy predates the live-page reading. It still prints EA as "East Asian Studies",
  the same as the 2025-26 PDF. This is consistent with the key page being updated after August 2025.
  Re-read the live page when the catalogue is next refreshed.
