import { describe, expect, it, vi } from 'vitest';
import { HttpAiTutorProvider } from './aiTutor';
import { conversationScenarios } from './speaking';

describe('secure AI tutor client adapter', () => {
  it('sends only a bounded recent transcript with the authenticated session token', async () => {
    const request = vi.fn<typeof fetch>(async (_input, _init) => new Response(JSON.stringify({ response: 'Hello. What is your name?', feedback: 'Good greeting.' }), { status: 200 }));
    const provider = new HttpAiTutorProvider('https://edge.example.test/tutor', async () => 'session-jwt', request);
    const history = Array.from({ length: 15 }, (_, index) => ({ role: index % 2 ? 'assistant' as const : 'user' as const, content: `turn-${index}-${'x'.repeat(1200)}` }));
    const result = await provider.reply({ scenario: conversationScenarios[0], history });
    expect(result).toEqual({ response: 'Hello. What is your name?', feedback: 'Good greeting.' });
    const [, options] = request.mock.calls[0];
    expect(new Headers(options?.headers).get('authorization')).toBe('Bearer session-jwt');
    const body = JSON.parse(String(options?.body)) as { history: Array<{ role: string; content: string }> };
    expect(body.history).toHaveLength(12);
    expect(body.history.every((turn) => turn.content.length <= 1000)).toBe(true);
  });

  it('never calls the endpoint without an authenticated session', async () => {
    const request = vi.fn<typeof fetch>();
    const provider = new HttpAiTutorProvider('https://edge.example.test/tutor', async () => null, request);
    await expect(provider.reply({ scenario: conversationScenarios[0], history: [{ role: 'user', content: 'Hello' }] })).rejects.toThrow(/Entre na sua conta Supabase/);
    expect(request).not.toHaveBeenCalled();
  });

  it('turns auth, usage quota, HTTP and malformed payloads into actionable errors', async () => {
    const call = (status: number, payload: string) => new HttpAiTutorProvider('https://edge.example.test/tutor', async () => 'jwt', async () => new Response(payload, { status }));
    const input = { scenario: conversationScenarios[0], history: [{ role: 'user' as const, content: 'Hi' }] };
    await expect(call(401, '{}').reply(input)).rejects.toThrow(/autenticação.*expirou/i);
    await expect(call(429, '{}').reply(input)).rejects.toThrow(/Limite diário/);
    await expect(call(503, '{}').reply(input)).rejects.toThrow(/HTTP 503/);
    await expect(call(200, '{').reply(input)).rejects.toThrow(/resposta inválida/);
    await expect(call(200, '{"response":""}').reply(input)).rejects.toThrow(/incompleta/);
  });
});
