"""Flatten saved Workday "Find Course Sections for Registration" pages into one record per section.

Usage: python3 parse_workday.py raw-fall2026.json courses-fall2026.json
The raw file is a JSON list of responses from /colby/faceted-search2/<id>/fs0/pagination/<offset>.htmld.
"""
import json
import re
import sys

# Fields that can hold several entries; always kept as lists.
MULTI = {"Section Details", "Instructors", "Course Tags"}


def value(field):
    if "instances" in field:
        texts = [i["text"] for i in field["instances"]]
        return texts if len(texts) > 1 or field["label"] in MULTI else texts[0]
    return field.get("value", field.get("text"))


def label(raw):
    # Workday's custom-field labels look like "zCF CT Credits"; keep the readable tail.
    return re.sub(r"^zCF [A-Z]+ ", "", raw)


def parse_item(item):
    title = item["title"]["instances"][0]
    rec = {"workday_id": title["instanceId"], "section": title["text"]}
    m = re.match(r"^([A-Z]+) (\w+(?: [A-Z])?)-(\w+) - (.*)$", title["text"])
    if m:
        rec.update(subject=m[1], number=m[2], section_code=m[3], title=m[4])
    for f in item.get("subtitles", []) + item.get("detailResultFields", []):
        rec[label(f["label"])] = value(f)
    return rec


def main(src, dst):
    pages = json.load(open(src))
    total = pages[0]["body"]["facetContainer"]["paginationCount"]["value"]
    recs = [parse_item(i) for p in pages for c in p["body"]["children"] for i in c.get("listItems", [])]
    ids = {r["workday_id"] for r in recs}
    assert len(recs) == total == len(ids), (len(recs), total, len(ids))
    json.dump(recs, open(dst, "w"), indent=1, ensure_ascii=False)
    print(f"{len(recs)} sections -> {dst}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
