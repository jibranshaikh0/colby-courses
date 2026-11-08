#!/usr/bin/env python3
"""
build_rmp_enrichment.py - reproducible RMP course-rating enrichment for Colby Courses.

Inputs (bundled in this directory, fetched 2026-11-08 from the public RMP GraphQL
endpoint https://www.ratemyprofessors.com/graphql):
  - courses-fall2026.json   (repo data file: Fall 2026 sections from Colby Workday)
  - rmp_teachers.json       (raw GraphQL response: all Colby College teachers, school id U2Nob29sLTI1MA==)
  - rmp_reviews.json        (raw GraphQL responses: every review for every matched teacher)

Run `python3 build_rmp_enrichment.py` -> writes rmp-course-ratings-fall2026.json.
Run `python3 build_rmp_enrichment.py --fetch` to re-pull raw inputs from RMP (network).
"""
import json, re, sys, time, unicodedata, urllib.request
from collections import defaultdict

GRAPHQL = 'https://www.ratemyprofessors.com/graphql'
SCHOOL_ID = 'U2Nob29sLTI1MA=='  # Colby College (Waterville, ME), legacyId 250

TEACHER_LIST_QUERY = '''query($query:TeacherSearchQuery!){search:newSearch{teachers(query:$query,first:1000,after:""){edges{node{id firstName lastName department avgRating numRatings wouldTakeAgainPercent avgDifficulty school{name id}}}resultCount}}}'''

RATINGS_QUERY = '''query TeacherRatingsPageQuery($id: ID!, $cursor: String) {
  node(id: $id) {
    __typename
    ... on Teacher {
      firstName lastName numRatings department
      ratings(first: 100, after: $cursor) {
        edges { node { id legacyId class date clarityRating difficultyRating wouldTakeAgain grade isForCredit } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}'''

# Documented nickname map (first-token equivalence used by the strict matcher).
NICK = {'abby':'abigail','alex':'alexander','andy':'andrew','ben':'benjamin','bess':'elizabeth',
        'bill':'william','bob':'robert','chris':'christopher','dan':'daniel','dave':'david',
        'ed':'edward','jim':'james','joe':'joseph','jon':'jonathan','kate':'katherine',
        'kathy':'kathleen','ken':'kenneth','liz':'elizabeth','matt':'matthew','mike':'michael',
        'nick':'nicholas','pat':'patrick','pete':'peter','sam':'samuel','steve':'steven',
        'sue':'susan','tom':'thomas','tony':'anthony','will':'william','beth':'elizabeth',
        'charlie':'charles','jack':'john','jen':'jennifer','jess':'jessica','katie':'katherine',
        'nate':'nathaniel','phil':'philip','rick':'richard','rob':'robert','ron':'ronald',
        'ted':'theodore','tim':'timothy','walt':'walter'}

