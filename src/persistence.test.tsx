import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './ui/App';
import { clearData, loadData, mergeBackupData, saveData } from './persistence';
import { defaultData } from './domain';

afterEach(async () => { cleanup(); await clearData(); });

describe('local persistence', () => {
  it('imports a backup without replacing newer local progress and restores the exported course snapshot', () => {
    const current = defaultData();
    current.settings.targetMinutes = 90;
    current.activities['1:0'] = { status: 'done', updatedAt: '2026-10-20T10:00:00.000Z' };
    const backup = defaultData();
    backup.lectures[0] = { ...backup.lectures[0], id: 'udemy-id-exported', title: 'Backup catalog title', status: 'watched' };
    backup.watched = ['udemy-id-exported'];
    backup.catalogImport = { ...backup.catalogImport!, source: 'User imported catalog' };
    backup.assessments = [{ id: 'backup-assessment', date: '2026-10-15', period: 'diagnostic', dimension: 'reading', score: 4, notes: 'saved' }];
    const restored = mergeBackupData(current, { format: 'english-os-backup', formatVersion: 1, progress: backup });
    expect(restored.settings.targetMinutes).toBe(90);
    expect(restored.activities['1:0']).toMatchObject({ status: 'done' });
    expect(restored.lectures[0]).toMatchObject({ id: 'udemy-id-exported', title: 'Backup catalog title', status: 'watched' });
    expect(restored.watched).toContain('udemy-id-exported');
    expect(restored.assessments).toContainEqual(expect.objectContaining({ id: 'backup-assessment' }));
  });

  it('rejects malformed backups before changing saved progress', () => {
    const current = defaultData();
    current.activities['1:1'] = { status: 'done', updatedAt: '2026-10-20T10:00:00.000Z' };
    expect(() => mergeBackupData(current, { progress: { version: 1, activities: {} } })).toThrow(/Backup inválido/);
    expect(current.activities['1:1'].status).toBe('done');
  });

  it('restores an activity from storage after reload', async () => {
    const data = defaultData();
    data.activities['1:0'] = { status: 'done', updatedAt: '2026-10-14T12:00:00.000Z', actualMinutes: 45 };
    await saveData(data);
    await expect(loadData()).resolves.toMatchObject({ activities: { '1:0': { status: 'done', actualMinutes: 45 } } });
  });
  it('restores new progress fields alongside the original Udemy import', async () => {
    const data = defaultData();
    data.dayOutputs = { '1:4': 'My name is Vini.' };
    data.startupMetrics = { mrr: 'not entered' };
    data.activityHistory = [{ id: 'history-1', activityKey: '1:1', day: 1, kind: 'completed_late', at: '2026-10-15T12:00:00.000Z' }];
    data.skillAttempts = [{ id: 'attempt-1', skill: 'reading', date: '2026-10-15T12:00:00.000Z', correct: 2, total: 3, evidence: 'quiz:reading-1', level: 'A0' }];
    data.tutorSessions = [{ id: 'session-1', scenarioId: 'introduce-yourself', title: 'Introductions', level: 'A0', createdAt: '2026-10-15T12:00:00.000Z', messages: [{ role: 'user', content: 'Hello', createdAt: '2026-10-15T12:00:00.000Z' }] }];
    const sourceStatus = data.lectures[0].importedStatus;
    await saveData(data);
    const restored = await loadData();
    expect(restored).toMatchObject({ dayOutputs: { '1:4': 'My name is Vini.' }, startupMetrics: { mrr: 'not entered' }, activityHistory: [{ id: 'history-1' }], skillAttempts: [{ id: 'attempt-1' }], tutorSessions: [{ id: 'session-1', messages: [{ content: 'Hello' }] }] });
    expect(restored.lectures).toHaveLength(545);
    expect(restored.lectures[0].importedStatus).toBe(sourceStatus);
  });
});

