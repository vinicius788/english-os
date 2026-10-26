export type StartupModule = {
  id: string;
  level: 'A0' | 'A1' | 'A2' | 'B1';
  title: string;
  goal: string;
  words: Array<{ english: string; portuguese: string }>;
  phrases: string[];
  activity: string;
  successCriteria: string[];
};

export const startupModules: StartupModule[] = [
  { id: 'founder', level: 'A0', title: 'Sou founder', goal: 'Apresentar seu papel em uma frase curta.', words: [{ english: 'founder', portuguese: 'fundador(a)' }, { english: 'company', portuguese: 'empresa' }, { english: 'build', portuguese: 'construir' }, { english: 'platform', portuguese: 'plataforma' }], phrases: ['I am a founder.', 'I built a platform.'], activity: 'Apresente-se. Diga seu papel e repita uma frase sem ler.', successCriteria: ['Disse “I am a founder.”', 'Conseguiu falar duas frases curtas'] },
  { id: 'company', level: 'A0', title: 'O que minha empresa faz', goal: 'Explicar a empresa com sujeito e verbo simples.', words: [{ english: 'company', portuguese: 'empresa' }, { english: 'help', portuguese: 'ajudar' }, { english: 'trader', portuguese: 'trader / operador(a) de mercado' }, { english: 'user', portuguese: 'usuário(a)' }], phrases: ['My company helps traders.', 'Our platform helps users.'], activity: 'Complete a frase com suas próprias palavras e explique o significado em português.', successCriteria: ['Usou “helps” com company', 'Identificou quem o produto ajuda'] },
  { id: 'problem', level: 'A1', title: 'Problema e público', goal: 'Descrever um usuário e uma necessidade sem inventar dados.', words: [{ english: 'problem', portuguese: 'problema' }, { english: 'customer', portuguese: 'cliente' }, { english: 'need', portuguese: 'necessidade' }, { english: 'because', portuguese: 'porque' }], phrases: ['Our customers need ___.', 'They use our product because ___.'], activity: 'Preencha os espaços com uma situação real que você conhece ou deixe o exemplo geral.', successCriteria: ['Nomeou um público', 'Descreveu uma necessidade em uma frase'] },
  { id: 'product', level: 'A1', title: 'Desenvolvimento de produto', goal: 'Explicar uma ação de produto no presente ou passado.', words: [{ english: 'feature', portuguese: 'funcionalidade' }, { english: 'release', portuguese: 'lançamento/versão' }, { english: 'feedback', portuguese: 'feedback' }, { english: 'improve', portuguese: 'melhorar' }], phrases: ['We are improving our product.', 'We built a feature for ___.'], activity: 'Explique em voz alta uma melhoria real em andamento, sem compartilhar dado confidencial.', successCriteria: ['Descreveu uma ação de produto', 'Usou “are improving” ou “built” corretamente'] },
  { id: 'customer', level: 'A1', title: 'Conversar com clientes', goal: 'Fazer uma pergunta aberta e confirmar o que entendeu.', words: [{ english: 'question', portuguese: 'pergunta' }, { english: 'feedback', portuguese: 'opinião/feedback' }, { english: 'understand', portuguese: 'entender' }, { english: 'request', portuguese: 'solicitação' }], phrases: ['What are you trying to do?', 'Let me check I understood.', 'Could you tell me more?'], activity: 'Roleplay: cliente descreve uma dificuldade; faça uma pergunta e resuma a resposta.', successCriteria: ['Fez pergunta de esclarecimento', 'Confirmou a necessidade antes de sugerir solução'] },
  { id: 'subscriptions', level: 'A2', title: 'Assinaturas SaaS', goal: 'Descrever planos e pagamentos recorrentes.', words: [{ english: 'subscription', portuguese: 'assinatura' }, { english: 'monthly', portuguese: 'mensal' }, { english: 'plan', portuguese: 'plano' }, { english: 'paying customer', portuguese: 'cliente pagante' }], phrases: ['We offer a monthly subscription.', 'We have paying customers.'], activity: 'Explique o modelo de cobrança usando apenas o que você puder afirmar com segurança.', successCriteria: ['Usou “monthly subscription”', 'Separou fatos conhecidos de informações que precisa confirmar'] },
  { id: 'growth', level: 'A2', title: 'Receita recorrente e aquisição', goal: 'Falar sobre MRR e aquisição sem preencher métricas por suposição.', words: [{ english: 'monthly recurring revenue', portuguese: 'receita recorrente mensal' }, { english: 'acquisition', portuguese: 'aquisição' }, { english: 'conversion', portuguese: 'conversão' }, { english: 'period', portuguese: 'período' }], phrases: ['Our monthly recurring revenue is ___.', 'We acquire customers through ___.'], activity: 'Use os campos opcionais da trilha somente se tiver valores reais; informe período e origem ou pratique com lacunas.', successCriteria: ['Pronunciou o nome da métrica', 'Incluiu período e fonte quando citou um valor'] },
  { id: 'retention', level: 'A2', title: 'Retenção e churn', goal: 'Explicar perda e permanência de clientes com o vocabulário correto.', words: [{ english: 'retention', portuguese: 'retenção' }, { english: 'churn', portuguese: 'cancelamento/perda' }, { english: 'cohort', portuguese: 'coorte' }, { english: 'renewal', portuguese: 'renovação' }], phrases: ['We are working to improve retention.', 'We measure churn over ___.'], activity: 'Explique por que é importante indicar o período ao comparar churn ou retenção.', successCriteria: ['Diferenciou retenção e churn', 'Mencionou um período de medição'] },
  { id: 'strategy', level: 'B1', title: 'Crescimento e product-market fit', goal: 'Apresentar uma hipótese e a evidência que poderia testá-la.', words: [{ english: 'growth strategy', portuguese: 'estratégia de crescimento' }, { english: 'product-market fit', portuguese: 'adequação produto-mercado' }, { english: 'segment', portuguese: 'segmento' }, { english: 'evidence', portuguese: 'evidência' }], phrases: ['Our hypothesis is ___.', 'We are testing this with ___.', 'This evidence suggests ___.'], activity: 'Faça uma hipótese, nomeie um segmento e diga que comportamento observável mediria.', successCriteria: ['Separou hipótese de fato', 'Indicou evidência observável'] },
  { id: 'investors', level: 'B1', title: 'Parcerias e pitch para investidores', goal: 'Apresentar problema, solução, público e evidências em um pitch curto.', words: [{ english: 'partnership', portuguese: 'parceria' }, { english: 'funding', portuguese: 'captação' }, { english: 'investment', portuguese: 'investimento' }, { english: 'runway', portuguese: 'tempo de caixa disponível' }], phrases: ['We are looking for a strategic partnership.', 'We are raising ___ to achieve ___.', 'Our evidence so far is ___.'], activity: 'Responda a uma pergunta de investidor sem revelar projeções ou números não verificados.', successCriteria: ['Explicou problema, solução e público', 'Respondeu com evidência real ou declarou que precisa confirmar'] },
];

