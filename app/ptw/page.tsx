import Link from "next/link";

export default function PtwPage() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          DOSCO PTW SYSTEM
          <small>동아스틸 안전작업허가서 관리</small>
        </div>
        <nav className="nav">
          <Link href="/">전체 홈</Link>
        </nav>
      </header>
      <main className="shell">
        <div className="pagehead">
          <div>
            <h1>안전작업허가서 작성</h1>
            <div className="muted">화기·밀폐·고소·중장비 등 위험작업 허가서 작성 및 승인 관리</div>
          </div>
          <span className="pill wait">준비 중</span>
        </div>
        <div className="card">
          <h3>안전작업허가서 시스템 구축 예정</h3>
          <p className="muted">
            이곳에 작업허가서 신청, 검토·승인, 현장 확인 기능이 추가될 예정입니다.
          </p>
          <div style={{ marginTop: 16 }}>
            <Link className="btn secondary" href="/">
              ← 홈으로 돌아가기
            </Link>
          </div>
        </div>
        <div className="footer">DOSCO SAFETY SYSTEM · 동아스틸(주)</div>
      </main>
    </>
  );
}