-- 가장 보통의 매거진: Supabase 설정 (SQL Editor에 통째로 붙여넣고 Run)
-- 마지막 줄의 이메일만 본인 이메일로 바꾸세요.

-- 1) 편집자 명단 (직접 읽을 수 없고, is_admin()으로만 확인)
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) 글 (draft = 임시 저장, published = 발행)
create table if not exists public.posts (
  id bigint primary key,
  status text not null default 'draft' check (status in ('draft', 'published')),
  iso text, cat text, title text, dek text,
  cover_path text, img_path text,
  blocks jsonb not null default '[]', sources jsonb not null default '[]',
  updated bigint
);
alter table public.posts enable row level security;
drop policy if exists "발행된 글은 누구나 읽기" on public.posts;
create policy "발행된 글은 누구나 읽기" on public.posts for select to anon, authenticated using (status = 'published');
drop policy if exists "편집자는 모두" on public.posts;
create policy "편집자는 모두" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;

-- 3) 읽은 사람 기록 (한 사람당 글 하나에 1회)
create table if not exists public.reads (
  post_id bigint not null,
  viewer text not null check (char_length(viewer) between 8 and 64),
  t timestamptz not null default now(),
  primary key (post_id, viewer)
);
alter table public.reads enable row level security;
drop policy if exists "누구나 기록 추가" on public.reads;
create policy "누구나 기록 추가" on public.reads for insert to anon, authenticated with check (true);
grant insert on public.reads to anon, authenticated;

create or replace function public.read_counts() returns table (post_id bigint, n bigint)
language sql security definer set search_path = public stable as $$
  select r.post_id, count(*) from public.reads r join public.posts p on p.id = r.post_id and p.status = 'published' group by r.post_id
$$;
revoke all on function public.read_counts() from public;
grant execute on function public.read_counts() to anon, authenticated;

-- 4) 이미지 저장소 (읽기는 누구나, 올리기·지우기는 편집자만)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
drop policy if exists "편집자 이미지 올리기" on storage.objects;
create policy "편집자 이미지 올리기" on storage.objects for insert to authenticated with check (bucket_id = 'images' and public.is_admin());
drop policy if exists "편집자 이미지 수정" on storage.objects;
create policy "편집자 이미지 수정" on storage.objects for update to authenticated using (bucket_id = 'images' and public.is_admin());
drop policy if exists "편집자 이미지 삭제" on storage.objects;
create policy "편집자 이미지 삭제" on storage.objects for delete to authenticated using (bucket_id = 'images' and public.is_admin());

-- 5) 편집자 등록 ← 이메일을 바꾸세요
insert into public.admins (email) values ('여기에-내-이메일@example.com') on conflict do nothing;
