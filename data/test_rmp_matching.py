#!/usr/bin/env python3
"""Regression tests for the strict RMP matching rules (stdlib only, no network).
Run from anywhere: python3 data/test_rmp_matching.py"""
import io, json, os, sys, tempfile, unittest, urllib.error
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_rmp_enrichment as b


def teacher(first, last, tid):
    return {'id': tid, 'firstName': first, 'lastName': last, 'department': 'X'}


class CourseCodes(unittest.TestCase):
    def setUp(self):
        self.resolve = b.make_resolver({'BI163', 'BI163L', 'CS151'})

    def test_workday_suffix_code_keeps_its_suffix(self):
        self.assertEqual(b.wd_code({'subject': 'BI', 'number': '163 L'}), 'BI163L')

    def test_lab_code_matches_exactly_and_never_collapses(self):
        self.assertEqual(self.resolve('BI163L'), 'BI163L')
        self.assertEqual(self.resolve('BI 163 L'), 'BI163L')
        self.assertEqual(self.resolve('BI163'), 'BI163')

    def test_bio_alias_digits_only(self):
        self.assertEqual(self.resolve('BIO163'), 'BI163')
        self.assertIsNone(self.resolve('BIO163L'))

    def test_unknown_code(self):
        self.assertIsNone(self.resolve('XX999'))
        self.assertIsNone(self.resolve(None))


class Names(unittest.TestCase):
    def setUp(self):
        self.match = b.make_matcher(b.index_by_last([
            teacher('Arnout', 'Van Der Meer', 't1'), teacher('Michael', 'Smith', 't2'),
            teacher('Tina', 'Beachy', 't3'), teacher('Tina', 'Beachy', 't4'),
            teacher('Ann Marie', 'Kloppenberg', 't5'), teacher('Ben', 'Lisle', 't6')]))

    def test_multi_word_last_name(self):
        m, how = self.match('Arnout van der Meer')
        self.assertEqual((m['id'], how), ('t1', 'exact'))

    def test_nickname_map(self):
        self.assertEqual(self.match('Mike Smith')[0]['id'], 't2')

    def test_middle_initial_falls_back_to_last_token(self):
        self.assertEqual(self.match('Ben Q. Lisle')[0]['id'], 't6')

    def test_duplicate_profiles_are_excluded_not_merged(self):
        self.assertEqual(self.match('Tina Beachy'), (None, 'ambiguous-first-name'))

    def test_last_name_only_is_excluded(self):
        self.assertEqual(self.match('Annie Kloppenberg'), (None, 'lastname-only'))

    def test_not_a_person_and_unknown(self):
        self.assertEqual(self.match('Staff'), (None, 'not-a-person'))
        self.assertEqual(self.match('Jane Doe'), (None, 'no-rmp-lastname'))


class Fetch(unittest.TestCase):
    def test_post_retries_then_succeeds(self):
        ok = io.BytesIO(json.dumps({'data': {'x': 1}}).encode())
        with mock.patch.object(b.urllib.request, 'urlopen', side_effect=[urllib.error.URLError('down'), TimeoutError(), ok]), \
             mock.patch.object(b.time, 'sleep'), mock.patch('sys.stderr', io.StringIO()):
            self.assertEqual(b.post({}), {'data': {'x': 1}})

    def test_post_gives_up_after_three_attempts(self):
        bad = lambda *a, **k: io.BytesIO(b'{"errors": [{"message": "rate limited"}]}')
        with mock.patch.object(b.urllib.request, 'urlopen', side_effect=bad), \
             mock.patch.object(b.time, 'sleep'), mock.patch('sys.stderr', io.StringIO()):
            with self.assertRaises(ValueError):
                b.post({})

    def test_failed_refresh_writes_nothing(self):
        teachers = {'data': {'search': {'teachers': {'edges': [{'node': teacher('A', 'B', 't1')}]}}}}
        with tempfile.TemporaryDirectory() as d, \
             mock.patch.object(b, 'path', lambda n: os.path.join(d, n)), \
             mock.patch.object(b, 'post', side_effect=[teachers, urllib.error.URLError('down')]):
            with self.assertRaises(urllib.error.URLError):
                b.fetch()
            self.assertEqual(os.listdir(d), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)
