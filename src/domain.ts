import { z } from 'zod';
import curriculum from '../english_os_182_dias.json';
import udemyCatalog from '../english_os_udemy_catalogo_545.json';

export type CurriculumDay = (typeof curriculum.daily_plan)[number];
export type StudyWeek = (typeof curriculum.weekly_themes)[number];
export type ActivityStatus = 'todo' | 'done' | 'skipped';
export interface ActivityRecord { status: ActivityStatus; updatedAt: string; actualMinutes?: number; comprehension?: number; notes?: string; completedAt?: string; lifecycle?: 'scheduled' | 'completed' | 'overdue' | 'rescheduled' | 'waived'; scheduledDate?: string }
export interface ReviewCard { id: string; phrase: string; example: string; meaning: string; topic: 'cotidiano' | 'startup'; dueDate: string; interval: number; ease: number }
export type ImportedCourseStatus = 'completed' | 'not_completed' | 'unknown';
export interface Lecture { id: string; externalLectureId?: string; sequence: number; section?: string; sectionOrder?: number; title: string; durationMinutes?: number; durationSeconds?: number; url?: string; metadataSource?: string; type?: 'lesson' | 'exercise' | 'solution' | string; importedStatus?: ImportedCourseStatus; status?: 'not-started' | 'watched'; completedAt?: string }
export interface CourseTest { id: string; sequence: number; title: string; metadataSource?: string; status: 'not-started' | 'completed'; completedAt?: string }
export interface InputRecord { watched: boolean; understood: boolean; repeat: boolean; updatedAt: string }
export type SkillId = 'listening' | 'reading' | 'speaking' | 'writing' | 'vocabulary' | 'grammar' | 'startup';
export type SkillStatus = 'new' | 'learning' | 'reviewing' | 'mastered';
export interface SkillAttempt { id: string; skill: SkillId; date: string; correct: number; total: number; evidence: string; level: string; explanation?: string }
export interface SkillProgress { estimatedLevel: string; status: SkillStatus; attempts: number; successes: number; errors: number; lastReview?: string; nextReview?: string; intervalDays: number; evidence: string[] }
export interface TutorMessage { role: 'user' | 'assistant'; content: string; createdAt: string; feedback?: string }
export interface TutorSession { id: string; scenarioId: string; title: string; level: string; createdAt: string; messages: TutorMessage[] }
export interface ActivityHistoryEvent { id: string; activityKey: string; day: number; kind: 'rescheduled' | 'completed_late' | 'waived'; at: string; fromDate?: string; toDate?: string; evidence?: string }
export interface AppData {
  savedAt?: number;
  version: 1; activities: Record<string, ActivityRecord>; dayNotes: Record<number, string>; dayOutputs?: Record<string, string>; lectures: Lecture[]; watched: string[]; courseTests?: CourseTest[]; catalogImport?: { courseTitle: string; source: string; reportedProgress: string; importedLessonCount: number; importedTestCount: number }; inputProgress?: Record<string, InputRecord>;
  skills?: Partial<Record<SkillId, SkillProgress>>; skillAttempts?: SkillAttempt[]; tutorSessions?: TutorSession[]; activityHistory?: ActivityHistoryEvent[]; startupMetrics?: Record<string, string>;
  cards: ReviewCard[]; assessments: Array<{ id?: string; date: string; period: string; dimension: string; score: number; notes: string; correctAnswers?: number; totalQuestions?: number; answers?: number[] }>;
  speaking: Array<{ date: string; topic: string; minutes: number; notes: string }>;
  overrides: Record<number, string>;
  studySession?: { day: number; activityKey: string; open: boolean };
  quizDrafts?: Record<string, number[]>;
  quizQuestionIds?: Record<string, string[]>;
  vocabularyProgress?: Record<string, { grade: 'hard' | 'good'; updatedAt: string }>;
  activityDifficulty?: Record<string, 'easy' | 'hard'>;
  settings: { startDate: string; targetMinutes: number; timezone: string; level: string };
}

