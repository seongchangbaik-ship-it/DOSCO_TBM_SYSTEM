# DOSCO TBM SYSTEM — 1차 웹 프로젝트

동아스틸의 주간 TBM 교육자료 게시, 개인별 교육 확인, 조별 실시 사진 제출, 관리자 실적 확인을 위한 Next.js + Supabase 프로젝트입니다.

## 현재 구현된 화면
- `/` 홈
- `/admin` 관리자 대시보드: 주간 자료 게시, 참여 기록 확인, QR PNG 다운로드, 엑셀 내보내기
- `/tbm` 근로자 화면: 회사/조/이름 입력, 교육자료 열람, 확인 체크 제출
- `/leader` 조장 화면: 회사/조/교육 회차 선택, TBM 사진 제출

## 중요: 운영 전 보안 작업 필수
현재 코드는 실제 배포 전 검토용 MVP입니다. 관리자 로그인과 조장 인증은 아직 연결되지 않았고, SQL의 공개 제출/조회 정책은 테스트 편의를 위한 임시 정책입니다. 이 상태로 실제 근로자 개인정보나 사진을 수집하지 마세요.
운영 전 반드시:
1. 관리자 계정 Supabase Auth 로그인 적용
2. 관리자만 교육자료 등록/수정 및 전체 이력 조회 가능하도록 RLS 변경
3. 근로자 이름만으로 대리 제출이 가능하므로 사번/PIN/일회용 코드 등 본인 확인 수단 추가
4. 조장별 계정 또는 조별 비밀코드로 사진 제출 권한 제한
5. 사진 버킷 비공개 유지 및 관리자만 서명 URL로 조회
6. 개인정보 처리 안내, 보유기간, 삭제/정정 절차 및 백업 설정
7. 회사 정보보안/개인정보 담당자 승인

## 로컬 실행
필요: Node.js 20 이상, Supabase 프로젝트

1. 압축 해제 후 프로젝트 폴더에서:
   ```bash
   npm install
   ```
2. `.env.example`을 복사해 `.env.local` 생성
3. Supabase 프로젝트의 URL과 anon key를 입력
4. Supabase SQL Editor에서 `supabase/schema.sql` 실행
5. Supabase Table Editor에서 `teams`에 실제 조를 등록
   - 각 조의 `company_id`는 `companies` 테이블의 해당 회사 id 사용
   - `leader_name`에 조장 이름 기재
6. 개발 서버:
   ```bash
   npm run dev
   ```
7. 브라우저에서 `http://localhost:3000` 접속

## Supabase 설정
- Authentication은 운영 버전에서 관리자 로그인에 사용합니다.
- Storage bucket `tbm-photos`는 비공개로 유지합니다.
- 사진은 최대 8MB, JPEG/PNG/WebP로 제한됩니다.
- 공개 URL을 생성하지 않고 파일 경로만 DB에 저장하도록 설계했습니다.

## Vercel 배포
1. GitHub에 프로젝트 저장소 생성 후 코드 push
2. Vercel에서 해당 저장소 Import
3. Environment Variables에 다음 값 입력:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (배포 도메인)
4. Deploy
5. 배포 주소의 `/tbm`을 QR로 생성해 게시판에 부착

## 데이터 모델
- companies: 회사
- teams: 회사별 고정 조 및 조장
- tbm_weeks: 주간 교육자료
- tbm_acknowledgements: 개인별 확인 이력
- tbm_team_submissions: 조별 사진 제출 이력

## 다음 개발 단계
- 관리자 로그인 및 권한
- 관리자 화면에서 회사/조/조장 관리
- 교육자료 PDF/이미지 첨부
- 조장 인증 및 사진 미리보기
- 조별·회사별 대상자/완료율 및 미확인자 목록
- 자료별 참여율 계산과 기간별 엑셀 출력
- 관리자 사진 열람용 안전한 signed URL 처리
