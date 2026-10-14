import { describe, expect, it } from 'vitest';
import { defaultData, days } from './domain';
import { quizBank, quizForDay, recordSkillAttempt, scoreQuiz } from './adaptive';
import { allocateMinutes, dailyTarget, makeDailyPlan, overdueActivities } from './studyPlan';
import { isTrustedResourceUrl, resourceForDay, verifiedResources } from './resources';

describe('adaptive daily plan', () => {
  it('generates all eight explicit activity kinds for all 182 curriculum days', () => {
    const data = defaultData();
    const expected = ['udemy', 'input', 'speaking', 'review', 'writing', 'vocabulary', 'quiz', 'startup'];
    expect(days).toHaveLength(182);
    for (const day of days) {
      const plan = makeDailyPlan(day.day, data);
      expect(plan.map((item) => item.kind)).toEqual(expected);
      expect(plan.every((item) => item.objective && item.instructions && item.material && item.exercise && item.criteria)).toBe(true);
      expect(plan.map((item) => item.key)).toEqual(expected.map((_, index) => `${day.day}:${index}`));
      if (plan[1].url) expect(isTrustedResourceUrl(plan[1].url)).toBe(true);
    }
  });

  it('allocates configured daily targets exactly, bounded from 30 to 180 minutes', () => {
    for (const target of [30, 45, 60, 90, 120, 150, 180]) {
      expect(allocateMinutes(target).reduce((sum, value) => sum + value, 0)).toBe(target);
      expect(allocateMinutes(target).every((value) => value > 0)).toBe(true);
      const data = defaultData(); data.settings.targetMinutes = target;
      for (const day of days) {
        const daily = makeDailyPlan(day.day, data);
        expect(dailyTarget(day, data)).toBe(day.minutes <= 45 ? Math.min(target, 45) : target);
        expect(daily.reduce((sum, item) => sum + item.minutes, 0)).toBe(dailyTarget(day, data));
      }
    }
  });

  it('retains original overdue activity keys and ignores completed or waived items', () => {
    const data = defaultData();
    data.activities['1:1'] = { status: 'done', updatedAt: '2026-10-14T12:00:00.000Z' };
    data.activities['1:2'] = { status: 'skipped', updatedAt: '2026-10-14T12:00:00.000Z' };
    const pending = overdueActivities(4, data);
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((item) => item.day < 4 && item.key === `${item.day}:${item.index}`)).toBe(true);
    expect(pending.some((item) => item.key === '1:1' || item.key === '1:2')).toBe(false);
    expect(new Set(pending.map((item) => item.key)).size).toBe(pending.length);
  });

  it('assigns resources progressively and keeps each specific resource id stable', () => {
    expect(resourceForDay(1, 1).level).toMatch(/^A0/);
    expect(resourceForDay(40, 6).level).toBe('A1');
    expect(['A1', 'A2']).toContain(resourceForDay(80, 12).level);
    expect(['A2', 'A2–B1']).toContain(resourceForDay(140, 20).level);
    expect(resourceForDay(175, 25).level).toBe('B1');
    expect(new Set(verifiedResources.map((item) => item.url)).size).toBe(verifiedResources.length);
  });
});

describe('objective quiz evidence', () => {
  it('requires every answer and returns answer keys and rationales', () => {
    const questions = quizForDay(1, 1);
    expect(() => scoreQuiz(questions, [])).toThrow('Responda a todas');
    const result = scoreQuiz(questions, questions.map((question) => question.answer));
    expect(result).toMatchObject({ correct: questions.length, total: questions.length });
    expect(result.explanations.every((entry) => entry.correct && entry.explanation && entry.answer)).toBe(true);
    expect(quizBank.length).toBeGreaterThanOrEqual(12);
  });

  it('only advances skill estimate after three distinct successful dates and schedules weak evidence tomorrow', () => {
    let data = defaultData();
    data = recordSkillAttempt(data, 'grammar', 1, 1, 'quiz-a', new Date('2026-10-14T12:00:00.000Z'));
    expect(data.skills?.grammar?.estimatedLevel).toBe('A0');
    data = recordSkillAttempt(data, 'grammar', 1, 1, 'quiz-b', new Date('2026-10-15T12:00:00.000Z'));
    expect(data.skills?.grammar?.estimatedLevel).toBe('A0');
    data = recordSkillAttempt(data, 'grammar', 1, 1, 'quiz-c', new Date('2026-10-16T12:00:00.000Z'));
    expect(data.skills?.grammar).toMatchObject({ estimatedLevel: 'A1', status: 'mastered', attempts: 3, nextReview: '2026-10-23' });
    data = recordSkillAttempt(data, 'reading', 0, 1, 'failed-reading', new Date('2026-10-14T12:00:00.000Z'));
    expect(data.skills?.reading).toMatchObject({ status: 'reviewing', nextReview: '2026-10-15' });
    expect(data.skillAttempts).toHaveLength(4);
  });

  it('surfaces a skill due for spaced review and prioritizes it in the next objective quiz', () => {
    const first = recordSkillAttempt(defaultData(), 'reading', 0, 1, 'reading-quiz', new Date('2026-10-14T12:00:00.000Z'));
    const nextDay = makeDailyPlan(2, first);
    expect(nextDay[3].skillReviewDue).toContain('reading');
    expect(nextDay[3].material).toContain('leitura');
    expect(nextDay[6].quizQuestions?.some((question) => question.skill === 'reading')).toBe(true);
  });
});
