import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from './survey.js';
import { validateAnswers, reviewScore, aggregate, formatScore } from './score.js';

test('every question has exactly five anchors, 1-5, in order', () => {
  for (const q of QUESTIONS) {
    assert.equal(q.anchors.length, 5, q.id);
  }
  assert.equal(QUESTIONS.filter((q) => q.required).length, 4);
  assert.equal(QUESTIONS.length, 5);
});

test('golden vectors', () => {
  assert.equal(reviewScore({ q1: 5, q2: 5, q3: 5, q4: 5, q5: 5 }, QUESTIONS), 1);
  assert.equal(reviewScore({ q1: 1, q2: 1, q3: 1, q4: 1, q5: 1 }, QUESTIONS), -1);
  assert.equal(reviewScore({ q1: 3, q2: 3, q3: 3, q4: 3, q5: 3 }, QUESTIONS), 0);
  assert.equal(reviewScore({ q1: 4, q2: 3, q3: 5, q4: 4 }, QUESTIONS), 0.5);
});

test('Q5 null scores over the 4 required answers', () => {
  assert.equal(reviewScore({ q1: 4, q2: 3, q3: 5, q4: 4, q5: null }, QUESTIONS), 0.5);
});

test('missing required answer is rejected, never defaulted', () => {
  assert.equal(reviewScore({ q1: 4, q2: 3, q3: 5 }, QUESTIONS), null);
  assert.equal(validateAnswers({ q1: 4, q2: 3, q3: 5 }, QUESTIONS).ok, false);
});

test('out-of-range values are rejected, never coerced', () => {
  for (const bad of [0, 6, 2.5, '3', NaN]) {
    assert.equal(reviewScore({ q1: bad, q2: 3, q3: 3, q4: 3 }, QUESTIONS), null);
  }
});

test('aggregate gates below minN and averages above it', () => {
  assert.equal(aggregate([], 5), null);
  assert.equal(aggregate([0.5, 0.5, -0.5], 5), null);
  assert.equal(aggregate([1, 1, 1, 1, -1], 5), 0.6);
  assert.equal(aggregate([0.2, null, 0.4, 0.2, 0.4, 0.4], 5), 0.32);
});

test('formatScore', () => {
  assert.equal(formatScore(0.35), '+0.35');
  assert.equal(formatScore(-0.5), '-0.50');
  assert.equal(formatScore(0), '+0.00');
  assert.equal(formatScore(null), 'n/a');
});