describe('study UI', () => {
  it('marks an activity and still shows it as completed after remounting the app', async () => {
    const user = userEvent.setup();
    const view = render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Hoje' }));
    const button = (await screen.findAllByRole('button', { name: /Marcar .* como concluída/ }))[0];
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole('button', { name: /Desmarcar .*$/ })).toBeInTheDocument());
    view.unmount();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Hoje' }));
    expect((await screen.findAllByRole('button', { name: /Desmarcar .*$/ })).length).toBeGreaterThan(0);
  });

  it('reprograms a calendar date while retaining the original day number', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Calendário' }));
    const input = await screen.findByLabelText('Reagendar dia 1');
    fireEvent.change(input, { target: { value: '2026-10-20' } });
    await waitFor(async () => expect(await loadData()).toMatchObject({ overrides: { 1: '2026-10-20' } }));
    expect(screen.getByText('Dia 1')).toBeInTheDocument();
    expect(screen.getAllByText('Cumprimentos e identidade').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the day objective and direct verified input lesson in daily guidance', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Hoje' }));
    expect((await screen.findAllByText('Objetivo')).length).toBeGreaterThan(0);
    const lessonLink = screen.getAllByRole('link', { name: 'Abrir material' }).find((link) => link.getAttribute('href')?.includes('lets-learn-english-lesson-one'));
    expect(lessonLink).toBeDefined();
    expect(lessonLink).toHaveAttribute('href', 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html');
    expect(lessonLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('stores the three independent input lesson states and restores them', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Input' }));
    const watched = screen.getAllByLabelText('Assisti')[0];
    const understood = screen.getAllByLabelText('Compreendi')[0];
    const repeat = screen.getAllByLabelText('Preciso repetir')[0];
    await user.click(watched); await user.click(understood); await user.click(repeat);
    await waitFor(async () => expect(await loadData()).toMatchObject({ inputProgress: { 'voa-lesson-1': { watched: true, understood: true, repeat: true } } }));
  });

  it('filters verified input by level and reading skill without losing the specific lessons', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Input' }));
    fireEvent.change(screen.getByLabelText('Dificuldade'), { target: { value: 'A1' } });
    fireEvent.change(screen.getByLabelText('Habilidade'), { target: { value: 'Reading' } });
    expect(await screen.findByRole('heading', { name: 'Business cards' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Job adverts' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Lesson 1: Welcome!' })).not.toBeInTheDocument();
    const businessCards = screen.getByRole('heading', { name: 'Business cards' }).closest<HTMLElement>('.resource-card')!;
    expect(within(businessCards).getByRole('link', { name: 'Abrir lição original' })).toHaveAttribute('href', 'https://learnenglish.britishcouncil.org/free-resources/reading/a1/business-cards');
  });

  it('scores and persists a monthly quiz independently of lesson completion', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/hoje?dia=28']}><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Plano adaptativo do dia' });
    const fieldsets = [...document.querySelectorAll<HTMLElement>('.daily-quiz fieldset')];
    expect(fieldsets.length).toBeGreaterThan(0);
    for (const fieldset of fieldsets) await user.click(within(fieldset).getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: 'Corrigir teste e salvar resultado' }));
    await waitFor(async () => expect((await loadData()).assessments[0]).toMatchObject({ period: '28 dias · avaliação mensal', totalQuestions: fieldsets.length }));
    expect((await loadData()).skillAttempts?.length).toBeGreaterThan(0);
    expect((await loadData()).lectures.find((item) => item.sequence === 6)?.status).toBe('not-started');
  });

  it('imports user-provided Udemy metadata and keeps manual watch status on reimport', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Udemy' }));
    const fileInput = document.querySelector('input[type="file"][accept*="text/csv"]') as HTMLInputElement;
    const csv = 'sequence,externalLectureId,sectionOrder,section,title,durationSeconds,durationMinutes,url,metadataSource,status\n1,verified-1,1,Imported section,Imported title,300,,,User provided,';
    const firstFile = new File([csv], 'verified-catalog.csv', { type: 'text/csv' });
    Object.defineProperty(firstFile, 'text', { value: async () => csv });
    await user.upload(fileInput, firstFile);
    await waitFor(() => expect(screen.queryByRole('alert')?.textContent).toBeUndefined());
    expect((await screen.findAllByText('Imported title')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Marcar aula 1 concluída' }));
    const updatedCsv = csv.replace('Imported title', 'Updated source title');
    const secondFile = new File([updatedCsv], 'verified-catalog.csv', { type: 'text/csv' });
    Object.defineProperty(secondFile, 'text', { value: async () => updatedCsv });
    await user.upload(fileInput, secondFile);
    await waitFor(async () => {
      const restored = await loadData();
      expect(restored.lectures).toHaveLength(545);
      expect(restored.lectures.find((item) => item.id === 'udemy-id-verified-1')).toMatchObject({ title: 'Updated source title', status: 'watched' });
      expect(restored.watched).toContain('udemy-id-verified-1');
    });
  });

  it('saves diagnostic answers as an assessment rather than inferring skill from watched lessons', async () => {
    const user = userEvent.setup();
    render(<BrowserRouter><App /></BrowserRouter>);
    await user.click(await screen.findByRole('link', { name: 'Avaliações' }));
    await user.click(screen.getByLabelText('My name is Ana.'));
    await user.click(screen.getByLabelText('am'));
    await user.click(screen.getByLabelText('At home.'));
    await user.click(screen.getByLabelText('Where are you from?'));
    await user.click(screen.getByRole('button', { name: 'Salvar resultado do diagnóstico' }));
    await waitFor(async () => expect(await loadData()).toMatchObject({ assessments: [{ period: 'Diagnóstico inicial', dimension: 'Leitura e estruturas A0', correctAnswers: 4, totalQuestions: 4 }] }));
  });
});
