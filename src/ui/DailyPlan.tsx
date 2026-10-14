import { useState } from 'react';
import type { AppData, ActivityHistoryEvent, ActivityRecord, SkillId } from '../domain';
import { recordSkillAttempt, scoreQuiz } from '../adaptive';
import { dailyTarget, makeDailyPlan, overdueActivities, type PlannedActivity } from '../studyPlan';
import { days, getScheduledDate } from '../domain';

type Props = { dayNumber: number; currentDayNumber?: number; data: AppData; update: (fn: (current: AppData) => AppData) => void; showNotice: (message: string) => void };

export function DailyPlan({ dayNumber, currentDayNumber = dayNumber, data, update, showNotice }: Props) {
  const day = days[dayNumber - 1];
  const plan = makeDailyPlan(dayNumber, data);
  const allOverdue = overdueActivities(currentDayNumber, data);
  const overdue = allOverdue.slice(0, 6);
  const complete = plan.filter((activity) => data.activities[activity.key]?.status === 'done' || data.activities[activity.key]?.status === 'skipped').length;
  return <div className="daily-engine">
    <section className="card tasks-card"><div className="section-title"><h2>Plano adaptativo do dia</h2><span className="subtle">{complete} de {plan.length} etapas · meta {dailyTarget(day, data)} min</span></div>
      <p className="task-intro">{day.daily_instruction} A ordem do curso é mantida; conclusões de tarefas são diferentes de evidência de domínio.</p>
      <div className="task-list">{plan.map((activity) => <DailyActivity key={activity.key} activity={activity} dayNumber={dayNumber} data={data} update={update} showNotice={showNotice} />)}</div>
      <div className="task-total"><span>Meta do plano</span><b>{dailyTarget(day, data)} minutos</b></div>
    </section>
    {allOverdue.length > 0 && <section className="card overdue-card"><div className="section-title"><h2>Pendências para retomar</h2><span className="status-badge status-overdue">{allOverdue.length} em atraso</span></div><p>Estas tarefas permanecem no histórico do dia de origem. Concluí-las agora atualiza o registro original e guarda a data real da conclusão. A fila Udemy continua ordenada em seu bloco diário.</p><div className="task-list">{overdue.map((activity) => <DailyActivity key={activity.key} activity={activity} dayNumber={currentDayNumber} isOverdue data={data} update={update} showNotice={showNotice} />)}</div>{allOverdue.length > overdue.length && <small>Mostrando as primeiras {overdue.length} pendências, em ordem pedagógica.</small>}</section>}
  </div>;
}