export function startupModuleForWeek(week: number) {
  const index = Math.max(0, Math.min(startupModules.length - 1, Math.floor((week - 1) / 3)));
  return startupModules[index];
}

// Short practice examples authored for the existing vocabulary. They contain no
// claims about the learner's company or its metrics.
const vocabularyExamples: Record<string, string> = {
  founder: 'I am a founder.', company: 'This company builds software.', build: 'We build a simple tool.', platform: 'This platform helps users.',
  help: 'We help new users.', trader: 'A trader uses the platform.', user: 'One user shared feedback.',
  problem: 'What problem does this solve?', customer: 'A customer has a question.', need: 'Customers need clear instructions.', because: 'We ask because we want to understand.',
  feature: 'This feature is easy to use.', release: 'The next release is planned.', feedback: 'We ask for feedback.', improve: 'We improve the product step by step.',
  question: 'I have a question for the customer.', understand: 'I want to understand the request.', request: 'Please confirm the request.',
  subscription: 'This is a monthly subscription.', monthly: 'The plan has a monthly fee.', plan: 'Please choose a plan.', 'paying customer': 'A paying customer has an active subscription.',
  'monthly recurring revenue': 'Monthly recurring revenue is a business metric.', acquisition: 'Acquisition describes how new customers arrive.', conversion: 'Conversion depends on a defined action.', period: 'State the period for each metric.',
  retention: 'Retention describes customers who stay.', churn: 'Churn describes customers who leave.', cohort: 'A cohort is a defined customer group.', renewal: 'A renewal extends a subscription.',
  'growth strategy': 'A growth strategy needs a clear goal.', 'product-market fit': 'Product-market fit needs evidence from users.', segment: 'Define one customer segment.', evidence: 'Use evidence to test the idea.',
  partnership: 'A partnership has shared goals.', funding: 'Funding can support a defined plan.', investment: 'An investment needs clear terms.', runway: 'Runway depends on cash and spending.',
};

export function vocabularyExample(module: StartupModule, english: string) {
  return module.phrases.find((phrase) => phrase.toLowerCase().includes(english.toLowerCase())) || vocabularyExamples[english];
}

export function sampleWithMetrics(text: string, metrics: Record<string, string>) {
  return text.replace(/\[\[(\w+)\]\]/g, (_, key: string) => metrics[key]?.trim() || '___');
}

export const startupMetricFields = [
  { key: 'payingCustomers', label: 'Clientes pagantes', sample: 'We have ___ paying customers.' },
  { key: 'mrr', label: 'MRR (valor e moeda)', sample: 'Our monthly recurring revenue is ___ per month.' },
  { key: 'churn', label: 'Churn (valor e período)', sample: 'Our churn rate was ___ over ___.' },
  { key: 'acquisition', label: 'Canal de aquisição', sample: 'We acquire customers through ___.' },
  { key: 'funding', label: 'Captação/objetivo (opcional)', sample: 'We are raising ___ to achieve ___.' },
];
