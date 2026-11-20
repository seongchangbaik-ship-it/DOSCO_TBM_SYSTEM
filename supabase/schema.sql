-- DOSCO TBM SYSTEM schema
-- Supabase SQL Editor에서 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.companies (
 id uuid primary key default gen_random_uuid(),
 name text not null unique,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 name text not null,
 leader_name text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(company_id,name)
);
create table if not exists public.tbm_weeks (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 topic text not null,
 content text not null,
 week_label text not null,
 starts_at date not null,
 ends_at date not null,
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 check(ends_at >= starts_at)
);
create table if not exists public.tbm_acknowledgements (
 id uuid primary key default gen_random_uuid(),
 week_id uuid not null references public.tbm_weeks(id) on delete cascade,
 company_id uuid not null references public.companies(id),
 team_id uuid not null references public.teams(id),
 worker_name text not null,
 acknowledged_at timestamptz not null default now(),
 unique(week_id,company_id,team_id,worker_name)
);
create table if not exists public.tbm_team_submissions (
 id uuid primary key default gen_random_uuid(),
 week_id uuid not null references public.tbm_weeks(id) on delete cascade,
 company_id uuid not null references public.companies(id),
 team_id uuid not null references public.teams(id),
 leader_name text not null,
 photo_path text not null,
 submitted_at timestamptz not null default now(),
 unique(week_id,team_id)
);

alter table public.companies enable row level security;
alter table public.teams enable row level security;
alter table public.tbm_weeks enable row level security;
alter table public.tbm_acknowledgements enable row level security;
alter table public.tbm_team_submissions enable row level security;

-- 초기 프로토타입 정책: 공개 TBM 자료 읽기, 기본 제출 허용.
-- 실제 운영 전에는 관리자 인증 기반 쓰기 권한, 스팸 방지, 조장 인증 정책으로 강화해야 합니다.
create policy "active companies readable" on public.companies for select using (active=true);
create policy "active teams readable" on public.teams for select using (active=true);
create policy "published weeks readable" on public.tbm_weeks for select using (is_published=true);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tbm-photos','tbm-photos',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- 프로토타입 단계의 사진 업로드 정책. 운영 전 조장 인증 및 업로드 권한을 제한하세요.

-- 초기 회사/조 데이터 예시: 실제 명칭과 조 편성에 맞게 수정하세요.
insert into public.companies(name) values
('동아스틸'),('협력업체 A'),('협력업체 B'),('협력업체 C')
on conflict (name) do nothing;

-- 조 등록 예시(회사별 조 명칭은 실제 운영 현황에 맞춰 추가)