function DailyActivity({ activity, dayNumber, data, update, showNotice, isOverdue = false }: Props & { activity: PlannedActivity; isOverdue?: boolean }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<ReturnType<typeof scoreQuiz> | null>(null);
  const record = data.activities[activity.key];
  const day = days[activity.day - 1];
  const completed = record?.status === 'done';
  const waived = record?.status === 'skipped';
  const toggle = () => update((current) => {
    if (completed) { const activities = { ...current.activities }; delete activities[activity.key]; return { ...current, activities }; }
    const now = new Date();
    const activities = { ...current.activities, [activity.key]: { status: 'done', updatedAt: now.toISOString(), completedAt: now.toISOString(), lifecycle: 'completed', scheduledDate: getScheduledDate(activity.day, current), ...(activity.kind === 'writing' ? { notes: current.dayOutputs?.[activity.key] || '' } : {}) } satisfies ActivityRecord };
    const history: ActivityHistoryEvent[] = [...(current.activityHistory || [])];
    if (activity.day < dayNumber) history.push({ id: crypto.randomUUID(), activityKey: activity.key, day: activity.day, kind: 'completed_late', at: now.toISOString(), fromDate: getScheduledDate(activity.day, current), toDate: getScheduledDate(dayNumber, current) });
    return { ...current, activities, activityHistory: history };
  });
  const waive = () => {
    if (completed || waived) return;
    const evidence = window.prompt('Qual avaliação ou evidência permite dispensar esta atividade?');
    if (!evidence?.trim()) return;
    const now = new Date().toISOString();
    update((current) => ({ ...current, activities: { ...current.activities, [activity.key]: { status: 'skipped', lifecycle: 'waived', updatedAt: now, completedAt: now, notes: evidence.trim(), scheduledDate: getScheduledDate(activity.day, current) } }, activityHistory: [...(current.activityHistory || []), { id: crypto.randomUUID(), activityKey: activity.key, day: activity.day, kind: 'waived', at: now, evidence: evidence.trim() }] }));
  };
  const toggleInputProgress = (field: 'watched' | 'understood' | 'repeat', value: boolean) => {
    if (!activity.resourceId) return;
    update((current) => { const previous = current.inputProgress?.[activity.resourceId!] || { watched: false, understood: false, repeat: false, updatedAt: '' }; return { ...current, inputProgress: { ...(current.inputProgress || {}), [activity.resourceId!]: { ...previous, [field]: value, updatedAt: new Date().toISOString() } } }; });
  };
  const submitQuiz = () => {
    const questions = activity.quizQuestions || [];
    let result: ReturnType<typeof scoreQuiz>;
    try { result = scoreQuiz(questions, answers); } catch (error) { showNotice(error instanceof Error ? error.message : 'Responda todas as questões.'); return; }
    setQuizResult(result);
    update((current) => {
      const grouped = new Map<SkillId, { correct: number; total: number }>();
      questions.forEach((question, index) => { const score = grouped.get(question.skill) || { correct: 0, total: 0 }; score.total += 1; if (answers[index] === question.answer) score.correct += 1; grouped.set(question.skill, score); });
      let next = { ...current };
      for (const [skill, score] of grouped) next = recordSkillAttempt(next, skill, score.correct, score.total, `quiz:${questions.filter((question) => question.skill === skill).map((question) => question.id).join(',')}`);
      const now = new Date();
      const cards = [...(current.cards || [])];
      result.explanations.filter((item) => !item.correct).forEach((item) => {
        const question = questions.find((candidate) => candidate.id === item.questionId)!;
        cards.push({ id: `quiz-${crypto.randomUUID()}`, phrase: question.prompt, example: item.answer, meaning: item.explanation, topic: question.skill === 'startup' ? 'startup' : 'cotidiano', dueDate: new Date(now.getTime() + 86400000).toISOString().slice(0, 10), interval: 0, ease: 2.3 });
      });
      const activities = { ...current.activities, [activity.key]: { status: 'done', updatedAt: now.toISOString(), completedAt: now.toISOString(), lifecycle: 'completed', scheduledDate: getScheduledDate(activity.day, current), comprehension: Math.round(result.correct / result.total * 5), notes: `Teste: ${result.correct}/${result.total}; erros entram na revisão.` } satisfies ActivityRecord };
      let assessments = current.assessments;
      if (activity.day % 28 === 0 || activity.day === 182) {
        assessments = [{ id: crypto.randomUUID(), date: now.toISOString(), period: activity.day === 182 ? '182 dias · avaliação final' : `${activity.day} dias · avaliação mensal`, dimension: `Leitura e estruturas ${day.cefr_target}`, score: Math.max(1, Math.round(result.correct / result.total * 5)), correctAnswers: result.correct, totalQuestions: result.total, answers, notes: 'Resultado do teste rápido objetivo; mede somente esta amostra, não certifica CEFR.' }, ...assessments];
      }
      return { ...next, cards, activities, assessments };
    });
    showNotice(`Resultado salvo: ${result.correct}/${result.total}. Erros viraram cartões de revisão.`);
  };
  const questions = activity.quizQuestions || [];
  return <article className={`task-item daily-activity ${completed ? 'task-complete' : ''} ${isOverdue ? 'activity-overdue' : ''}`}>
    <button className={`task-check ${completed || waived ? 'checked' : ''}`} aria-label={completed ? `Desmarcar ${activity.title}` : `Marcar ${activity.title} como concluída`} onClick={toggle}>{completed ? '✓' : waived ? '–' : null}</button>
    <div className="task-body"><div className="task-title-row"><span className="task-number">{String(activity.index + 1).padStart(2, '0')}</span><h3>{activity.title}</h3></div>
      {isOverdue && <span className="status-badge status-overdue">Pendência do dia {activity.day}</span>}{waived && <span className="status-badge status-skipped">Dispensada com evidência</span>}
      <dl className="activity-guidance"><div><dt>Objetivo</dt><dd>{activity.objective}</dd></div><div><dt>Instruções</dt><dd>{activity.instructions}</dd></div><div><dt>Material</dt><dd>{activity.material}</dd></div><div><dt>Exercício</dt><dd>{activity.exercise}</dd></div><div><dt>Critério</dt><dd>{activity.criteria}</dd></div></dl>
      {activity.kind === 'input' && activity.resourceId && (() => { const progress = data.inputProgress?.[activity.resourceId] || { watched: false, understood: false, repeat: false, updatedAt: '' }; return <div className="resource-progress"><label><input type="checkbox" checked={progress.watched} onChange={(event) => toggleInputProgress('watched', event.target.checked)} /> Assisti</label><label><input type="checkbox" checked={progress.understood} onChange={(event) => toggleInputProgress('understood', event.target.checked)} /> Compreendi</label><label><input type="checkbox" checked={progress.repeat} onChange={(event) => toggleInputProgress('repeat', event.target.checked)} /> Preciso repetir</label></div>; })()}
      {activity.kind === 'writing' && <label className="field-label" htmlFor={`writing-${activity.key}`}>Seu texto (salvo automaticamente)<textarea id={`writing-${activity.key}`} value={data.dayOutputs?.[activity.key] || ''} onChange={(event) => update((current) => ({ ...current, dayOutputs: { ...(current.dayOutputs || {}), [activity.key]: event.target.value } }))} placeholder="Escreva suas frases em inglês aqui…" rows={3} /></label>}
      {activity.kind === 'quiz' && <div className="diagnostic-questions daily-quiz">{questions.map((question, index) => <fieldset key={question.id} disabled={Boolean(quizResult)}><legend>{index + 1}. {question.prompt}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`quiz-${activity.key}-${index}`} checked={answers[index] === optionIndex} onChange={() => setAnswers((old) => { const next = [...old]; next[index] = optionIndex; return next; })} /> {option}</label>)}{quizResult && <small className={quizResult.explanations[index].correct ? 'quiz-correct' : 'quiz-incorrect'}>{quizResult.explanations[index].correct ? 'Correto. ' : 'Revisar. '}{quizResult.explanations[index].explanation}</small>}</fieldset>)}<button type="button" className="button secondary" disabled={Boolean(quizResult) || questions.some((_, index) => !Number.isInteger(answers[index]))} onClick={submitQuiz}>{quizResult ? `Corrigido: ${quizResult.correct}/${quizResult.total}` : 'Corrigir teste e salvar resultado'}</button>{quizResult && <button type="button" className="button quiet" onClick={() => { setAnswers([]); setQuizResult(null); }}>Refazer teste</button>}</div>}
      {activity.url && <a href={activity.url} target="_blank" rel="noopener noreferrer">Abrir material <span aria-hidden="true">→</span></a>}
      {record?.completedAt && <small className="subtle">Concluída em {new Date(record.completedAt).toLocaleString('pt-BR')} {isOverdue ? '(após o dia planejado)' : ''}</small>}
      {!completed && !waived && activity.kind !== 'quiz' && <button className="waive-button" onClick={waive}>Dispensar após avaliação…</button>}
    </div><span className="task-minutes">{activity.minutes} min</span>
  </article>;
}
