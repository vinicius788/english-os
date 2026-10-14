begin;
select plan(6);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-a@example.test','',now(),now(),now()),
 ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-b@example.test','',now(),now(),now())
on conflict(id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
insert into public.user_state(user_id,payload) values ('10000000-0000-0000-0000-000000000001','{"owner":"a"}');
select is((select count(*)::int from public.user_state),1,'user A can read its own state');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from public.user_state),0,'user B cannot read user A state');
insert into public.user_state(user_id,payload) values ('20000000-0000-0000-0000-000000000002','{"owner":"b"}');
select is((select count(*)::int from public.user_state),1,'user B can read its own state');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::int from public.user_state where user_id='20000000-0000-0000-0000-000000000002'),0,'user A cannot read user B state');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
update public.user_state set payload='{"hacked":true}' where user_id='10000000-0000-0000-0000-000000000001';
select is((select payload->>'owner' from public.user_state where user_id='10000000-0000-0000-0000-000000000001'),'a','user B cannot modify user A state');
select throws_ok($$insert into public.user_state(user_id,payload) values ('10000000-0000-0000-0000-000000000001','{}')$$,'42501',null,'user B cannot insert state for user A');
select * from finish();
rollback;
