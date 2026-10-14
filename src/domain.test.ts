import { describe, expect, it } from 'vitest';
import { days, dayStatus, defaultData, getDailyCoursePlan, getScheduledDate, getTodayDay, importUdemyCatalog, lectureIsComplete, mergeProgress, parseLectureImport, scheduleReview, seed, stableLectureId, bundledCatalog } from './domain';
import { isTrustedResourceUrl, verifiedResources } from './resources';

describe('curriculum schedule', () => {
  it('contains 182 ordered unique dates, week themes, and correct weekly load', () => {
    expect(days).toHaveLength(182);
    expect(new Set(days.map((day) => day.date)).size).toBe(182);
    expect(days[0].date).toBe('2026-10-14');
    expect(days[181].date).toBe('2027-04-13');
    expect(seed.weekly_themes).toHaveLength(26);
    for (const day of days) expect(day.tasks.reduce((sum, task) => sum + task.minutes, 0)).toBe(day.minutes);
  });
  it('resolves day 1 against Sao Paulo date before and on course start', () => {
    expect(getTodayDay(new Date('2026-10-13T15:00:00-03:00')).day).toBe(1);
    expect(getTodayDay(new Date('2026-10-14T15:00:00-03:00')).day).toBe(1);
  });
  it('shifts the scheduled dates without changing day identities and calculates in Sao Paulo time', () => {
    const data = defaultData();
    data.settings.startDate = '2026-11-01';
    expect(getScheduledDate(1, data)).toBe('2026-11-01');
    expect(getScheduledDate(182, data)).toBe('2027-05-01');
    expect(getTodayDay(new Date('2026-11-02T02:30:00Z'), data.settings.startDate).day).toBe(1);
  });
  it('keeps day incomplete until every planned activity is marked complete', () => {
    const data = defaultData();
    expect(dayStatus(days[0], data)).toBe('not-started');
    data.activities['1:0'] = { status: 'done', updatedAt: '2026-10-14T10:00:00.000Z' };
    expect(dayStatus(days[0], data)).toBe('in-progress');
  });
  it('identifies a day as completed only after every activity is explicitly done', () => {
    const data = defaultData();
    days[0].tasks.forEach((_, index) => { data.activities[`1:${index}`] = { status: 'done', updatedAt: '2026-10-14T10:00:00.000Z' }; });
    expect(dayStatus(days[0], data)).toBe('completed');
    data.activities['1:0'].status = 'skipped';
    expect(dayStatus(days[0], data)).toBe('skipped');
  });
});

