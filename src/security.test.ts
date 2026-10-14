import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/001_init.sql', 'utf8');
const tutorMigration = readFileSync('supabase/migrations/002_ai_tutor_usage_limits.sql', 'utf8');
const tutorFunction = readFileSync('supabase/functions/english-tutor/index.ts', 'utf8');
const supabaseConfig = readFileSync('supabase/config.toml', 'utf8');
const rlsTest = readFileSync('supabase/tests/rls.test.sql', 'utf8');

describe('Supabase security configuration', () => {
  it('enables per-user RLS and owner checks for every personal data table', () => {
    for (const table of ['profiles', 'learner_activity', 'learner_lecture_progress', 'learner_calendar_overrides', 'review_cards', 'review_events', 'assessments', 'speaking_sessions', 'settings', 'user_state']) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain('auth.uid() = user_id');
    expect(migration).toContain('auth.uid() = id');
    expect(rlsTest).toContain('user B cannot read user A state');
    expect(rlsTest).toContain('user B cannot modify user A state');
  });
  it('limits curated data to public read and keeps audio private under the owner folder', () => {
    expect(migration).toContain('create policy curated_read');
    expect(migration).toContain("revoke insert,update,delete,truncate,references,trigger");
    expect(migration).toContain("values('speaking-audio','speaking-audio',false,10485760");
    expect(migration).toContain('(storage.foldername(name))[1]=auth.uid()::text');
  });
  it('protects the optional AI tutor behind a verified JWT, user quota, and server-only provider secret', () => {
    expect(supabaseConfig).toContain('[functions.english-tutor]');
    expect(supabaseConfig).toContain('verify_jwt = true');
    expect(tutorFunction).toContain('authClient.auth.getUser()');
    expect(tutorFunction).toContain("Deno.env.get('AI_PROVIDER_API_KEY')");
    expect(tutorFunction).toContain("rpc('consume_ai_tutor_request')");
    expect(tutorFunction).not.toContain('service_role');
    expect(tutorFunction).not.toContain('VITE_');
    expect(tutorMigration).toContain('enable row level security');
    expect(tutorMigration).toContain('request_count < 20');
    expect(tutorMigration).toContain('grant execute on function public.consume_ai_tutor_request() to authenticated');
    expect(tutorMigration).toContain('revoke all on public.ai_tutor_daily_usage from anon, authenticated');
  });
});
