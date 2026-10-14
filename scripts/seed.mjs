import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const file = resolve('english_os_182_dias.json');
const output = resolve('supabase/seed.sql');
const data = JSON.parse(await readFile(file, 'utf8'));
const fail = (message) => { throw new Error(`Seed inválido: ${message}`); };
if (data.daily_plan.length !== 182 || data.weekly_themes.length !== 26) fail('esperadas 182 datas e 26 semanas.');
if (new Set(data.daily_plan.map((day) => day.day)).size !== 182) fail('números de dia duplicados.');
if (new Set(data.weekly_themes.map((week) => week.week)).size !== 26) fail('números de semana duplicados.');
const escapeSql = (value) => `'${String(value).replaceAll("'", "''")}'`;
for (const [index, day] of data.daily_plan.entries()) {
  if (day.day !== index + 1) fail(`ordem inválida no registro ${index + 1}.`);
  if (day.week !== Math.ceil(day.day / 7)) fail(`semana inválida no dia ${day.day}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || Number.isNaN(Date.parse(`${day.date}T12:00:00Z`))) fail(`data inválida no dia ${day.day}.`);
  if (day.tasks.reduce((sum, task) => sum + task.minutes, 0) !== day.minutes) fail(`soma de minutos divergente no dia ${day.day}.`);
  for (const task of day.tasks) if (task.url && !['http:', 'https:'].includes(new URL(task.url).protocol)) fail(`URL insegura no dia ${day.day}.`);
}
const statements = ['-- Gerado a partir de english_os_182_dias.json. Reexecutável sem duplicar registros.', 'begin;'];
for (const week of data.weekly_themes) statements.push(`insert into public.curriculum_weeks (week_number,target_cefr,topic,outcome,focus) values (${week.week},${escapeSql(week.level)},${escapeSql(week.theme)},${escapeSql(week.outcome)},${escapeSql(week.focus)}) on conflict (week_number) do update set target_cefr=excluded.target_cefr,topic=excluded.topic,outcome=excluded.outcome,focus=excluded.focus;`);
for (const day of data.daily_plan) {
  const payload = JSON.stringify(day).replaceAll("'", "''");
  statements.push(`insert into public.curriculum_days (day_number,planned_date,week_id,objective,default_minutes,payload) select ${day.day},${escapeSql(day.date)},id,${escapeSql(day.daily_output)},${day.minutes},'${payload}'::jsonb from public.curriculum_weeks where week_number=${day.week} on conflict (day_number) do update set planned_date=excluded.planned_date,week_id=excluded.week_id,objective=excluded.objective,default_minutes=excluded.default_minutes,payload=excluded.payload;`);
}
for (const resource of [
  ['Udemy course landing page','https://www.udemy.com/course/domine-o-ingles-rapido/','catalog','Course landing page; no lesson titles asserted.'],
  ['VOA Learning English Level 1','https://learningenglish.voanews.com/p/5644.html','listening','Collection page; select the lesson on source site.'],
  ['VOA Let’s Learn English Lesson 1','https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html','listening','Specific page supplied by project seed.'],
  ['VOA review lessons 1–5','https://learningenglish.voanews.com/a/lets-lear-english-review-lessons-1-5/4053916.html','listening','Specific page supplied by project seed.'],
  ['British Council Speaking','https://learnenglish.britishcouncil.org/free-resources/speaking','speaking','Official collection; choose content by declared level.'],
  ['British Council Listening','https://learnenglish.britishcouncil.org/free-resources/listening','listening','Official collection; choose content by declared level.'],
  ['British Council Reading A1','https://learnenglish.britishcouncil.org/free-resources/reading/a1','reading','Official collection.'],
  ['British Council Reading A2','https://learnenglish.britishcouncil.org/free-resources/reading/a2','reading','Official collection.'],
  ['British Council Story Zone','https://learnenglish.britishcouncil.org/free-resources/general/story-zone','reading','Stories A2–B1; verify per-item level.'],
  ['British Council Reading B1','https://learnenglish.britishcouncil.org/free-resources/reading/b1','reading','Official collection.'],
  ['Project Gutenberg','https://www.gutenberg.org/','reading','Public-domain books; level varies.'],
]) statements.push(`insert into public.resources(external_source,title,url,skill,verified_at,copyright_notes) values ('curated',${escapeSql(resource[0])},${escapeSql(resource[1])},${escapeSql(resource[2])},now(),${escapeSql(resource[3])}) on conflict(url) do update set title=excluded.title,skill=excluded.skill,copyright_notes=excluded.copyright_notes;`);
statements.push('commit;');
await writeFile(output, `${statements.join('\n')}\n`);
console.log(`Validado e gravado: 26 semanas, 182 dias, ${data.daily_plan.reduce((count, day) => count + day.tasks.length, 0)} tarefas e ${data.daily_plan.flatMap((day) => day.tasks).filter((task) => task.url).length} referências com URL em ${output}`);
