-- 예시: 동아스틸에 1조/2조를 등록하는 패턴
-- 실제 회사별 조 편성에 맞춰 수정해서 실행하세요.
insert into public.teams(company_id,name,leader_name)
select id,'1조','조장 이름' from public.companies where name='동아스틸'
on conflict (company_id,name) do nothing;
insert into public.teams(company_id,name,leader_name)
select id,'2조','조장 이름' from public.companies where name='동아스틸'
on conflict (company_id,name) do nothing;
