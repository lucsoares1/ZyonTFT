-- Zyon Double Up. No service-role credential is used by the desktop app.
create schema if not exists zyon_private;
revoke all on schema zyon_private from public, anon;
grant usage on schema zyon_private to authenticated;

create table public.zyon_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 handle text not null unique check(handle ~ '^[a-z0-9_]{3,20}$'),
 display_name text not null check(char_length(display_name) between 2 and 32),
 friend_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 created_at timestamptz not null default now()
);
create table public.zyon_friendships (
 id uuid primary key default gen_random_uuid(), requester uuid not null references public.zyon_profiles(user_id) on delete cascade,
 recipient uuid not null references public.zyon_profiles(user_id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','removed')),
 created_at timestamptz not null default now(), check(requester<>recipient)
);
create unique index zyon_friend_pair on public.zyon_friendships(least(requester,recipient),greatest(requester,recipient));
create index zyon_friend_recipient on public.zyon_friendships(recipient,status);
create index zyon_friend_requester on public.zyon_friendships(requester,status);
create table public.zyon_duo_sessions (
 id uuid primary key default gen_random_uuid(), player_a uuid not null references public.zyon_profiles(user_id) on delete cascade,
 player_b uuid not null references public.zyon_profiles(user_id) on delete cascade,
 status text not null default 'active' check(status in ('active','ended')),
 created_at timestamptz not null default now(), check(player_a<>player_b)
);
create index zyon_session_a on public.zyon_duo_sessions(player_a,status);
create index zyon_session_b on public.zyon_duo_sessions(player_b,status);
create table public.zyon_duo_invites (
 id uuid primary key default gen_random_uuid(), sender uuid not null references public.zyon_profiles(user_id) on delete cascade,
 recipient uuid not null references public.zyon_profiles(user_id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '5 minutes',check(sender<>recipient)
);
create index zyon_invite_recipient on public.zyon_duo_invites(recipient,status,expires_at);
create index zyon_invite_sender on public.zyon_duo_invites(sender,status);
create table public.zyon_duo_plans (
 session_id uuid not null references public.zyon_duo_sessions(id) on delete cascade,
 user_id uuid not null references public.zyon_profiles(user_id) on delete cascade,
 payload jsonb not null default '{}'::jsonb check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=32768),
 updated_at timestamptz not null default now(), primary key(session_id,user_id)
);
create index zyon_plan_user on public.zyon_duo_plans(user_id);

create function zyon_private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.zyon_profiles(user_id,handle,display_name)
 values(new.id,lower(coalesce(new.raw_user_meta_data->>'handle','jogador_'||substr(replace(new.id::text,'-',''),1,10))),
 left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),new.raw_user_meta_data->>'handle','Jogador'),32));
 return new;
end $$;
revoke all on function zyon_private.new_profile() from public,anon,authenticated;
create trigger zyon_auth_profile after insert on auth.users for each row execute function zyon_private.new_profile();

create function zyon_private.member(s uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.zyon_duo_sessions where id=s and status='active' and (player_a=(select auth.uid()) or player_b=(select auth.uid())));
$$;
revoke all on function zyon_private.member(uuid) from public,anon;
grant execute on function zyon_private.member(uuid) to authenticated;

alter table public.zyon_profiles enable row level security;
alter table public.zyon_friendships enable row level security;
alter table public.zyon_duo_sessions enable row level security;
alter table public.zyon_duo_invites enable row level security;
alter table public.zyon_duo_plans enable row level security;
create policy zyon_profile_read on public.zyon_profiles for select to authenticated using (
 user_id=(select auth.uid()) or exists(select 1 from public.zyon_friendships f where f.status='accepted' and
 ((f.requester=(select auth.uid()) and f.recipient=zyon_profiles.user_id) or (f.recipient=(select auth.uid()) and f.requester=zyon_profiles.user_id)))
);
create policy zyon_friend_read on public.zyon_friendships for select to authenticated using(requester=(select auth.uid()) or recipient=(select auth.uid()));
create policy zyon_session_read on public.zyon_duo_sessions for select to authenticated using(player_a=(select auth.uid()) or player_b=(select auth.uid()));
create policy zyon_invite_read on public.zyon_duo_invites for select to authenticated using(sender=(select auth.uid()) or recipient=(select auth.uid()));
create policy zyon_plan_read on public.zyon_duo_plans for select to authenticated using(zyon_private.member(session_id));
revoke all on public.zyon_profiles,public.zyon_friendships,public.zyon_duo_sessions,public.zyon_duo_invites,public.zyon_duo_plans from anon,authenticated;
grant select on public.zyon_profiles,public.zyon_friendships,public.zyon_duo_sessions,public.zyon_duo_invites,public.zyon_duo_plans to authenticated;