export const seed = curriculum;
export const days = curriculum.daily_plan as CurriculumDay[];
export const weeks = curriculum.weekly_themes as StudyWeek[];
export const defaultData = (): AppData => ({
  version: 1, activities: {}, dayNotes: {}, lectures: bundledCatalog.lessons.map((item) => ({ id: `udemy-${item.lesson_number}`, sequence: item.lesson_number, title: item.title, durationMinutes: item.duration_minutes, importedStatus: item.udemy_status, metadataSource: item.source, type: item.type, status: 'not-started' })), watched: [], courseTests: bundledCatalog.tests.map((item) => ({ id: `udemy-test-${item.test_number}`, sequence: item.test_number, title: item.title, metadataSource: item.source, status: 'not-started' })), catalogImport: { courseTitle: bundledCatalog.metadata.course_title, source: bundledCatalog.metadata.source, reportedProgress: bundledCatalog.metadata.reported_progress, importedLessonCount: bundledCatalog.lessons.length, importedTestCount: bundledCatalog.tests.length }, inputProgress: {}, cards: [], assessments: [], speaking: [], overrides: {},
  settings: { startDate: curriculum.metadata.start_date, targetMinutes: 120, timezone: curriculum.metadata.timezone, level: 'A0' },
});

export const lectureSchema = z.object({
  id: z.preprocess((v) => v === '' ? undefined : v, z.string().trim().min(1).max(180).optional()),
  externalLectureId: z.preprocess((v) => v === '' ? undefined : v, z.string().trim().min(1).max(180).optional()),
  sequence: z.coerce.number().int().positive(),
  section: z.string().trim().min(1).max(180),
  sectionOrder: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().int().positive().optional()),
  title: z.string().trim().min(1).max(300),
  durationMinutes: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().positive().optional()),
  durationSeconds: z.preprocess((v) => v === '' ? undefined : v, z.coerce.number().int().positive().optional()),
  url: z.preprocess((v) => v === '' ? undefined : v, z.string().url().refine((v) => new URL(v).hostname === 'www.udemy.com' || new URL(v).hostname === 'udemy.com').optional()),
  metadataSource: z.preprocess((v) => v === '' ? undefined : v, z.string().trim().min(1).max(300).optional()),
  status: z.preprocess((v) => v === '' ? undefined : v, z.enum(['not-started', 'watched']).optional()),
  importedStatus: z.enum(['completed', 'not_completed', 'unknown']).optional(),
  type: z.string().trim().min(1).max(60).optional(),
});
const udemyCatalogSchema = z.object({
  metadata: z.object({ course_title: z.string().min(1), source: z.string().min(1), reported_progress: z.string().min(1), numbered_lessons_count: z.literal(545), tests_count: z.literal(24) }),
  lessons: z.array(z.object({ lesson_number: z.number().int().positive(), title: z.string().trim().min(1).max(400), duration_minutes: z.number().positive(), udemy_status: z.enum(['completed', 'not_completed', 'unknown']), type: z.string().trim().min(1), source: z.string().trim().min(1) })).length(545),
  tests: z.array(z.object({ test_number: z.number().int().positive(), title: z.string().trim().min(1).max(400), source: z.string().trim().min(1) })).length(24),
});
export const bundledCatalog = udemyCatalogSchema.parse(udemyCatalog);
export const cardSchema = z.object({ phrase: z.string().trim().min(1), example: z.string().trim().min(1), meaning: z.string().trim().min(1), topic: z.enum(['cotidiano', 'startup']) });
export function stableLectureId(lecture: Pick<Lecture, 'sequence' | 'title'> & Partial<Pick<Lecture, 'externalLectureId' | 'section'>>) {
  if (lecture.externalLectureId) return `udemy-id-${lecture.externalLectureId}`;
  return `udemy-${lecture.sequence}`;
}

