import { useMemo, useState, type FormEvent } from 'react';
import type { AppData, TutorSession } from '../domain';
import { conversationScenarios, chatGPTVoicePrompt } from '../speaking';
import { configuredTutorProvider } from '../aiTutor';
import { useSearchParams } from 'react-router-dom';

type Props = { data: AppData; update: (fn: (current: AppData) => AppData) => void };

export function TutorPage({ data, update }: Props) {
  const [search, setSearch] = useSearchParams();
  const requestedScenario = search.get('scenario');
  const [scenarioId, setScenarioId] = useState(conversationScenarios.some((item) => item.id === requestedScenario) ? requestedScenario! : conversationScenarios[0].id);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const scenario = conversationScenarios.find((item) => item.id === scenarioId) || conversationScenarios[0];
  const sessions = data.tutorSessions || [];
  const active = sessions.find((item) => item.id === sessionId) || null;
  const endpointConfigured = Boolean(import.meta.env.VITE_AI_TUTOR_URL);

  const newSession = () => {
    const session: TutorSession = { id: crypto.randomUUID(), scenarioId, title: scenario.title, level: scenario.level, createdAt: new Date().toISOString(), messages: [] };
    update((current) => ({ ...current, tutorSessions: [session, ...(current.tutorSessions || [])] }));
    setSessionId(session.id); setError('');
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || message.length > 1000 || !active || !endpointConfigured || busy) return;
    const userTurn = { role: 'user' as const, content: message, createdAt: new Date().toISOString() };
    const history = [...active.messages, userTurn].map(({ role, content }) => ({ role, content }));
    update((current) => ({ ...current, tutorSessions: (current.tutorSessions || []).map((item) => item.id === active.id ? { ...item, messages: [...item.messages, userTurn] } : item) }));
    setText(''); setBusy(true); setError('');
    try {
      const provider = await configuredTutorProvider();
      if (!provider) throw new Error('Tutor não configurado. A conversa por IA requer URL segura e uma conta autenticada.');
      const result = await provider.reply({ scenario, history });
      const answer = { role: 'assistant' as const, content: result.response, createdAt: new Date().toISOString(), feedback: result.feedback };
      update((current) => ({ ...current, tutorSessions: (current.tutorSessions || []).map((item) => item.id === active.id ? { ...item, messages: [...item.messages, answer] } : item) }));
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Falha ao conectar ao tutor. O texto enviado permanece salvo na conversa local.');
    } finally { setBusy(false); }
  };
  const copyVoicePrompt = async () => { await navigator.clipboard?.writeText(chatGPTVoicePrompt(scenario)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); };
  const selectSession = (id: string) => { const previous = sessions.find((item) => item.id === id); if (previous) { setSessionId(id); setScenarioId(previous.scenarioId); } };
  const groups = useMemo(() => sessions.slice(0, 12), [sessions]);

  return <>
    <div className="page-heading"><div><div className="eyebrow">AI ENGLISH TUTOR · PRÁTICA PROGRESSIVA</div><h1>Professor de inglês</h1><p>Roteiros A0–B1 e opção para conectar um tutor autenticado. Sem endpoint ativo, nenhuma resposta automática é simulada.</p></div></div>
    <div className="tutor-layout"><div>
      <section className="card tutor-controls"><div className="section-title"><h2>Escolha um cenário</h2><span className="level-pill">{scenario.level}</span></div>
        <select aria-label="Cenário do tutor" value={scenarioId} onChange={(event) => { setScenarioId(event.target.value); setSearch({ scenario: event.target.value }); setSessionId(null); setError(''); }}>
          {conversationScenarios.map((item, index) => <option key={item.id} value={item.id}>{String(index + 1).padStart(2, '0')} · {item.level} · {item.title}</option>)}
        </select>
        <h3>{scenario.title}</h3><p><b>Objetivo:</b> {scenario.goal}</p><p>{scenario.prompt}</p>
        <div className="phrase-list">{scenario.phrases.map((phrase) => <span key={phrase}>{phrase}</span>)}</div>
        <p><b>Critérios de prática:</b> {scenario.success.join(' · ')}</p>
        <div className="form-actions"><button className="button primary" onClick={newSession}>Nova conversa</button><button className="button secondary" onClick={() => void copyVoicePrompt()}>{copied ? 'Prompt copiado' : 'Copiar prompt para ChatGPT Voice'}</button></div>
      </section>
      <section className="card tutor-chat"><div className="section-title"><h2>Conversa</h2><span className={`cloud-tag ${endpointConfigured ? 'ready' : ''}`}><span className="status-led" />{endpointConfigured ? 'Endpoint configurado' : 'Prática manual gratuita'}</span></div>
        {!endpointConfigured && <div className="assessment-prompt">Tutor por texto indisponível até você configurar e autenticar a Edge Function em <code>VITE_AI_TUTOR_URL</code>. Use o botão ChatGPT Voice para prática externa gratuita. Esta interface não gera respostas fictícias.</div>}
        {active ? <div className="tutor-messages" aria-live="polite">{active.messages.map((turn, index) => <article key={`${turn.createdAt}-${index}`} className={`tutor-message ${turn.role}`}><b>{turn.role === 'user' ? 'Você' : 'Tutor conectado'}</b><p>{turn.content}</p>{turn.feedback && <small>Correção / feedback: {turn.feedback}</small>}</article>)}{!active.messages.length && <p className="empty-copy">Escreva uma resposta em inglês. O tutor só responderá quando o endpoint seguro estiver ativo e sua sessão Supabase autenticada.</p>}</div> : <p className="empty-copy">Inicie uma conversa para guardar as mensagens localmente.</p>}
        {error && <div className="inline-error" role="alert">{error}</div>}
        <form className="tutor-compose" onSubmit={(event) => void send(event)}><label className="field-label" htmlFor="tutor-message">Sua resposta</label><textarea id="tutor-message" value={text} onChange={(event) => setText(event.target.value.slice(0, 1000))} maxLength={1000} rows={3} placeholder={endpointConfigured ? 'Responda ao cenário em inglês…' : 'Conversa por IA não configurada; pratique pelo ChatGPT Voice.'} disabled={!endpointConfigured || !active || busy} /><div className="form-actions"><small>{text.length}/1000 · {active?.messages.length || 0} mensagens nesta conversa</small><button type="submit" className="button primary" disabled={!endpointConfigured || !active || busy || !text.trim()}>{busy ? 'Aguardando tutor…' : 'Enviar para o tutor'}</button></div></form>
      </section>
    </div><aside>
      <section className="card tutor-privacy"><div className="output-icon">✦</div><span className="eyebrow">PRIVACIDADE E CUSTO</span><h3>Você controla a conexão</h3><p>Mensagens ficam neste navegador e só são enviadas quando o endpoint está configurado e você clica em “Enviar”. O endpoint preparado exige JWT Supabase e limita a 20 mensagens por dia.</p><p>Ativar um provedor externo pode gerar cobrança conforme a conta que você configurar. Nenhuma chave de provedor fica no frontend.</p><p>Prática de voz: o botão copia instruções para abrir uma conversa no ChatGPT Voice. A gravação local continua em Conversação; ela não é transcrita pelo app.</p></section>
      <section className="card"><div className="section-title"><h2>Histórico local</h2><span className="subtle">{sessions.length}</span></div>{groups.length ? <div className="tutor-history">{groups.map((item) => <button key={item.id} className={item.id === sessionId ? 'selected' : ''} onClick={() => selectSession(item.id)}><b>{item.title}</b><small>{item.level} · {new Date(item.createdAt).toLocaleDateString('pt-BR')} · {item.messages.length} mensagens</small></button>)}</div> : <p className="empty-copy">As conversas aparecem aqui depois que você iniciar uma sessão.</p>}</section>
    </aside></div>
  </>;
}
