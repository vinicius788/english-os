import type { ConversationScenario } from './speaking';

export type TutorTurn = { role: 'user' | 'assistant'; content: string };
export interface AiTutorProvider {
  reply(input: { scenario: ConversationScenario; history: TutorTurn[] }): Promise<{ response: string; feedback?: string }>;
}

export class HttpAiTutorProvider implements AiTutorProvider {
  constructor(private readonly endpoint: string, private readonly token: () => Promise<string | null>, private readonly request: typeof fetch = fetch) {}

  async reply(input: { scenario: ConversationScenario; history: TutorTurn[] }): Promise<{ response: string; feedback?: string }> {
    if (!this.endpoint) throw new Error('Tutor por IA não configurado. Use o ChatGPT Voice gratuito ou configure um endpoint seguro.');
    const accessToken = await this.token();
    if (!accessToken) throw new Error('Entre na sua conta Supabase para conversar com o tutor configurado.');
    const latest = input.history.slice(-12).map((turn) => ({ role: turn.role, content: turn.content.slice(0, 1000) }));
    const response = await this.request(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ scenario: input.scenario, history: latest }),
    });
    if (response.status === 401 || response.status === 403) throw new Error('A autenticação do tutor expirou. Entre novamente e tente outra vez.');
    if (response.status === 429) throw new Error('Limite diário do tutor atingido. Tente amanhã ou use a prática gratuita por voz.');
    if (!response.ok) throw new Error(`Tutor indisponível (HTTP ${response.status}). Sua mensagem continua salva localmente.`);
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new Error('O tutor retornou uma resposta inválida.'); }
    if (!payload || typeof payload !== 'object' || !('response' in payload) || typeof payload.response !== 'string' || !payload.response.trim()) throw new Error('O tutor retornou uma resposta incompleta.');
    return { response: payload.response.slice(0, 6000), feedback: 'feedback' in payload && typeof payload.feedback === 'string' ? payload.feedback.slice(0, 1500) : undefined };
  }
}

export async function configuredTutorProvider(): Promise<AiTutorProvider | null> {
  const endpoint = import.meta.env.VITE_AI_TUTOR_URL as string | undefined;
  if (!endpoint) return null;
  const parsed = new URL(endpoint, window.location.origin);
  if (parsed.protocol !== 'https:' && !(parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) throw new Error('O endpoint do tutor precisa usar HTTPS.');
  const { supabase } = await import('./cloud');
  if (!supabase) return null;
  return new HttpAiTutorProvider(parsed.toString(), async () => (await supabase.auth.getSession()).data.session?.access_token || null);
}