export function importUdemyCatalog(existing: AppData, input: unknown): AppData {
  const catalog = udemyCatalogSchema.parse(input);
  if (catalog.lessons.some((item, index) => item.lesson_number !== index + 1)) throw new Error('A ordem das aulas precisa conter, sem lacunas, os números de 1 a 545.');
  if (catalog.tests.some((item, index) => item.test_number !== index + 1)) throw new Error('A ordem dos testes precisa conter, sem lacunas, os números de 1 a 24.');
  const oldById = new Map((existing.lectures || []).map((item) => [item.id, item]));
  const oldBySequence = new Map((existing.lectures || []).map((item) => [item.sequence, item]));
  const importedLessons = catalog.lessons.map((item) => {
    const id = `udemy-${item.lesson_number}`;
    const old = oldById.get(id) || oldBySequence.get(item.lesson_number);
    return { id, sequence: item.lesson_number, title: item.title, durationMinutes: item.duration_minutes, importedStatus: item.udemy_status, metadataSource: item.source, type: item.type, status: old?.status ?? ((existing.watched || []).includes(id) ? 'watched' as const : 'not-started' as const), completedAt: old?.completedAt };
  });
  const mergedLessons = [...new Map([...(existing.lectures || []).filter((item) => !importedLessons.some((fresh) => fresh.sequence === item.sequence)), ...importedLessons].map((item) => [item.id, item])).values()].sort((a, b) => a.sequence - b.sequence);
  const oldTests = new Map((existing.courseTests || []).map((item) => [item.id, item]));
  const importedTests = catalog.tests.map((item) => {
    const id = `udemy-test-${item.test_number}`;
    const old = oldTests.get(id);
    return { id, sequence: item.test_number, title: item.title, metadataSource: item.source, status: old?.status || 'not-started' as const, completedAt: old?.completedAt };
  });
  const mergedTests = [...new Map([...(existing.courseTests || []).filter((item) => !importedTests.some((fresh) => fresh.sequence === item.sequence)), ...importedTests].map((item) => [item.id, item])).values()].sort((a, b) => a.sequence - b.sequence);
  return { ...existing, lectures: mergedLessons, courseTests: mergedTests, watched: [...new Set([...(existing.watched || []), ...mergedLessons.filter((item) => item.status === 'watched').map((item) => item.id)])], catalogImport: { courseTitle: catalog.metadata.course_title, source: catalog.metadata.source, reportedProgress: catalog.metadata.reported_progress, importedLessonCount: catalog.lessons.length, importedTestCount: catalog.tests.length } };
}

export function lectureIsComplete(lecture: Lecture, data: AppData) {
  return lecture.importedStatus === 'completed' || lecture.status === 'watched' || (data.watched || []).includes(lecture.id);
}

