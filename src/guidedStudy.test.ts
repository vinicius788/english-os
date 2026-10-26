import { describe, expect, it } from 'vitest';
import { defaultData, todayISO } from './domain';
import { finishActivity, gradeCard, gradeVocabulary, nextPending, resolveContent, selectedActivity, submitDailyQuiz } from './guidedStudy';
import { makeDailyPlan } from './studyPlan';
import { startupModules, vocabularyExample } from './startup';
import { initialSkills } from './adaptive';

describe('guided study content and progress', () => {
  it('resolves every explicit content ID across all 182 days', () => {
    const data = defaultData();
    const keys = new Set<string>();
    for (let day = 1; day <= 182; day++) {
      const plan = makeDailyPlan(day, data);
      expect(plan).toHaveLength(8);
      for (const activity of plan) {
        expect(activity.key).toBe(`${day}:${activity.index}`);
        expect(activity.contentId).toBeTruthy();
        expect(resolveContent(activity), `${activity.key} → ${activity.contentId}`).toBeDefined();
        expect(keys.has(activity.key)).toBe(false);
        keys.add(activity.key);
      }
    }
    expect(keys.size).toBe(182 * 8);
  });

  it('moves through every activity and preserves earlier completion', () => {
    let data = defaultData();
    const plan = makeDailyPlan(1, data);
    for (let index = 0; index < plan.length; index++) {
      expect(nextPending(plan, data)?.key).toBe(plan[index].key);
      data = finishActivity(data, plan[index], 1);
      expect(data.activities[plan[index].key].status).toBe('done');
      expect(selectedActivity(plan, data, 1)?.key).toBe(plan[index].key);
    }
    expect(nextPending(plan, data)).toBeUndefined();
    expect(data.lectures[0].status).toBe('not-started');
    expect(data.lectures).toHaveLength(545);
    expect(data.courseTests).toHaveLength(24);
  });

  it('schedules a real due card after one review grade', () => {
    const data = defaultData();
    data.cards = [{ id: 'saved-card', phrase: 'Hello', meaning: 'Olá', example: 'Hello, Ana.', topic: 'cotidiano', dueDate: todayISO(), interval: 0, ease: 2.3 }];
    const reviewed = gradeCard(data, 'saved-card', 'hard');
    expect(reviewed.cards[0].dueDate > todayISO()).toBe(true);
    expect(reviewed.cards[0].interval).toBe(1);
    expect(gradeCard(reviewed, 'saved-card', 'easy')).toEqual(reviewed);
    expect(gradeCard({ ...data, cards: [{ ...data.cards[0], interval: 30 }] }, 'saved-card', 'easy').cards[0].interval).toBe(30);
  });

  it('creates one vocabulary review card per expression across repeated ratings', () => {
    const data = defaultData();
    const activity = makeDailyPlan(1, data)[5];
    const module = resolveContent(activity) as { words: Array<{ english: string; portuguese: string }> };
    const word = module.words[0];
    const first = gradeVocabulary(data, activity, word, 'hard', 'I am a founder.');
    const second = gradeVocabulary(first, activity, word, 'good', 'I am a founder.');
    expect(second.cards.filter((card) => card.id === `vocab:${activity.contentId}:${word.english}`)).toHaveLength(1);
    expect(second.vocabularyProgress?.[`${activity.key}:${word.english}`]?.grade).toBe('good');
  });

  it('provides a contextual sentence for every startup expression', () => {
    for (const module of startupModules) for (const word of module.words) {
      expect(vocabularyExample(module, word.english), `${module.id}: ${word.english}`).toBeTruthy();
    }
  });

  it('records a monthly quiz and skill evidence without changing Udemy status', () => {
    const data = defaultData();
    const activity = makeDailyPlan(28, data)[6];
    data.quizDrafts = { [activity.key]: activity.quizQuestions!.map((question) => question.answer) };
    const submitted = submitDailyQuiz(data, activity, 28);
    expect(submitted.activities[activity.key].status).toBe('done');
    expect(submitted.assessments[0]).toMatchObject({ period: '28 dias · avaliação mensal', correctAnswers: activity.quizQuestions!.length });
    expect(submitted.skillAttempts?.length).toBeGreaterThan(0);
    expect(submitted.lectures[0].status).toBe('not-started');
    expect(submitDailyQuiz(submitted, activity, 28).assessments).toHaveLength(1);
  });

  it('keeps a partially answered quiz tied to its original question IDs', () => {
    const data = defaultData();
    const original = makeDailyPlan(28, data)[6];
    data.quizQuestionIds = { [original.key]: original.quizQuestions!.map((question) => question.id) };
    data.quizDrafts = { [original.key]: [1] };
    const skills = initialSkills();
    skills.grammar = { ...skills.grammar, attempts: 1, nextReview: '2026-01-01' };
    data.skills = skills;
    const resumed = makeDailyPlan(28, data)[6];
    expect(resumed.quizQuestions!.map((question) => question.id)).toEqual(data.quizQuestionIds[original.key]);
    expect(data.quizDrafts[original.key]).toEqual([1]);
  });
});
