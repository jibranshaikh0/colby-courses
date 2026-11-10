// Survey v1 for Rate A Mule student reviews. Single source of truth for the form,
// validation, scoring and display. Direction for every question: 1 = hardest / most
// demanding, 5 = easiest / lightest (higher score = easier, matching the RMP proxy sign).
export const SURVEY_VERSION = 'v1';

export const QUESTIONS = [
  {
    id: 'q1',
    required: true,
    text: 'Overall: how hard was it to earn a good grade?',
    anchors: [
      'Extremely hard: strong effort still often led to a below-average grade',
      'Hard: needed sustained, strong effort to earn a good grade',
      'Moderate: grade roughly matched the effort I put in',
      'Easy: a good grade took only modest effort',
      'Very easy: a good grade took little effort',
    ],
  },
  {
    id: 'q2',
    required: true,
    text: 'Weekly workload outside class (reading, problem sets, projects)',
    anchors: [
      'Overwhelming: more than 12 hours per week',
      'Heavy: about 9-12 hours per week',
      'Moderate: about 5-8 hours per week',
      'Light: about 2-4 hours per week',
      'Minimal: under 2 hours per week',
    ],
  },
  {
    id: 'q3',
    required: true,
    text: 'Difficulty of exams and graded assessments',
    anchors: [
      'Extremely hard: far beyond what was taught or practiced',
      'Hard: many questions needed deep synthesis or unfamiliar problem types',
      'Fair: matched the material and the preparation offered',
      'Straightforward: mostly direct applications of class material',
      'Very straightforward: nearly all questions were familiar or predictable',
    ],
  },
  {
    id: 'q4',
    required: true,
    text: 'Grading strictness',
    anchors: [
      'Very harsh: low grades common, little partial credit',
      'Strict: points lost easily, limited partial credit',
      'Typical: ordinary grading for a Colby course',
      'Lenient: generous partial credit, forgiving on small errors',
      'Very lenient: grades clustered high, hard to lose points',
    ],
  },
  {
    id: 'q5',
    required: false,
    text: 'Background knowledge needed going in',
    anchors: [
      'A great deal: heavy unstated prerequisites, steep catch-up',
      'A lot: strong prior background clearly expected',
      'Some: prior background helpful but not essential',
      'Little: the course re-taught most of what was needed',
      'None: fully accessible to a beginner',
    ],
  },
];

export const FOOTNOTE =
  'Student score is computed by Rate A Mule from Colby-email-verified reviews. ' +
  'The RMP value is a linear conversion of RateMyProfessors difficulty. ' +
  'Neither is an official Layup List score and they are not directly comparable.';
