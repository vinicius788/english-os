import { days, getDailyCoursePlan, getScheduledDate, type AppData, type CurriculumDay, type SkillId } from './domain';
import { quizBank, quizForDay } from './adaptive';
import { resourceForDay } from './resources';
import { scenarioForWeek } from './speaking';
import { startupModuleForWeek } from './startup';

const weights = [0.32, 0.16, 0.12, 0.10, 0.10, 0.08, 0.06, 0.06];
export type ActivityKind = 'udemy' | 'input' | 'speaking' | 'review' | 'writing' | 'vocabulary' | 'quiz' | 'startup';
export type PlannedActivity = {
  key: string;
  index: number;
  day: number;
  kind: ActivityKind;
  skill: SkillId;
  title: string;
  objective: string;
  minutes: number;
  instructions: string;
  material: string;
  exercise: string;
  criteria: string;
  url: string | null;
  quizQuestions?: ReturnType<typeof quizForDay>;
  resourceId?: string;
  skillReviewDue?: SkillId[];
};

export function dailyTarget(day: CurriculumDay, data: AppData) {
  const configured = Math.max(30, Math.min(180, Math.round(data.settings.targetMinutes || 120)));
  // Preserve the source curriculum's weekly active-rest day while applying the
  // user target to every full study day.
  return day.minutes <= 45 ? Math.min(configured, 45) : configured;
}

export function allocateMinutes(total: number) {
  const raw = weights.map((weight) => total * weight);
  const result = raw.map(Math.floor);
  let left = total - result.reduce((sum, n) => sum + n, 0);
  for (const index of raw.map((value, i) => ({ i, remainder: value - Math.floor(value) })).sort((a, b) => b.remainder - a.remainder).map((item) => item.i)) {
    if (left <= 0) break;
    result[index] += 1;
    left -= 1;
  }
  // Each learning mode stays present even at the 30-minute minimum.
  for (let i = 0; i < result.length; i++) {
    if (result[i] === 0) {
      const donor = result.findIndex((value, index) => value > 1 && index !== i);
      if (donor >= 0) { result[donor] -= 1; result[i] = 1; }
    }
  }
  return result;
}

