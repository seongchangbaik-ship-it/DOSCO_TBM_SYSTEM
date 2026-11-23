import Link from "next/link";
import { ClipboardList, Users, Camera, BarChart3, QrCode } from "lucide-react";

export default function TbmMain() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          DOSCO TBM SYSTEM
          <small>동아스틸 안전보건교육 관리</small>
        </div>
        <nav className="nav">
          <Link href="/">전체 홈</Link>
          <Link href="/admin">관리자</Link>
          <Link href="/tbm">근로자 TBM</Link>
        </nav>
      </header>
      <main className="shell">
        <div className="pagehead">
          <div>
            <h1>TBM 통합 관리 시스템</h1>
            <div className="muted">
              주간 교육자료 등록부터 개인별 확인, 조별 실시 사진까지 한 곳에서 관리합니다.
            </div>
          </div>
          <span className="pill ok">1차 버전</span>
        </div>
        <div className="grid">
          <div className="card">
            <ClipboardList />
            <h3>교육자료 등록</h3>
            <p className="muted">주차별 TBM 주제와 교육내용 게시</p>
            <Link className="btn" href="/admin">
              관리자 페이지
            </Link>
          </div>
          <div className="card">
            <Users />
            <h3>개인별 교육 확인</h3>
            <p className="muted">QR 접속 후 소속·이름 선택 및 확인</p>
            <Link className="btn secondary" href="/tbm">
              근로자 페이지
            </Link>
          </div>
          <div className="card">
            <Camera />
            <h3>조별 사진 제출</h3>
            <p className="muted">조장이 교육 실시 사진 업로드</p>
            <Link className="btn secondary" href="/leader">
              조장 페이지
            </Link>
          </div>
          <div className="card">
            <BarChart3 />
            <h3>교육 실적 관리</h3>
            <p className="muted">참여현황과 미확인자 확인</p>
            <Link className="btn secondary" href="/admin">
              실적 대시보드
            </Link>
          </div>
        </div>
        <div className="section card">
          <h2>
            <QrCode size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
            현장 QR코드 운영
          </h2>
          <p className="muted">
            배포 후 /tbm 주소로 연결되는 고정 QR코드를 출력해 현장 게시판에 부착합니다. 매주 교육자료만 변경하면 동일한 QR코드를 계속 사용할 수 있습니다.
          </p>
        </div>
        <div className="notice section">
          주의: 현재 프로젝트는 실제 회사 계정 연결 전 개발용 초기 버전입니다. 운영 전 관리자 인증, 개인정보 처리 안내, 본인 확인 방식, 데이터 접근정책을 회사 기준에 맞게 확정해야 합니다.
        </div>
        <div className="footer">DOSCO TBM SYSTEM · 동아스틸(주)</div>
      </main>
    </>
  );
}