export function getDailyCoursePlan(dayNumber: number, data: AppData, dailyUdemyBudget = 45) {
  const studyDays = days.filter((day) => day.tasks.some((task) => task.type === 'udemy' && task.minutes > 0));
  const studyIndex = studyDays.findIndex((day) => day.day === dayNumber);
  const remainingDays = studyDays.length - studyIndex;
  const pending = (data.lectures || []).filter((lecture) => !lectureIsComplete(lecture, data)).sort((a, b) => a.sequence - b.sequence);
  const remainingMinutes = pending.reduce((sum, item) => sum + (item.durationMinutes || (item.durationSeconds ? item.durationSeconds / 60 : 0)), 0);
  const budgetMinutes = studyIndex < 0 || remainingDays <= 0 || remainingMinutes <= 0 ? 0 : Math.min(Math.max(0, dailyUdemyBudget), Math.max(1, Math.ceil(remainingMinutes / remainingDays)));
  const selected: Lecture[] = []; let minutes = 0;
  for (const lecture of pending) {
    const duration = lecture.durationMinutes || (lecture.durationSeconds ? Math.ceil(lecture.durationSeconds / 60) : 1);
    if (selected.length && minutes + duration > budgetMinutes) break;
    selected.push(lecture); minutes += duration;
    if (minutes >= budgetMinutes) break;
  }
  const dueTests = (data.courseTests || []).filter((test) => test.status !== 'completed' && Math.ceil(test.sequence * days.length / 24) <= dayNumber).sort((a, b) => a.sequence - b.sequence);
  return { lessons: selected, tests: dueTests.slice(0, 1), overdueTests: Math.max(0, dueTests.length - 1), budgetMinutes, remainingLessons: pending.length, remainingMinutes };
}
export function parseLectureImport(input: string): Lecture[] {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('O arquivo está vazio.');
  let rows: unknown[];
  if (trimmed.startsWith('[')) {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error('O JSON precisa ser uma lista de aulas.');
    rows = parsed;
  } else {
    const lines = trimmed.split(/\r?\n/).filter((line) => line.trim());
    const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const parseLine = (line: string) => {
      const values: string[] = []; let value = ''; let quoted = false;
      for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; } else if (ch === '"') quoted = !quoted; else if (ch === delimiter && !quoted) { values.push(value.trim()); value = ''; } else value += ch; }
      values.push(value.trim()); return values;
    };
    const header = parseLine(lines[0]).map((v) => v.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase().replace(/[\s-]+/g, '_'));
    const aliases: Record<string, string> = { external_id: 'externalLectureId', external_lecture_id: 'externalLectureId', externallectureid: 'externalLectureId', lecture_id: 'externalLectureId', section_order: 'sectionOrder', sectionorder: 'sectionOrder', duration_seconds: 'durationSeconds', durationseconds: 'durationSeconds', duration_minutes: 'durationMinutes', durationminutes: 'durationMinutes', metadata_source: 'metadataSource', metadatasource: 'metadataSource' };
    const normalizedHeader = header.map((value) => aliases[value] || value);
    const required = ['sequence', 'section', 'title'];
    if (required.some((key) => !normalizedHeader.includes(key))) throw new Error('CSV precisa das colunas sequence, section e title.');
    rows = lines.slice(1).map((line) => Object.fromEntries(parseLine(line).map((v, i) => [normalizedHeader[i], v])));
  }
  const parsed = rows.map((row) => lectureSchema.parse(row));
  if (!parsed.length) throw new Error('O arquivo não contém aulas, apenas o cabeçalho.');
  if (new Set(parsed.map((r) => r.sequence)).size !== parsed.length) throw new Error('Há números de aula repetidos no arquivo.');
  const ids = parsed.map((item) => item.externalLectureId || item.id || `sequence:${item.sequence}`);
  if (new Set(ids).size !== ids.length) throw new Error('Há identificadores de aula repetidos no arquivo.');
  return parsed.sort((a, b) => a.sequence - b.sequence).map((item) => ({ ...item, id: item.id || stableLectureId(item), status: item.status || 'not-started', metadataSource: item.metadataSource || 'Arquivo importado pelo usuário' }));
}

