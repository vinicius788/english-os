export type ResourceLevel = 'A0' | 'A0–A1' | 'A1' | 'A2' | 'A2–B1' | 'B1';
export type ResourceSkill = 'Listening' | 'Reading' | 'Listening + speaking';
export type ResourceTopic = 'Introductions' | 'Everyday life' | 'Work' | 'Study' | 'Story';
export type VerifiedResource = {
  id: string;
  title: string;
  source: 'VOA Learning English' | 'British Council LearnEnglish';
  level: ResourceLevel;
  skill: ResourceSkill;
  topic: ResourceTopic;
  url: string;
  verifiedAt: string;
  objective: string;
  exercise: string;
};

// Direct lesson pages checked against their publishers on 2026-10-13.
// CEFR labels mirror the publisher; A0/A0–A1 are app guidance, not certifications.
export const verifiedResources: VerifiedResource[] = [
  { id: 'voa-lesson-1', title: 'Lesson 1: Welcome!', source: 'VOA Learning English', level: 'A0', skill: 'Listening + speaking', topic: 'Introductions', url: 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-one/3111026.html', verifiedAt: '2026-10-13', objective: 'Reconhecer cumprimentos e apresentações curtas.', exercise: 'Ouça duas vezes; diga seu nome e origem em duas frases.' },
  { id: 'voa-lesson-2', title: "Lesson 2: Hello, I'm Anna!", source: 'VOA Learning English', level: 'A0', skill: 'Listening + speaking', topic: 'Introductions', url: 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-2-hello/3113733.html', verifiedAt: '2026-10-13', objective: 'Reconhecer perguntas de apresentação e origem.', exercise: 'Anote duas perguntas e responda em voz alta usando informações pessoais.' },
  { id: 'voa-lesson-3', title: "Lesson 3: I'm Here!", source: 'VOA Learning English', level: 'A0–A1', skill: 'Listening + speaking', topic: 'Everyday life', url: 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-3-i-am-here/3126527.html', verifiedAt: '2026-10-13', objective: 'Praticar frases curtas de chegada e localização.', exercise: 'Escute a conversa; repita três frases curtas e substitua o lugar por um lugar seu.' },
  { id: 'voa-lesson-4', title: 'Lesson 4: What Is It?', source: 'VOA Learning English', level: 'A0–A1', skill: 'Listening + speaking', topic: 'Everyday life', url: 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-4/3168920.html', verifiedAt: '2026-10-13', objective: 'Entender perguntas e descrições simples de objetos.', exercise: 'Escolha três objetos à sua volta e descreva cada um com uma frase simples.' },
  { id: 'voa-lesson-5', title: 'Lesson 5: Where Are You?', source: 'VOA Learning English', level: 'A0–A1', skill: 'Listening + speaking', topic: 'Everyday life', url: 'https://learningenglish.voanews.com/a/lets-learn-english-lesson-5-where-are-you/3168971.html', verifiedAt: '2026-10-13', objective: 'Reconhecer nomes de cômodos e responder onde alguém está.', exercise: 'Desenhe ou liste três cômodos; diga onde você está e uma ação em cada um.' },
  { id: 'voa-review-1-5', title: 'Review of Lessons 1–5', source: 'VOA Learning English', level: 'A0–A1', skill: 'Listening + speaking', topic: 'Introductions', url: 'https://learningenglish.voanews.com/a/lets-lear-english-review-lessons-1-5/4053916.html', verifiedAt: '2026-10-13', objective: 'Recuperar frases e vocabulário das cinco primeiras lições.', exercise: 'Faça o quiz oferecido pela página e registre quais itens quer rever.' },
  { id: 'bc-meeting-students', title: 'Meeting other students', source: 'British Council LearnEnglish', level: 'A1', skill: 'Listening + speaking', topic: 'Introductions', url: 'https://learnenglish.britishcouncil.org/free-resources/listening/a1/meeting-other-students', verifiedAt: '2026-10-13', objective: 'Identificar nomes, origem e matérias em apresentações.', exercise: 'Faça a preparação e os dois exercícios; registre dois fatos ouvidos.' },
  { id: 'bc-finding-library', title: 'Finding the library', source: 'British Council LearnEnglish', level: 'A1', skill: 'Listening + speaking', topic: 'Everyday life', url: 'https://learnenglish.britishcouncil.org/free-resources/listening/a1/finding-library', verifiedAt: '2026-10-13', objective: 'Compreender instruções simples de localização.', exercise: 'Complete a preparação e tarefas da página; explique um caminho usando next to.' },
  { id: 'bc-first-class', title: 'The first English class', source: 'British Council LearnEnglish', level: 'A1', skill: 'Listening', topic: 'Study', url: 'https://learnenglish.britishcouncil.org/sites/podcasts/files/LearnEnglish-Listening-A1-The-first-english-class.pdf', verifiedAt: '2026-10-13', objective: 'Praticar dias da semana, meses e informações de um curso.', exercise: 'Faça a tarefa de preparação do material e anote cinco informações reconhecidas.' },
  { id: 'bc-business-cards', title: 'Business cards', source: 'British Council LearnEnglish', level: 'A1', skill: 'Reading', topic: 'Work', url: 'https://learnenglish.britishcouncil.org/free-resources/reading/a1/business-cards', verifiedAt: '2026-10-13', objective: 'Encontrar nome, cargo, organização e contato em cartões profissionais.', exercise: 'Leia os quatro cartões e registre nome, cargo e empresa de duas pessoas.' },
  { id: 'bc-job-adverts', title: 'Job adverts', source: 'British Council LearnEnglish', level: 'A1', skill: 'Reading', topic: 'Work', url: 'https://learnenglish.britishcouncil.org/free-resources/reading/a1/job-adverts', verifiedAt: '2026-10-13', objective: 'Localizar função, requisitos e local em anúncios de emprego.', exercise: 'Faça preparação e tarefas; escolha um anúncio e anote cargo, empresa e requisito.' },
  { id: 'bc-notes-at-work', title: 'Notes at work', source: 'British Council LearnEnglish', level: 'A1', skill: 'Reading', topic: 'Work', url: 'https://learnenglish.britishcouncil.org/free-resources/reading/a1/notes-work', verifiedAt: '2026-10-13', objective: 'Interpretar mensagens curtas com tarefas, horários e recados de trabalho.', exercise: 'Complete as três tarefas e escreva um recado curto para um colega.' },
  { id: 'bc-study-skills-tips', title: 'Study skills tips', source: 'British Council LearnEnglish', level: 'A2', skill: 'Reading', topic: 'Study', url: 'https://learnenglish.britishcouncil.org/free-resources/reading/a2/study-skills-tips', verifiedAt: '2026-10-13', objective: 'Compreender sugestões e identificar ações de um bom aprendiz.', exercise: 'Leia o texto, faça os dois exercícios e resuma duas sugestões em inglês.' },
  { id: 'bc-hole-wall', title: 'The hole in the wall', source: 'British Council LearnEnglish', level: 'A2–B1', skill: 'Reading', topic: 'Story', url: 'https://learnenglish.britishcouncil.org/free-resources/general/story-zone/a2-b1/hole-wall-a2/b1', verifiedAt: '2026-10-13', objective: 'Ler uma história graduada e identificar sequência e detalhes.', exercise: 'Leia por partes, anote cinco palavras pelo contexto e responda às tarefas da página.' },
  { id: 'bc-customer-call', title: 'A phone call from a customer', source: 'British Council LearnEnglish', level: 'B1', skill: 'Listening + speaking', topic: 'Work', url: 'https://learnenglish.britishcouncil.org/skills/listening/b1-listening/phone-call-customer', verifiedAt: '2026-10-13', objective: 'Ouvir uma negociação de prazo e identificar o pedido do cliente.', exercise: 'Use apenas após se sentir pronto para B1; resuma pedido, motivo e resposta em inglês simples.' },
];

export function resourceForDay(dayNumber: number, week: number) {
  const candidates = week <= 4
    ? verifiedResources.filter((item) => item.level === 'A0' || item.level === 'A0–A1')
    : week <= 10
      ? verifiedResources.filter((item) => item.level === 'A1')
      : week <= 16
        ? verifiedResources.filter((item) => item.level === 'A1' || item.level === 'A2')
        : week <= 22
          ? verifiedResources.filter((item) => item.level === 'A2' || item.level === 'A2–B1')
          : verifiedResources.filter((item) => item.level === 'B1');
  return candidates[(dayNumber - 1) % candidates.length];
}

export function isTrustedResourceUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'learningenglish.voanews.com' || parsed.hostname === 'learnenglish.britishcouncil.org');
  } catch { return false; }
}
