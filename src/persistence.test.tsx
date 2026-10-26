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
    data.quizDrafts = { '28:6': [1] };
    data.quizQuestionIds = { '28:6': ['be-from', 'greet-name'] };
    data.studySession = { day: 28, activityKey: '28:6', open: true };
    data.startupMetrics = { mrr: 'not entered' };
    data.activityHistory = [{ id: 'history-1', activityKey: '1:1', day: 1, kind: 'completed_late', at: '2026-10-15T12:00:00.000Z' }];
    data.skillAttempts = [{ id: 'attempt-1', skill: 'reading', date: '2026-10-15T12:00:00.000Z', correct: 2, total: 3, evidence: 'quiz:reading-1', level: 'A0' }];
    data.tutorSessions = [{ id: 'session-1', scenarioId: 'introduce-yourself', title: 'Introductions', level: 'A0', createdAt: '2026-10-15T12:00:00.000Z', messages: [{ role: 'user', content: 'Hello', createdAt: '2026-10-15T12:00:00.000Z' }] }];
    const sourceStatus = data.lectures[0].importedStatus;
    await saveData(data);
    const restored = await loadData();
    expect(restored).toMatchObject({ dayOutputs: { '1:4': 'My name is Vini.' }, quizDrafts: { '28:6': [1] }, quizQuestionIds: { '28:6': ['be-from', 'greet-name'] }, studySession: { day: 28, activityKey: '28:6', open: true }, startupMetrics: { mrr: 'not entered' }, activityHistory: [{ id: 'history-1' }], skillAttempts: [{ id: 'attempt-1' }], tutorSessions: [{ id: 'session-1', messages: [{ content: 'Hello' }] }] });
    expect(restored.lectures).toHaveLength(545);
    expect(restored.lectures[0].importedStatus).toBe(sourceStatus);
  });
});