export function makeDailyPlan(dayNumber: number, data: AppData): PlannedActivity[] {
  const day = days[dayNumber - 1];
  if (!day) return [];
  const minutes = allocateMinutes(dailyTarget(day, data));
  const [udemyMinutes, inputMinutes, speakingMinutes, reviewMinutes, writingMinutes, vocabularyMinutes, quizMinutes, startupMinutes] = minutes;
  const course = getDailyCoursePlan(dayNumber, data, udemyMinutes);
  const input = resourceForDay(day.day, day.week);
  const conversation = scenarioForWeek(day.week);
  const startup = startupModuleForWeek(day.week);
  const scheduledDate = getScheduledDate(dayNumber, data);
  const skillReviewDue = (Object.entries(data.skills || {}) as Array<[SkillId, NonNullable<AppData['skills']>[SkillId]]>).filter(([, progress]) => Boolean(progress?.nextReview && progress.nextReview <= scheduledDate && progress.attempts > 0)).map(([skill]) => skill);
  const baseQuestions = quizForDay(day.week, day.day);
  const quizLevel = day.week <= 4 ? 'A0' : day.week <= 10 ? 'A1' : day.week <= 20 ? 'A2' : 'B1';
  const priorityQuestions = skillReviewDue.flatMap((skill) => quizBank.filter((question) => question.skill === skill && question.levels.includes(quizLevel)).slice(0, 1));
  const questions = [...new Map([...priorityQuestions, ...baseQuestions].map((question) => [question.id, question])).values()].slice(0, 3);
  const skillNames: Record<SkillId, string> = { listening: 'compreensão oral', reading: 'leitura', speaking: 'conversação', writing: 'escrita', vocabulary: 'vocabulário', grammar: 'gramática', startup: 'Startup English' };
  const dueSkillNames = skillReviewDue.map((skill) => skillNames[skill]);
  const vocabulary = startup.words.slice(0, 4);
  const create = (index: number, kind: ActivityKind, skill: SkillId, fields: Omit<PlannedActivity, 'key' | 'index' | 'day' | 'kind' | 'skill' | 'minutes'> & { minutes?: number }): PlannedActivity => ({ key: `${day.day}:${index}`, index, day: day.day, kind, skill, ...fields, minutes: fields.minutes ?? minutes[index] });
  return [
    create(0, 'udemy', 'grammar', { title: course.lessons.length ? `Udemy · aulas ${course.lessons[0].sequence}–${course.lessons.at(-1)!.sequence}` : 'Udemy · fila do curso', objective: 'Avançar na sequência real, usando a duração do catálogo sem inferir domínio.', minutes: udemyMinutes, instructions: 'Use este bloco como orçamento de estudo; a duração de cada aula catalogada aparece no material e a última pode passar do orçamento para preservar a sequência.', material: course.lessons.map((lesson) => `${lesson.sequence}. ${lesson.title} (${lesson.durationMinutes} min)`).join(' · ') || 'Próximo item incompleto do catálogo Udemy', exercise: 'Registre uma regra ou ideia e responda o exercício do curso sem abrir a solução primeiro.', criteria: 'Marque aulas separadamente após fazer o conteúdo. Aulas assistidas não contam como domínio.', url: 'https://www.udemy.com/course/domine-o-ingles-rapido/' }),
    create(1, 'input', 'listening', { title: input.title, objective: input.objective, minutes: inputMinutes, instructions: 'Ouça uma vez pela ideia geral, depois use o preparo e as questões da própria fonte.', material: `${input.source} · ${input.level} · ${input.skill}`, exercise: input.exercise, criteria: 'Registre se assistiu, compreendeu e se precisa repetir. A autoavaliação não é tratada como prova de domínio.', url: input.url, resourceId: input.id }),
    create(2, 'speaking', 'speaking', { title: conversation.title, objective: conversation.goal, minutes: speakingMinutes, instructions: `${conversation.prompt} Use as frases de apoio; comece lendo se necessário.`, material: `${conversation.level} · ${conversation.phrases.join(' / ')}`, exercise: `Tente cumprir: ${conversation.success.join('; ')}. Depois registre uma frase produzida e uma dificuldade.`, criteria: 'Registre tempo e evidência. O app não estima pronúncia nem fluência sem avaliação apropriada.', url: null }),
    create(3, 'review', 'vocabulary', { title: 'Revisão espaçada e recuperação ativa', objective: 'Recuperar palavras, frases e habilidades com revisão agendada antes de consultar respostas.', minutes: reviewMinutes, instructions: 'Responda primeiro os cartões vencidos. Se a fila estiver vazia, tente recuperar de memória as palavras do tema. As habilidades listadas aqui terão prioridade no teste objetivo de hoje.', material: `Seus cartões pessoais e vocabulário deste tema${dueSkillNames.length ? ` · habilidades vencidas: ${dueSkillNames.join(', ')}` : ''}`, exercise: `Diga ou escreva significado e um exemplo curto para cada cartão vencido${dueSkillNames.length ? `; depois responda ao teste rápido priorizado para ${dueSkillNames.join(', ')}.` : '.'}`, criteria: 'Use “Difícil” para rever amanhã; “Fácil” avança pelo ciclo D+1, D+3, D+7, D+14, D+30. Evidência de habilidade é atualizada apenas por uma nova avaliação objetiva.', url: null, skillReviewDue }),
    create(4, 'writing', 'writing', { title: 'Escrita curta com apoio', objective: `Escrever 2–4 frases sobre ${day.focus}.`, minutes: writingMinutes, instructions: 'Use primeiro as frases modelo, depois reescreva uma frase com informação sua. Não use métricas reais se não as tiver confirmado.', material: `${day.weekly_theme} · ${startup.phrases.slice(0, 2).join(' ')}`, exercise: `Escreva 2–4 frases. Sugestão: ${day.daily_output}.`, criteria: 'Salve o texto e confira: sujeito presente, verbo adequado e mensagem compreensível.', url: null }),
    create(5, 'vocabulary', 'vocabulary', { title: `Vocabulário · ${startup.title}`, objective: 'Aprender palavras contextualizadas com inglês para startups em progressão.', minutes: vocabularyMinutes, instructions: 'Leia inglês → português, cubra a tradução e tente lembrar o significado. Use uma palavra em uma frase.', material: vocabulary.map((item) => `${item.english} — ${item.portuguese}`).join(' · '), exercise: `Faça uma frase com “${vocabulary[0]?.english}”.`, criteria: 'Recupere pelo menos duas palavras sem olhar; erros criam revisão para o dia seguinte.', url: null }),
    create(6, 'quiz', 'grammar', { title: 'Teste rápido de compreensão', objective: 'Verificar estruturas e leitura do nível indicado nesta semana.', minutes: quizMinutes, instructions: `Responda ${questions.length} questão(ões) sem consultar material. A correção mostra a resposta e a explicação.`, material: `${questions.length} questões · ${day.cefr_target} · correção imediata`, exercise: 'Selecione uma resposta em cada questão.', criteria: 'Acertos e erros entram no histórico da habilidade; desempenho baixo agenda revisão. Assistir conteúdo não altera o resultado.', url: null, quizQuestions: questions }),
    create(7, 'startup', 'startup', { title: `Startup English · ${startup.title}`, objective: startup.goal, minutes: startupMinutes, instructions: startup.activity, material: `${startup.level} · ${startup.words.map((item) => item.english).join(', ')}`, exercise: startup.phrases.join(' / '), criteria: `Critérios observáveis: ${startup.successCriteria.join('; ')}. Use apenas dados que você inserir e verificar.`, url: null }),
  ];
}

export function overdueActivities(currentDay: number, data: AppData) {
  const pending: PlannedActivity[] = [];
  for (const dayNumber of days.filter((day) => day.day < currentDay && getScheduledDate(day.day, data) <= getScheduledDate(currentDay, data)).map((day) => day.day)) {
    for (const activity of makeDailyPlan(dayNumber, data)) {
      const record = data.activities[activity.key];
      if (record?.status !== 'done' && record?.status !== 'skipped' && activity.kind !== 'udemy') pending.push(activity);
    }
  }
  return pending.sort((a, b) => a.day - b.day || a.index - b.index);
}

export function dayPlanStatus(dayNumber: number, data: AppData, today: string): 'not-started' | 'in-progress' | 'completed' | 'skipped' | 'overdue' | 'rescheduled' {
  const plan = makeDailyPlan(dayNumber, data);
  const records = plan.map((activity) => data.activities[activity.key]);
  if (records.every((record) => record?.status === 'done' || record?.status === 'skipped')) return records.some((record) => record?.status === 'skipped') ? 'skipped' : 'completed';
  if (records.some((record) => record?.status === 'done' || record?.status === 'skipped')) return 'in-progress';
  const scheduled = getScheduledDate(dayNumber, data);
  if (scheduled && scheduled < today) return 'overdue';
  return data.overrides[dayNumber] ? 'rescheduled' : 'not-started';
}