export function mergeProgress(local: AppData, incoming: AppData): AppData {
  const activities = { ...(incoming.activities || {}) };
  for (const [key, record] of Object.entries(local.activities || {})) {
    if (!activities[key] || activities[key].updatedAt <= record.updatedAt) activities[key] = record;
  }
  const mergeById = <T extends { id: string }>(left: T[] = [], right: T[] = []) => [...new Map([...left, ...right].map((item) => [item.id, item])).values()];
  // A user-supplied external ID may differ from the stable bundled ID. Sequence is
  // the only shared identity available in this source, so merge by sequence to
  // avoid duplicates while preserving the user's imported metadata.
  const lectures = [...new Map([...(incoming.lectures || []), ...(local.lectures || [])].map((item) => [item.sequence, item])).values()].map((lecture) => {
    const legacyWatched = [...(incoming.watched || []), ...(local.watched || [])].includes(lecture.id);
    const localLecture = (local.lectures || []).find((item) => item.id === lecture.id);
    return legacyWatched || localLecture?.status === 'watched' ? { ...lecture, status: 'watched' as const } : lecture;
  });
  const mergeUnique = <T,>(left: T[] = [], right: T[] = []) => [...new Map([...left, ...right].map((item) => [JSON.stringify(item), item])).values()];
  return {
    ...incoming,
    ...local,
    activities,
    dayNotes: { ...(incoming.dayNotes || {}), ...(local.dayNotes || {}) },
    dayOutputs: { ...(incoming.dayOutputs || {}), ...(local.dayOutputs || {}) },
    studySession: local.studySession || incoming.studySession,
    quizDrafts: { ...(incoming.quizDrafts || {}), ...(local.quizDrafts || {}) },
    quizQuestionIds: { ...(incoming.quizQuestionIds || {}), ...(local.quizQuestionIds || {}) },
    vocabularyProgress: { ...(incoming.vocabularyProgress || {}), ...(local.vocabularyProgress || {}) },
    activityDifficulty: { ...(incoming.activityDifficulty || {}), ...(local.activityDifficulty || {}) },
    overrides: { ...(incoming.overrides || {}), ...(local.overrides || {}) },
    lectures,
    watched: [...new Set([...(incoming.watched || []), ...(local.watched || []), ...lectures.filter((item) => item.status === 'watched').map((item) => item.id)])],
    courseTests: mergeById(incoming.courseTests || [], local.courseTests || []),
    catalogImport: local.catalogImport || incoming.catalogImport,
    inputProgress: { ...(incoming.inputProgress || {}), ...(local.inputProgress || {}) },
    skills: { ...(incoming.skills || {}), ...(local.skills || {}) },
    skillAttempts: mergeUnique(incoming.skillAttempts || [], local.skillAttempts || []),
    tutorSessions: mergeById(incoming.tutorSessions || [], local.tutorSessions || []).map((session) => {
      const remote = (incoming.tutorSessions || []).find((item) => item.id === session.id);
      const localSession = (local.tutorSessions || []).find((item) => item.id === session.id);
      const messages = mergeUnique(remote?.messages || [], localSession?.messages || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { ...session, messages };
    }),
    activityHistory: mergeById(incoming.activityHistory || [], local.activityHistory || []),
    startupMetrics: { ...(incoming.startupMetrics || {}), ...(local.startupMetrics || {}) },
    cards: mergeById(incoming.cards || [], local.cards || []),
    assessments: mergeUnique(incoming.assessments || [], local.assessments || []),
    speaking: mergeUnique(incoming.speaking || [], local.speaking || []),
    settings: { ...(incoming.settings || defaultData().settings), ...(local.settings || {}) },
  };
}

export function scheduleReview(current: ReviewCard, grade: 'wrong' | 'hard' | 'good' | 'easy', today = new Date()): ReviewCard {
  const steps = [1, 3, 7, 14, 30];
  const nextIndex = steps.findIndex((step) => step > current.interval);
  const interval = grade === 'wrong' || grade === 'hard' ? 1 : nextIndex < 0 ? 30 : steps[nextIndex];
  const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: seed.metadata.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const [year, month, date] = todayISO.split('-').map(Number);
  const due = new Date(Date.UTC(year, month - 1, date + interval));
  return { ...current, interval, ease: Math.max(1.3, Math.min(2.8, current.ease + (grade === 'easy' ? 0.1 : grade === 'good' ? 0 : grade === 'hard' ? -0.2 : -0.3))), dueDate: due.toISOString().slice(0, 10) };
}

export function todayISO(today = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: seed.metadata.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
}

export function dayStatus(day: CurriculumDay, data: AppData): 'not-started' | 'in-progress' | 'completed' | 'skipped' {
  const records = day.tasks.map((_, index) => data.activities[`${day.day}:${index}`]);
  const extensionRecords = [4, 5, 6, 7].map((index) => data.activities[`${day.day}:${index}`]);
  // Old snapshots only had four tasks. Their recorded completion remains visible;
  // new plan days require their expanded activities to be explicitly recorded.
  if (extensionRecords.some(Boolean)) records.push(...extensionRecords);
  if (records.some((record) => record?.status === 'skipped')) return 'skipped';
  if (records.length && records.every((record) => record?.status === 'done')) return 'completed';
  if (records.some((record) => record?.status === 'done')) return 'in-progress';
  return 'not-started';
}

export function getScheduledDate(dayNumber: number, data: AppData): string {
  const override = data.overrides[dayNumber];
  if (override) return override;
  const [year, month, date] = data.settings.startDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + dayNumber - 1)).toISOString().slice(0, 10);
}

