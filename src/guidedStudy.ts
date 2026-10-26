import { recordSkillAttempt, scoreQuiz } from './adaptive';
import { days, getScheduledDate, scheduleReview, todayISO, type ActivityHistoryEvent, type ActivityRecord, type AppData, type ReviewCard, type SkillId } from './domain';
import { verifiedResources } from './resources';
import { conversationScenarios } from './speaking';
import { startupModules } from './startup';
import { makeDailyPlan, type PlannedActivity } from './studyPlan';

export function nextPending(plan: PlannedActivity[], data: AppData, afterKey?: string) {
  const pending = plan.filter((item) => !['done', 'skipped'].includes(data.activities[item.key]?.status || 'todo'));
  if (!afterKey) return pending[0];
  const index = plan.findIndex((item) => item.key === afterKey);
  return pending.find((item) => item.index > index) || pending[0];
}

export function selectedActivity(plan: PlannedActivity[], data: AppData, day: number) {
  const key = data.studySession?.day === day ? data.studySession.activityKey : undefined;
  const selected = plan.find((item) => item.key === key);
  return selected && (data.studySession?.open || (data.activities[selected.key]?.status !== 'done' && data.activities[selected.key]?.status !== 'skipped'))
    ? selected : nextPending(plan, data, key);
}

/** Resolve content only by IDs authored into the daily plan. */
export function resolveContent(activity: PlannedActivity) {
  if (activity.kind === 'input') return verifiedResources.find((item) => item.id === activity.contentId);
  if (activity.kind === 'speaking') return conversationScenarios.find((item) => item.id === activity.contentId);
  if (activity.kind === 'vocabulary' || activity.kind === 'startup') return startupModules.find((item) => item.id === activity.contentId);
  if (activity.kind === 'writing') return activity.contentId === `writing-day-${activity.day}` ? days[activity.day - 1] : undefined;
  if (activity.kind === 'quiz') return activity.contentId === `quiz-day-${activity.day}` ? activity.quizQuestions : undefined;
  if (activity.kind === 'review') return activity.contentId === `review-day-${activity.day}` ? activity.day : undefined;
  return activity.contentId === `udemy-day-${activity.day}` ? activity.day : undefined;
}

export function finishActivity(data: AppData, activity: PlannedActivity, currentDay: number, notes = ''): AppData {
  if (data.activities[activity.key]?.status === 'done') return data;
  const now = new Date().toISOString();
  const record: ActivityRecord = { status: 'done', updatedAt: now, completedAt: now, lifecycle: 'completed', scheduledDate: getScheduledDate(activity.day, data), notes };
  const history: ActivityHistoryEvent[] = [...(data.activityHistory || [])];
  if (activity.day < currentDay) history.push({ id: crypto.randomUUID(), activityKey: activity.key, day: activity.day, kind: 'completed_late', at: now, fromDate: getScheduledDate(activity.day, data), toDate: getScheduledDate(currentDay, data) });
  return { ...data, activities: { ...data.activities, [activity.key]: record }, activityHistory: history, studySession: { day: activity.day, activityKey: activity.key, open: true } };
}

export function gradeCard(data: AppData, cardId: string, grade: 'wrong' | 'hard' | 'good' | 'easy'): AppData {
  if (!data.cards.some((item) => item.id === cardId && item.dueDate <= todayISO())) return data;
  return { ...data, cards: data.cards.map((card) => card.id === cardId ? scheduleReview(card, grade) : card) };
}

export function gradeVocabulary(data: AppData, activity: PlannedActivity, word: { english: string; portuguese: string }, grade: 'hard' | 'good', example: string): AppData {
  const key = `${activity.key}:${word.english}`;
  const old = data.cards.find((card) => card.id === `vocab:${activity.contentId}:${word.english}`);
  const tomorrow = new Date(`${todayISO()}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const card: ReviewCard = { id: `vocab:${activity.contentId}:${word.english}`, phrase: word.english, example, meaning: word.portuguese, topic: 'startup', dueDate: tomorrow.toISOString().slice(0, 10), interval: grade === 'hard' ? 0 : 1, ease: 2.3 };
  return { ...data, vocabularyProgress: { ...(data.vocabularyProgress || {}), [key]: { grade, updatedAt: new Date().toISOString() } }, cards: old ? data.cards.map((item) => item.id === old.id ? grade === 'hard' ? { ...item, dueDate: card.dueDate, interval: 0 } : item : item) : [...data.cards, card] };
}

export function submitDailyQuiz(data: AppData, activity: PlannedActivity, currentDay: number): AppData {
  if (data.activities[activity.key]?.status === 'done') return data;
  const questions = activity.quizQuestions || [];
  const answers = data.quizDrafts?.[activity.key] || [];
  const result = scoreQuiz(questions, answers);
  const grouped = new Map<SkillId, { correct: number; total: number }>();
  questions.forEach((question, index) => { const score = grouped.get(question.skill) || { correct: 0, total: 0 }; score.total++; if (answers[index] === question.answer) score.correct++; grouped.set(question.skill, score); });
  let next = data;
  for (const [skill, score] of grouped) next = recordSkillAttempt(next, skill, score.correct, score.total, `quiz:${questions.filter((question) => question.skill === skill).map((question) => question.id).join(',')}`);
  const now = new Date();
  const missed = result.explanations.filter((item) => !item.correct).map((item) => {
    const question = questions.find((candidate) => candidate.id === item.questionId)!;
    const tomorrow = new Date(`${todayISO(now)}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return { id: `quiz:${activity.key}:${question.id}`, phrase: question.prompt, example: item.answer, meaning: item.explanation, topic: question.skill === 'startup' ? 'startup' as const : 'cotidiano' as const, dueDate: tomorrow.toISOString().slice(0, 10), interval: 0, ease: 2.3 };
  });
  next = finishActivity(next, activity, currentDay, `Teste: ${result.correct}/${result.total}; erros entram na revisão.`);
  next = { ...next, activities: { ...next.activities, [activity.key]: { ...next.activities[activity.key], comprehension: Math.round(result.correct / result.total * 5) } }, cards: [...new Map([...next.cards, ...missed].map((card) => [card.id, card])).values()] };
  if (activity.day % 28 === 0 || activity.day === 182) {
    next = { ...next, assessments: [{ id: crypto.randomUUID(), date: now.toISOString(), period: activity.day === 182 ? '182 dias · avaliação final' : `${activity.day} dias · avaliação mensal`, dimension: `Leitura e estruturas ${days[activity.day - 1].cefr_target}`, score: Math.max(1, Math.round(result.correct / result.total * 5)), correctAnswers: result.correct, totalQuestions: result.total, answers, notes: 'Resultado objetivo desta amostra; não certifica nível CEFR.' }, ...next.assessments] };
  }
  return next;
}

export function planForDay(day: number, data: AppData) { return makeDailyPlan(day, data); }