describe('Udemy catalog import', () => {
  it('preloads the exact supplied 545 lessons and 24 tests with source statuses and no fabricated links', () => {
    const data = defaultData();
    expect(data.lectures).toHaveLength(545);
    expect(data.courseTests).toHaveLength(24);
    expect(new Set(data.lectures.map((item) => item.sequence)).size).toBe(545);
    expect(new Set(data.courseTests?.map((item) => item.sequence)).size).toBe(24);
    expect(data.lectures[0]).toMatchObject({ sequence: 1, title: 'Video Promocional do Curso', durationMinutes: 1, importedStatus: 'completed', type: 'lesson' });
    expect(data.lectures[544]).toMatchObject({ sequence: 545, title: 'Aula Bônus e Onde Está o Seu Certificado', importedStatus: 'unknown' });
    expect(data.lectures.every((item) => !item.url && !item.externalLectureId && !item.section)).toBe(true);
    expect(data.courseTests?.[0]).toMatchObject({ sequence: 1, title: 'Halloween - Text Comprehension', status: 'not-started' });
  });
  it('reimports the 545/24 catalog idempotently without losing local status or the source status snapshot', () => {
    const original = defaultData();
    const lesson = original.lectures.find((item) => item.sequence === 20)!;
    original.lectures = original.lectures.map((item) => item.id === lesson.id ? { ...item, status: 'watched' as const, completedAt: '2026-10-15T10:00:00.000Z' } : item);
    original.watched = [lesson.id];
    original.courseTests = original.courseTests?.map((item) => item.sequence === 1 ? { ...item, status: 'completed' as const, completedAt: '2026-10-15T11:00:00.000Z' } : item);
    const firstImport = importUdemyCatalog(original, bundledCatalog);
    const secondImport = importUdemyCatalog(firstImport, bundledCatalog);
    expect(secondImport.lectures).toHaveLength(545);
    expect(secondImport.courseTests).toHaveLength(24);
    expect(secondImport.lectures.find((item) => item.sequence === 20)).toMatchObject({ status: 'watched', importedStatus: 'not_completed', completedAt: '2026-10-15T10:00:00.000Z' });
    expect(secondImport.courseTests?.find((item) => item.sequence === 1)).toMatchObject({ status: 'completed', completedAt: '2026-10-15T11:00:00.000Z' });
    expect(secondImport.watched).toContain(lesson.id);
    expect(lectureIsComplete(secondImport.lectures.find((item) => item.sequence === 2)!, secondImport)).toBe(true);
  });
  it('recalculates the serial daily queue after delays and never skips an incomplete predecessor', () => {
    const data = defaultData();
    const day1 = getDailyCoursePlan(1, data);
    const day40 = getDailyCoursePlan(40, data);
    expect(day1.lessons[0].sequence).toBe(6);
    expect(day40.budgetMinutes).toBeGreaterThan(day1.budgetMinutes);
    const firstPending = day1.lessons[0];
    data.lectures = data.lectures.map((item) => item.id === firstPending.id ? { ...item, status: 'watched' } : item);
    data.watched.push(firstPending.id);
    expect(getDailyCoursePlan(2, data).lessons[0].sequence).toBeGreaterThan(firstPending.sequence);
    expect(getDailyCoursePlan(8, data).tests[0].sequence).toBe(1);
  });
  it('parses a real CSV, sorts by sequence and produces stable local IDs', () => {
    const rows = parseLectureImport('sequence,section,title,durationMinutes,url\n2,"Basics, part two",Hello there,7,https://www.udemy.com/course/example/\n1,Basics,Welcome,5,https://www.udemy.com/course/example/');
    expect(rows.map((row) => row.sequence)).toEqual([1, 2]);
    expect(rows[1].section).toBe('Basics, part two');
    expect(rows[0].id).toBe(stableLectureId(rows[0]));
  });
  it('rejects duplicate sequence values and non-Udemy URLs', () => {
    expect(() => parseLectureImport('[{"sequence":1,"section":"A","title":"A"},{"sequence":1,"section":"B","title":"B"}]')).toThrow(/repetidos/);
    expect(() => parseLectureImport('[{"sequence":1,"section":"A","title":"A","url":"https://example.com"}]')).toThrow();
  });
  it('imports optional blank CSV fields and keeps external ID and section order', () => {
    const [lecture] = parseLectureImport('sequence,externalLectureId,sectionOrder,section,title,durationSeconds,durationMinutes,url,metadataSource,status\n1,lesson-real-id,2,Section name,Real title,,,,Udemy export,');
    expect(lecture).toMatchObject({ id: 'udemy-id-lesson-real-id', externalLectureId: 'lesson-real-id', sectionOrder: 2, sequence: 1, section: 'Section name', title: 'Real title', metadataSource: 'Udemy export', status: 'not-started' });
    expect(lecture.url).toBeUndefined();
  });
  it('validates a complete 545-row catalog fixture without adding it to the app seed', () => {
    const fixture = Array.from({ length: 545 }, (_, index) => ({ sequence: index + 1, section: `Fixture section ${Math.floor(index / 61) + 1}`, sectionOrder: (index % 61) + 1, title: `Test fixture ${index + 1}` }));
    const catalog = parseLectureImport(JSON.stringify(fixture));
    expect(catalog).toHaveLength(545);
    expect(catalog[0].title).toBe('Test fixture 1');
    expect(catalog[544].sequence).toBe(545);
    expect(new Set(catalog.map((item) => item.id)).size).toBe(545);
  });
  it('combines local and incoming state without dropping lecture status, tests, or input progress', () => {
    const local = defaultData(); const incoming = defaultData();
    local.lectures = [{ id: 'udemy-1', sequence: 1, section: 'A', title: 'Imported', status: 'watched' }]; local.watched = ['udemy-1'];
    local.assessments = [{ date: '2026-10-14', period: '28 dias', dimension: 'Reading', score: 3, notes: 'evidência' }];
    local.inputProgress = { 'voa-lesson-1': { watched: true, understood: false, repeat: true, updatedAt: '2026-10-14T11:00:00.000Z' } };
    incoming.activities['1:0'] = { status: 'done', updatedAt: '2026-10-14T12:00:00.000Z' };
    const restored = mergeProgress(local, incoming);
    expect(restored.lectures[0].status).toBe('watched');
    expect(restored.watched).toContain('udemy-1');
    expect(restored.assessments).toHaveLength(1);
    expect(restored.inputProgress?.['voa-lesson-1'].repeat).toBe(true);
    expect(restored.activities['1:0'].status).toBe('done');
  });
});

describe('verified input catalog', () => {
  it('contains specific HTTPS lessons from the approved publisher domains', () => {
    expect(verifiedResources.length).toBeGreaterThanOrEqual(8);
    expect(new Set(verifiedResources.map((resource) => resource.id)).size).toBe(verifiedResources.length);
    for (const resource of verifiedResources) {
      expect(resource.title.trim()).not.toBe('');
      expect(resource.objective.trim()).not.toBe('');
      expect(resource.exercise.trim()).not.toBe('');
      expect(isTrustedResourceUrl(resource.url)).toBe(true);
    }
  });
});

describe('spaced review', () => {
  const card = { id: 'c1', phrase: 'I am from Brazil.', example: 'I am from Brazil.', meaning: 'Sou do Brasil.', topic: 'cotidiano' as const, interval: 0, ease: 2.3, dueDate: '2026-10-14' };
  it('schedules easy ratings on the prescribed intervals', () => {
    const first = scheduleReview(card, 'easy', new Date('2026-10-14T12:00:00Z'));
    expect(first.interval).toBe(1); expect(first.dueDate).toBe('2026-10-15');
    expect(scheduleReview(first, 'easy', new Date('2026-10-15T12:00:00Z')).interval).toBe(3);
  });
  it('sends hard cards back to the next day and bounds ease', () => {
    expect(scheduleReview({ ...card, interval: 30, ease: 1.3 }, 'hard', new Date('2026-10-14T12:00:00Z'))).toMatchObject({ interval: 1, dueDate: '2026-10-15', ease: 1.3 });
  });
});