export function getTodayDay(today = new Date(), startDate = seed.metadata.start_date): CurriculumDay {
  const localISO = new Intl.DateTimeFormat('en-CA', { timeZone: seed.metadata.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const [year, month, date] = startDate.split('-').map(Number);
  const [todayYear, todayMonth, todayDate] = localISO.split('-').map(Number);
  const offset = Math.floor((Date.UTC(todayYear, todayMonth - 1, todayDate) - Date.UTC(year, month - 1, date)) / 86400000);
  return days[Math.max(0, Math.min(days.length - 1, offset))];
}

export const firstTwoWeekTasks: Record<number, Array<{ key: string; title: string; instruction: string; sample: string; minutes: number }>> = {
  1: [
    { key: 'phrases', title: 'Pratique 6 expressões de apresentação', instruction: 'Leia cada expressão em voz alta três vezes.', sample: 'Hello. / Hi, my name is ___. / I am from Brazil. / Nice to meet you. / How are you? / I am fine, thank you.', minutes: 12 },
    { key: 'listen', title: 'VOA Lesson 1: assista e anote três palavras', instruction: 'Abra a lição oficial; assista uma vez sem pausar e depois repita três trechos curtos.', sample: 'Palavras para procurar: hello, name, meet.', minutes: 35 },
    { key: 'write', title: 'Escreva sua apresentação em cinco linhas', instruction: 'Complete e leia em voz alta. Uma palavra ou nome próprio por lacuna.', sample: 'Hello. My name is ___. I am from ___. I am a ___. Nice to meet you.', minutes: 15 },
    { key: 'roleplay', title: 'Roleplay: conheça alguém', instruction: 'Responda em voz alta às cinco perguntas; pode ler as respostas.', sample: 'What is your name? Where are you from? How are you? What do you do? Nice to meet you?', minutes: 20 },
  ],
  2: [
    { key: 'alphabet', title: 'Soletre seu nome e pratique números', instruction: 'Diga seu nome letra por letra em inglês e leia 10 números que você escolher.', sample: 'A, B, C… / My phone number is… / zero, one, two, three, four, five, six, seven, eight, nine.', minutes: 20 },
    { key: 'listen', title: 'VOA Level 1: escuta guiada', instruction: 'Abra a coleção oficial e localize a Lesson 3. A numeração é apenas indicação de ritmo, não uma URL confirmada.', sample: 'Anote 3 palavras que reconheceu e repita uma frase curta.', minutes: 25 },
    { key: 'write', title: 'Preencha seus dados em inglês', instruction: 'Escreva nome, país, cidade e telefone; confira cada número em voz alta.', sample: 'My name is ___. I am from Brazil. I live in ___. My phone number is ___.', minutes: 15 },
    { key: 'roleplay', title: 'Roleplay: forneça dados de contato', instruction: 'Responda sem olhar primeiro; depois confira as respostas escritas.', sample: 'How do you spell your name? Where do you live? What is your phone number?', minutes: 20 },
  ],
};
