import type { AppData, SkillAttempt, SkillId, SkillProgress, SkillStatus } from './domain';

export type QuizQuestion = {
  id: string;
  skill: SkillId;
  levels: string[];
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

// Authored, short retrieval checks. The answer key and rationale are shown after submission.
export const quizBank: QuizQuestion[] = [
  { id: 'greet-name', skill: 'grammar', levels: ['A0'], prompt: 'Choose a simple introduction.', options: ['My name is Ana.', 'I name Ana.', 'Name my is Ana.'], answer: 0, explanation: 'Use “My name is + nome” to introduce yourself.' },
  { id: 'be-from', skill: 'grammar', levels: ['A0'], prompt: 'Complete: I ___ from Brazil.', options: ['is', 'am', 'are'], answer: 1, explanation: 'With “I”, the verb be is “am”.' },
  { id: 'from-question', skill: 'reading', levels: ['A0'], prompt: 'Which question asks about a person’s country?', options: ['How old are you?', 'Where are you from?', 'What is your name?'], answer: 1, explanation: '“Where are you from?” asks about origin.' },
  { id: 'spell-repair', skill: 'speaking', levels: ['A0', 'A1'], prompt: 'You did not understand a name. What can you say?', options: ['Could you spell that, please?', 'I am spell.', 'What is your country?'], answer: 0, explanation: 'This polite question asks someone to spell a word.' },
  { id: 'routine-time', skill: 'grammar', levels: ['A1'], prompt: 'Complete: She ___ work at nine.', options: ['start', 'starts', 'starting'], answer: 1, explanation: 'In the present simple, “she” takes an -s ending: starts.' },
  { id: 'routine-reply', skill: 'reading', levels: ['A1'], prompt: '“I usually work from home.” Where does the person usually work?', options: ['At home.', 'At school.', 'At a station.'], answer: 0, explanation: 'The sentence directly says “from home”.' },
  { id: 'clarify', skill: 'speaking', levels: ['A1', 'A2'], prompt: 'A customer describes a problem quickly. What is a useful response?', options: ['Could you repeat that more slowly?', 'You are problem.', 'Goodbye, yesterday.'], answer: 0, explanation: 'Ask for repetition when information was unclear.' },
  { id: 'past-built', skill: 'grammar', levels: ['A2'], prompt: 'Complete: Last year, we ___ a prototype.', options: ['build', 'built', 'building'], answer: 1, explanation: '“Last year” marks the past; the past form of build is built.' },
  { id: 'customer-confirm', skill: 'reading', levels: ['A2'], prompt: 'A customer asks for a later delivery. What should you do first?', options: ['Confirm the request and clarify the new date.', 'Promise any date immediately.', 'Ignore the request.'], answer: 0, explanation: 'Restate the request and clarify details before confirming a commitment.' },
  { id: 'saas-paying', skill: 'startup', levels: ['A0', 'A1'], prompt: 'Complete: We have ___ customers.', options: ['paying', 'pay', 'pays'], answer: 0, explanation: '“Paying customers” is the phrase for customers who pay. The example does not supply a count.' },
  { id: 'company-helps', skill: 'startup', levels: ['A0', 'A1'], prompt: 'Choose the correct product sentence.', options: ['My company helps traders.', 'My company help trader.', 'My company is helps traders.'], answer: 0, explanation: 'With singular “my company”, use “helps”.' },
  { id: 'mrr', skill: 'startup', levels: ['A2'], prompt: 'What does monthly recurring revenue describe?', options: ['Recurring subscription revenue in a month.', 'The number of website pages.', 'A one-time meeting.'], answer: 0, explanation: 'MRR is recurring revenue normalized to a monthly period; it is not a specific company value.' },
  { id: 'churn', skill: 'startup', levels: ['A2'], prompt: 'A customer cancels a subscription. Which concept is relevant?', options: ['Churn.', 'Alphabet.', 'Pronunciation.'], answer: 0, explanation: 'Churn describes customers or recurring revenue lost over a period.' },
  { id: 'investor-traction', skill: 'startup', levels: ['A2', 'B1'], prompt: 'An investor asks for traction. What is the strongest answer?', options: ['A verified trend with a time period and source.', 'A guess presented as fact.', 'A promise with no evidence.'], answer: 0, explanation: 'Use a verifiable metric, identify its period, and explain the source. Do not invent company results.' },
  { id: 'product-market', skill: 'startup', levels: ['B1'], prompt: 'What evidence can help assess product-market fit?', options: ['Retention and repeat use among a defined customer group.', 'The founder’s favorite color.', 'A single unverified compliment.'], answer: 0, explanation: 'Repeated use and retention by a defined segment are evidence to investigate, not proof by themselves.' },
];

export function quizForDay(week: number, day: number): QuizQuestion[] {
  const level = week <= 4 ? 'A0' : week <= 10 ? 'A1' : week <= 20 ? 'A2' : 'B1';
  const eligible = quizBank.filter((question) => question.levels.includes(level));
  const offset = Math.max(0, day - 1) % eligible.length;
  const rotated = [...eligible.slice(offset), ...eligible.slice(0, offset)];
  return rotated.slice(0, Math.min(3, rotated.length));
}

export function scoreQuiz(questions: QuizQuestion[], answers: number[]) {
  const complete = questions.length > 0 && questions.every((_, index) => Number.isInteger(answers[index]) && answers[index] >= 0 && answers[index] < questions[index].options.length);
  if (!complete) throw new Error('Responda a todas as questões antes de corrigir.');
  const correct = questions.reduce((total, question, index) => total + Number(answers[index] === question.answer), 0);
  return { correct, total: questions.length, explanations: questions.map((question, index) => ({ questionId: question.id, correct: answers[index] === question.answer, explanation: question.explanation, answer: question.options[question.answer] })) };
}

const levels = ['A0', 'A1', 'A2', 'B1'];
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, count: number) => { const next = new Date(date); next.setUTCDate(next.getUTCDate() + count); return dateOnly(next); };

