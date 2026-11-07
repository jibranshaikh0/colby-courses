# Colby Courses

A searchable browser for Colby College course sections, in the spirit of [Layup List](https://github.com/layuplist/layup-list).
One static page (`index.html`) over a JSON file; no build step.

## Run it

```sh
python3 -m http.server 8080   # then open http://localhost:8080
```

Filter by subject, course tag, meeting day and open seats, or search titles, instructors and descriptions.

## Data

`data/courses-fall2026.json` holds every Fall 2026 section from Workday's
**Find Course Sections for Registration** report (861 sections).

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
