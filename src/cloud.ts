import { createClient } from '@supabase/supabase-js';
import type { AppData } from './domain';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key) : null;

export async function pushCloud(data: AppData) {
  if (!supabase) throw new Error('Supabase não está configurado neste aplicativo.');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Entre na sua conta para sincronizar.');
  const { error } = await supabase.from('user_state').upsert({ user_id: userData.user.id, payload: data, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function pullCloud() {
  if (!supabase) throw new Error('Supabase não está configurado neste aplicativo.');
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Entre na sua conta para sincronizar.');
  const { data, error } = await supabase.from('user_state').select('payload,updated_at').eq('user_id', userData.user.id).maybeSingle();
  if (error) throw error;
  return data?.payload as AppData | undefined;
}
