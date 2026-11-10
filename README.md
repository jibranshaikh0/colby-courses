# Colby Courses

A searchable browser for Colby College course sections, in the spirit of [Layup List](https://github.com/layuplist/layup-list).
One static page (`index.html`) over two JSON files (course sections and RateMyProfessors ratings); no build step.

## Run it

```sh
python3 -m http.server 8080   # then open http://localhost:8080
```

It opens on a landing page with a search box and links into the catalog. In the catalog, filter by
subject, course tag and meeting pattern, show only open or only rated sections, group sections by
meeting pattern, or search codes, titles, instructors, descriptions and departments. Type course
codes with a space, as Workday writes them (`CS 151`, not `CS151`).

The meeting-pattern filter matches a section's full weekly pattern exactly. `MWF` lists sections
that meet on Monday, Wednesday and Friday and on no other day. A section with several meetings has
its own combined pattern (a `MWF` lecture with an `R` lab is `MWF + R`), which is never merged into a
single day set. Sections without a listed time are under "No meeting time listed". There is no
"meets on a given day" filter: by design, the exact pattern filter replaced it.

## Data

`data/courses-fall2026.json` holds every Fall 2026 section from Workday's
**Find Course Sections for Registration** report (861 sections).
`data/rmp-course-ratings-fall2026.json` holds the RateMyProfessors ratings, matched per professor
and per course; `data/RMP-ENRICHMENT-README.md` explains how it is built and refreshed.

To refresh it or add a term (needs a Colby Workday login):

1. Run the report in Workday for the term you want.
2. In the browser's network tab, find the request
   `/colby/faceted-search2/<page-id>/fs0/pagination/<offset>.htmld` and note `<page-id>`.
3. From the browser console on that page, fetch every offset (0, 50, 100, …) and save the list of responses as `raw-<term>.json`.
4. `python3 parse_workday.py raw-<term>.json data/courses-<term>.json`

Raw responses include the logged-in user's name and ID, so `raw-*.json` is git-ignored. Only the parsed file is committed.

## Makers

Jibran Shaikh and Samir Dhami, Colby College.
With humble thanks to [Repose](https://repose.herakraft.co), Colby Hacker, and [Claude](https://claude.ai).

## License

MIT