create function public.zyon_friend_request(code text) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); other uuid; existing public.zyon_friendships;
begin
 if me is null then raise exception 'Entre na sua conta.'; end if;
 select user_id into other from public.zyon_profiles where friend_code=upper(trim(code));
 if other is null or other=me then raise exception 'Código de amigo não encontrado.'; end if;
 if (select count(*) from public.zyon_friendships where requester=me and status='pending')>=30 then raise exception 'Responda ou cancele seus pedidos pendentes antes de adicionar mais amigos.'; end if;
 select * into existing from public.zyon_friendships where least(requester,recipient)=least(me,other) and greatest(requester,recipient)=greatest(me,other) for update;
 if found then
  if existing.status='removed' then update public.zyon_friendships set requester=me,recipient=other,status='pending',created_at=now() where id=existing.id; end if;
 else insert into public.zyon_friendships(requester,recipient) values(me,other) on conflict do nothing;
 end if;
end $$;
create function public.zyon_friend_respond(friendship_id uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 update public.zyon_friendships set status=case when accept then 'accepted' else 'removed' end where id=friendship_id and recipient=auth.uid() and status='pending';
 if not found then raise exception 'Pedido indisponível.'; end if;
end $$;
create function public.zyon_friend_remove(friendship_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare f public.zyon_friendships;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select * into f from public.zyon_friendships where id=friendship_id and (requester=auth.uid() or recipient=auth.uid()) for update;
 if not found then raise exception 'Amizade indisponível.'; end if;
 update public.zyon_friendships set status='removed' where id=f.id;
 update public.zyon_duo_sessions set status='ended' where status='active' and least(player_a,player_b)=least(f.requester,f.recipient) and greatest(player_a,player_b)=greatest(f.requester,f.recipient);
 update public.zyon_duo_invites set status='cancelled' where status='pending' and least(sender,recipient)=least(f.requester,f.recipient) and greatest(sender,recipient)=greatest(f.requester,f.recipient);
end $$;
create function public.zyon_duo_invite(friend_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise exception 'Entre na sua conta.'; end if;
 if not exists(select 1 from public.zyon_friendships where status='accepted' and least(requester,recipient)=least(me,friend_id) and greatest(requester,recipient)=greatest(me,friend_id)) then raise exception 'Adicione e aceite este amigo primeiro.'; end if;
 if exists(select 1 from public.zyon_duo_sessions where status='active' and (player_a in(me,friend_id) or player_b in(me,friend_id))) then raise exception 'Um de vocês já está em uma dupla. Encerre a dupla atual primeiro.'; end if;
 if exists(select 1 from public.zyon_duo_invites where sender=me and recipient=friend_id and status='pending' and expires_at>now()) then return; end if;
 if (select count(*) from public.zyon_duo_invites where sender=me and created_at>now()-interval '1 minute')>=5 then raise exception 'Aguarde um pouco antes de convidar novamente.'; end if;
 insert into public.zyon_duo_invites(sender,recipient) values(me,friend_id);
end $$;
create function public.zyon_duo_respond(invite_id uuid,accept boolean) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); inv public.zyon_duo_invites; sid uuid;
begin
 if me is null then raise exception 'Entre na sua conta.'; end if;
 select * into inv from public.zyon_duo_invites where id=invite_id and recipient=me and status='pending' and expires_at>now() for update;
 if not found then raise exception 'O convite expirou ou já foi respondido.'; end if;
 if not accept then update public.zyon_duo_invites set status='declined' where id=inv.id; return; end if;
 -- Ordered participant locks serialize simultaneous invites, including opposite roles.
 perform user_id from public.zyon_profiles where user_id in(inv.sender,me) order by user_id for update;
 if not exists(select 1 from public.zyon_friendships where status='accepted' and least(requester,recipient)=least(inv.sender,me) and greatest(requester,recipient)=greatest(inv.sender,me)) then raise exception 'A amizade não está mais ativa.'; end if;
 if exists(select 1 from public.zyon_duo_sessions where status='active' and (player_a in(inv.sender,me) or player_b in(inv.sender,me))) then raise exception 'Um de vocês já está em outra dupla.'; end if;
 insert into public.zyon_duo_sessions(player_a,player_b) values(inv.sender,me) returning id into sid;
 insert into public.zyon_duo_plans(session_id,user_id) values(sid,inv.sender),(sid,me);
 update public.zyon_duo_invites set status='accepted' where id=inv.id;
 update public.zyon_duo_invites set status='cancelled' where status='pending' and (sender in(inv.sender,me) or recipient in(inv.sender,me));
end $$;
create function public.zyon_duo_leave(session_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 update public.zyon_duo_sessions set status='ended' where id=session_id and status='active' and (player_a=auth.uid() or player_b=auth.uid());
 if not found then raise exception 'Dupla indisponível.'; end if;
end $$;
create function public.zyon_publish_plan(duo_id uuid,plan jsonb) returns void language plpgsql security definer set search_path='' as $$
declare w jsonb;
begin
 if not zyon_private.member(duo_id) then raise exception 'A dupla não está ativa.'; end if;
 if jsonb_typeof(plan) is distinct from 'object' or octet_length(plan::text)>32768 or jsonb_typeof(plan->'wishes') is distinct from 'array' then raise exception 'Plano inválido.'; end if;
 if jsonb_array_length(plan->'wishes')>28 then raise exception 'Plano inválido.'; end if;
 for w in select value from jsonb_array_elements(plan->'wishes') loop
  if coalesce(w->>'id','') !~ '^[a-zA-Z0-9_]{1,100}$' or coalesce((w->>'goal')::integer,-1) not in(1,3,9) or coalesce((w->>'owned')::integer,-1) not between 0 and 9 then raise exception 'Pedido inválido.'; end if;
 end loop;
 insert into public.zyon_duo_plans(session_id,user_id,payload) values(duo_id,auth.uid(),plan)
 on conflict(session_id,user_id) do update set payload=excluded.payload,updated_at=now();
end $$;
create function public.zyon_social_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); s public.zyon_duo_sessions; partner uuid; result jsonb;
begin
 if me is null then raise exception 'Entre na sua conta.'; end if;
 select * into s from public.zyon_duo_sessions where status='active' and (player_a=me or player_b=me) order by created_at desc limit 1;
 partner:=case when s.player_a=me then s.player_b else s.player_a end;
 select jsonb_build_object(
  'profile',(select to_jsonb(p) from public.zyon_profiles p where p.user_id=me),
  'friends',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'profile',to_jsonb(p)) order by p.display_name) from public.zyon_friendships f join public.zyon_profiles p on p.user_id=case when f.requester=me then f.recipient else f.requester end where f.status='accepted' and (f.requester=me or f.recipient=me)),'[]'::jsonb),
  'friendRequests',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'incoming',f.recipient=me,'profile',to_jsonb(p))) from public.zyon_friendships f join public.zyon_profiles p on p.user_id=case when f.requester=me then f.recipient else f.requester end where f.status='pending' and (f.requester=me or f.recipient=me)),'[]'::jsonb),
  'invites',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'incoming',i.recipient=me,'expires_at',i.expires_at,'profile',to_jsonb(p))) from public.zyon_duo_invites i join public.zyon_profiles p on p.user_id=case when i.sender=me then i.recipient else i.sender end where i.status='pending' and i.expires_at>now() and (i.sender=me or i.recipient=me)),'[]'::jsonb),
  'session',case when s.id is null then null else to_jsonb(s) end,
  'partner',(select to_jsonb(p) from public.zyon_profiles p where p.user_id=partner),
  'partnerPlan',(select to_jsonb(p) from public.zyon_duo_plans p where p.session_id=s.id and p.user_id=partner),
  'myPlan',(select to_jsonb(p) from public.zyon_duo_plans p where p.session_id=s.id and p.user_id=me)
 ) into result;
 return result;
end $$;

revoke all on function public.zyon_friend_request(text),public.zyon_friend_respond(uuid,boolean),public.zyon_friend_remove(uuid),public.zyon_duo_invite(uuid),public.zyon_duo_respond(uuid,boolean),public.zyon_duo_leave(uuid),public.zyon_publish_plan(uuid,jsonb),public.zyon_social_snapshot() from public,anon;
grant execute on function public.zyon_friend_request(text),public.zyon_friend_respond(uuid,boolean),public.zyon_friend_remove(uuid),public.zyon_duo_invite(uuid),public.zyon_duo_respond(uuid,boolean),public.zyon_duo_leave(uuid),public.zyon_publish_plan(uuid,jsonb),public.zyon_social_snapshot() to authenticated;
do $$ declare t text; begin
 foreach t in array array['zyon_friendships','zyon_duo_sessions','zyon_duo_invites','zyon_duo_plans'] loop
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then execute format('alter publication supabase_realtime add table public.%I',t); end if;
 end loop;
end $$;