export function recordSkillAttempt(data: AppData, skill: SkillId, correct: number, total: number, evidence: string, at = new Date()): AppData {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total < 1 || correct < 0 || correct > total) throw new Error('Resultado de avaliação inválido.');
  const date = dateOnly(at);
  const attempt: SkillAttempt = { id: crypto.randomUUID(), skill, date: at.toISOString(), correct, total, evidence, level: data.settings.level || 'A0' };
  const history = [...(data.skillAttempts || []), attempt];
  const skillHistory = history.filter((item) => item.skill === skill).sort((a, b) => a.date.localeCompare(b.date));
  const daily = [...new Map(skillHistory.map((item) => [item.date.slice(0, 10), item])).values()];
  const recent = daily.slice(-3);
  const consistent = recent.length === 3 && recent.every((item) => item.correct / item.total >= 0.8);
  const old: SkillProgress = data.skills?.[skill] || { estimatedLevel: data.settings.level || 'A0', status: 'new', attempts: 0, successes: 0, errors: 0, intervalDays: 0, evidence: [] };
  const rate = correct / total;
  const nextInterval = rate >= 0.8 ? ([1, 3, 7, 14, 30].find((value) => value > old.intervalDays) ?? 30) : 1;
  const status: SkillStatus = consistent ? 'mastered' : rate < 0.6 ? 'reviewing' : 'learning';
  const currentLevelIndex = Math.max(0, levels.indexOf(old.estimatedLevel));
  const estimatedLevel = consistent ? levels[Math.min(levels.length - 1, currentLevelIndex + 1)] : old.estimatedLevel;
  const progress: SkillProgress = { estimatedLevel, status, attempts: old.attempts + 1, successes: old.successes + correct, errors: old.errors + total - correct, lastReview: date, nextReview: addDays(at, nextInterval), intervalDays: nextInterval, evidence: [...new Set([...old.evidence, evidence])].slice(-20) };
  return { ...data, skillAttempts: history, skills: { ...(data.skills || {}), [skill]: progress } };
}

export function initialSkills(level = 'A0'): Record<SkillId, SkillProgress> {
  return Object.fromEntries((['listening', 'reading', 'speaking', 'writing', 'vocabulary', 'grammar', 'startup'] as SkillId[]).map((skill) => [skill, { estimatedLevel: level, status: 'new' as const, attempts: 0, successes: 0, errors: 0, intervalDays: 0, evidence: [] }])) as unknown as Record<SkillId, SkillProgress>;
}

export function skillRetention(attempts: SkillAttempt[], skill: SkillId) {
  const related = attempts.filter((attempt) => attempt.skill === skill);
  const total = related.reduce((sum, attempt) => sum + attempt.total, 0);
  const correct = related.reduce((sum, attempt) => sum + attempt.correct, 0);
  return total ? { correct, total, percent: Math.round(correct / total * 100), attempts: related.length } : { correct: 0, total: 0, percent: 0, attempts: 0 };
}