def post(payload):
    req = urllib.request.Request(GRAPHQL, data=json.dumps(payload).encode(),
        headers={'Content-Type':'application/json','Authorization':'Basic dGVzdDp0ZXN0',
                 'User-Agent':'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req, timeout=30))

def fetch():
    d = post({'query': TEACHER_LIST_QUERY,
              'variables': {'query': {'text': '', 'schoolID': SCHOOL_ID, 'fallback': True, 'departmentID': None}}})
    teachers = [e['node'] for e in d['data']['search']['teachers']['edges']]
    json.dump(d, open('rmp_teachers.json','w'))
    reviews = {}
    for i, t in enumerate(teachers):
        cursor = None; allr = []
        while True:
            r = post({'query': RATINGS_QUERY, 'variables': {'id': t['id'], 'cursor': cursor}})
            node = r['data']['node']; rr = node['ratings']
            allr += [e['node'] for e in rr['edges']]
            if rr['pageInfo']['hasNextPage']: cursor = rr['pageInfo']['endCursor']
            else: break
        reviews[f"{t['firstName']} {t['lastName']}|{t['id']}"] = allr
        if i % 25 == 0: print('fetched', i)
        time.sleep(0.15)
    json.dump(reviews, open('rmp_reviews.json','w'))

def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode()
    return re.sub(r'[^a-z ]','', s.lower()).strip()

def norm_class(s):
    return re.sub(r'[^A-Z0-9]','', (s or '').upper())

def build():
    courses = json.load(open('courses-fall2026.json'))
    teachers = [e['node'] for e in json.load(open('rmp_teachers.json'))['data']['search']['teachers']['edges']]
    raw_reviews = json.load(open('rmp_reviews.json'))

    valid = set((c['subject'] + c['number']).upper() for c in courses)

    def resolve_class(raw):
        """Normalize; only alias applied is BIOxxx -> BIxxx when the long form is NOT a
        Fall-2026 code and the short form IS (RMP writes Biology as BIO, Workday as BI)."""
        code = norm_class(raw)
        if code in valid: return code
        if code.startswith('BIO') and code[3:].isdigit() and ('BI' + code[3:]) in valid:
            return 'BI' + code[3:]
        return None

    # index RMP teachers by full normalized last name
    by_last = defaultdict(list)
    for t in teachers:
        by_last[norm(t['lastName'])].append(t)

    def match(name):
        """Strict: exact full first-token equality (nickname map allowed) + exact last name.
        Multi-word last names tried longest-first. Anything less is excluded, never guessed."""
        n = norm(name)
        if not n or n in ('staff','tbd','faculty'): return None, 'not-a-person'
        parts = n.split()
        first = parts[0]
        keys = [' '.join(parts[-2:])] if len(parts) >= 3 else []
        keys.append(parts[-1])
        cands = []
        for k in keys:
            if k in by_last: cands = by_last[k]; break
        if not cands:
            return None, 'no-rmp-lastname'
        exact = [t for t in cands
                 if norm(t['firstName']).split()[0] in (first, NICK.get(first, first))]
        if len(exact) == 1: return exact[0], 'exact'
        if len(exact) > 1: return None, 'ambiguous-first-name'
        return None, 'lastname-only'

    # attribute reviews to (workday instructor name, course code)
    teacher_by_rmpid = {t['id']: t for t in teachers}
    instr_names = sorted({i for c in courses for i in (c.get('Instructors') or [])})
    prof_info, excluded = {}, {}
    for name in instr_names:
        m, how = match(name)
        if m: prof_info[name] = {'rmp_name': f"{m['firstName']} {m['lastName']}",
                                 'rmp_id': m['id'], 'department': m['department'], 'match_type': how}
        else: excluded[name] = how

    pair = defaultdict(list)
    for key, rs in raw_reviews.items():
        rmp_id = key.rsplit('|', 1)[1]
        # find workday name for this rmp id
        wd = next((n for n, info in prof_info.items() if info['rmp_id'] == rmp_id), None)
        if not wd: continue
        for r in rs:
            cc = resolve_class(r.get('class'))
            if cc: pair[(wd, cc)].append(r)

    def avg(rs, f):
        vals = [r[f] for r in rs if r.get(f) is not None]
        return (round(sum(vals)/len(vals), 2), len(vals)) if vals else (None, 0)

    enriched, sec_covered = [], 0
    for c in courses:
        ccode = (c['subject'] + c['number']).upper()
        profs = []
        for name in (c.get('Instructors') or []):
            if name in excluded:
                profs.append({'name': name, 'excluded': True, 'reason': excluded[name],
                              'course_review_count': 0, 'reviews': []})
                continue
            if name not in prof_info: continue
            rs = pair.get((name, ccode), [])
            d_avg, d_n = avg(rs, 'difficultyRating'); q_avg, q_n = avg(rs, 'clarityRating')
            wta = [r['wouldTakeAgain'] for r in rs if r.get('wouldTakeAgain') is not None]
            profs.append({'name': name, 'rmp_name': prof_info[name]['rmp_name'],
                          'rmp_id': prof_info[name]['rmp_id'], 'department': prof_info[name]['department'],
                          'match_type': prof_info[name]['match_type'],
                          'course_review_count': len(rs),
                          'avg_difficulty_1to5': d_avg, 'difficulty_n': d_n,
                          'avg_quality_1to5': q_avg, 'quality_n': q_n,
                          'would_take_again_pct': round(100*sum(wta)/len(wta),1) if wta else None, 'wta_n': len(wta),
                          'easiness_proxy': round((3-d_avg)/2, 3) if d_avg is not None else None,
                          'easiness_proxy_note': 'linear proxy (3-difficulty)/2 mapping RMP 1-5 to [-1,+1]; NOT a measured Dartmouth Layup List score',
                          'reviews': [{'id': r.get('id'), 'legacyId': r.get('legacyId'), 'class': r.get('class'),
                                       'date': r.get('date'), 'difficultyRating': r.get('difficultyRating'),
                                       'clarityRating': r.get('clarityRating'), 'wouldTakeAgain': r.get('wouldTakeAgain'),
                                       'grade': r.get('grade')} for r in rs]})
        enriched.append({'workday_id': c['workday_id'], 'section': c['section'], 'subject': c['subject'],
                         'number': c['number'], 'section_code': c['section_code'],
                         'course_code': ccode, 'professors': profs})
        if any(p.get('course_review_count', 0) > 0 for p in profs): sec_covered += 1

    json.dump(enriched, open('rmp-course-ratings-fall2026.json','w'), indent=1)
    fall = sum(len(v) for (n,cc),v in pair.items() if cc in valid)
    print('matched instructors (strict exact):', len(prof_info))
    print('excluded:', len(excluded))
    print('pair reviews on Fall-2026 codes:', fall)
    print('sections with >=1 course-pair review:', sec_covered, '/', len(courses))

if __name__ == '__main__':
    if '--fetch' in sys.argv: fetch()
    else: build()