describe('study UI', () => {
  it('opens the saved exercise with one click from the home page', async () => {
    const user = userEvent.setup();
    const data = defaultData();
    for (let index = 0; index < 4; index++) data.activities[`1:${index}`] = { status: 'done', updatedAt: new Date().toISOString() };
    data.studySession = { day: 1, activityKey: '1:4', open: true };
    data.dayOutputs = { '1:4': 'My name is Vini.' };
    await saveData(data);
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
    await user.click(await screen.findByRole('link', { name: /CONTINUAR DE ONDE PAREI/ }));
    expect(await screen.findByDisplayValue('My name is Vini.')).toBeInTheDocument();
    expect(document.querySelector('.guided-content')).toHaveAttribute('data-content-id', 'writing-day-1');
  });

  it('completes day 1 in order without leaving the guided study panel', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/hoje?dia=1']}><App /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /CONTINUAR ESTUDANDO/ }));
    const panel = document.querySelector<HTMLElement>('.guided-card')!;
    const contentId = () => panel.querySelector('.guided-content')?.getAttribute('data-content-id');
    expect(contentId()).toBe('udemy-day-1');
    await user.click(within(panel).getByRole('button', { name: 'Concluí o bloco da Udemy' }));
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    expect(contentId()).toBe('voa-lesson-1');
    await user.click(within(panel).getByLabelText('Assisti'));
    fireEvent.change(within(panel).getByLabelText('Verificação: o que você compreendeu?'), { target: { value: 'The person says hello.' } });
    await user.click(within(panel).getByRole('button', { name: 'Salvar Input e concluir' }));
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    expect(contentId()).toBeTruthy();
    fireEvent.change(within(panel).getByLabelText('Que frase você disse? Onde teve dificuldade?'), { target: { value: 'My name is Vini.' } });
    await user.click(within(panel).getByLabelText('Consegui falar'));
    await user.click(within(panel).getByRole('button', { name: 'Salvar prática e concluir' }));
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    expect(contentId()).toBe('review-day-1');
    expect(within(panel).getByText(/Nenhum cartão pendente/)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Concluir revisão' }));
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    expect(contentId()).toBe('writing-day-1');
    fireEvent.change(within(panel).getByLabelText('Sua resposta (rascunho salvo automaticamente)'), { target: { value: 'My name is Vini. I am from Brazil.' } });
    await user.click(within(panel).getByRole('button', { name: 'Salvar texto e concluir' }));
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    const wordCards = panel.querySelectorAll<HTMLElement>('.guided-word');
    expect(wordCards.length).toBeGreaterThanOrEqual(2);
    for (const card of [...wordCards].slice(0, 2)) await user.click(within(card).getByRole('button', { name: 'Lembrei' }));
    await user.click(within(panel).getAllByRole('radio')[0]);
    await user.click(within(panel).getByRole('button', { name: 'Concluir vocabulário' }));
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    const fieldsets = panel.querySelectorAll<HTMLElement>('.daily-quiz fieldset');
    for (const fieldset of fieldsets) await user.click(within(fieldset).getAllByRole('radio')[0]);
    await user.click(within(panel).getByRole('button', { name: 'Corrigir teste e salvar resultado' }));
    expect(within(panel).getByText(/Resultado:/)).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: /PRÓXIMA ATIVIDADE/ }));
    fireEvent.change(within(panel).getByLabelText('Sua frase ou resposta'), { target: { value: 'My company helps people.' } });
    await user.click(within(panel).getByRole('button', { name: 'Salvar Startup English e concluir' }));
    expect(within(panel).getByText('ESTUDO DE HOJE CONCLUÍDO')).toBeInTheDocument();
    const restored = await loadData();
    expect(Object.keys(restored.activities).filter((key) => key.startsWith('1:') && restored.activities[key].status === 'done')).toHaveLength(8);
    expect(restored.lectures).toHaveLength(545);
    expect(restored.courseTests).toHaveLength(24);
  }, 20000);

  it('restores a partially written answer and the active activity after reload', async () => {
    const user = userEvent.setup();
    const data = defaultData();
    for (let index = 0; index < 4; index++) data.activities[`1:${index}`] = { status: 'done', updatedAt: new Date().toISOString() };
    await saveData(data);
    const view = render(<MemoryRouter initialEntries={['/hoje?dia=1']}><App /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /CONTINUAR ESTUDANDO/ }));
    const answer = screen.getByLabelText('Sua resposta (rascunho salvo automaticamente)');
    fireEvent.change(answer, { target: { value: 'My name is Vini.' } });
    await waitFor(async () => expect((await loadData()).dayOutputs?.['1:4']).toBe('My name is Vini.'));
    view.unmount();
    render(<MemoryRouter initialEntries={['/hoje?dia=1']}><App /></MemoryRouter>);
    expect(await screen.findByDisplayValue('My name is Vini.')).toBeInTheDocument();
    expect((await loadData()).activities['1:4']).toBeUndefined();
  });

  it('marks an activity and still shows it as completed after remounting the app', async () => {
    const user = userEvent.setup();
    const view = render(<MemoryRouter initialEntries={['/hoje?dia=1']}><App /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /CONTINUAR ESTUDANDO/ }));
    await user.click(screen.getByRole('button', { name: 'Concluí o bloco da Udemy' }));
    expect(screen.getByRole('button', { name: /PRÓXIMA ATIVIDADE/ })).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={['/hoje?dia=1']}><App /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: /PRÓXIMA ATIVIDADE/ })).toBeInTheDocument();
    expect((await loadData()).activities['1:0'].status).toBe('done');
    expect((await loadData()).lectures[0].status).toBe('not-started');
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
    const data = defaultData();
    data.activities['1:0'] = { status: 'done', updatedAt: new Date().toISOString() };
    await saveData(data);
    render(<MemoryRouter initialEntries={['/hoje?dia=1']}><App /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /CONTINUAR ESTUDANDO/ }));
    const lessonLink = screen.getByRole('link', { name: /Abrir lição específica/ });
    expect(lessonLink).toHaveAttribute('href', 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html');
    expect(lessonLink).toHaveAttribute('target', '_blank');
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
    const data = defaultData();
    for (let index = 0; index < 6; index++) data.activities[`28:${index}`] = { status: 'done', updatedAt: new Date().toISOString() };
    await saveData(data);
    render(<MemoryRouter initialEntries={['/hoje?dia=28']}><App /></MemoryRouter>);
    await user.click(await screen.findByRole('button', { name: /CONTINUAR ESTUDANDO/ }));
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
