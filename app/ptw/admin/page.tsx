import Link from "next/link";
import { FileEdit, ClipboardCheck, ShieldCheck } from "lucide-react";

export default function PtwHubPage() {
  return (
    <div>
      <header className="topbar">
        <div className="brand">
          DOSCO PTW SYSTEM
          <small>동아스틸 안전작업허가서 통합 관리</small>
        </div>
        <nav className="nav">
          <Link href="/">전체 홈</Link>
          <Link href="/ptw/status">승인 현황</Link>
          <Link href="/ptw/admin">허가서 관리자</Link>
        </nav>
      </header>

      <main className="shell" style={{ maxWidth: 1040, paddingTop: 36 }}>
        <div className="pagehead">
          <div>
            <h1>안전작업허가서 관리 시스템</h1>
            <div className="muted">
              비정기 위험작업(정비·R/C·외주공사 등) 사전 허가 신청 및 승인 현황 확인·양식 출력을 관리합니다.
            </div>
          </div>
          <span className="pill ok">운영 중</span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
            <FileEdit size={32} />
            <h2 style={{ marginTop: 14, marginBottom: 8 }}>작업허가서 작성 및 요청</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              협력사 및 외부업체 작업 신청, 교육일지 첨부 및 작업자 전원 전자서명
            </p>
            <Link
              className="btn"
              href="/ptw/apply"
              style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "14px 16px", fontSize: 16, marginTop: "auto" }}
            >
              허가서 작성하기
            </Link>
          </div>

          <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
            <ClipboardCheck size={32} />
            <h2 style={{ marginTop: 14, marginBottom: 8 }}>작업허가서 승인 현황</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              제출한 허가서의 승인 상태(승인대기·허가완료) 확인 및 현장 비치용 양식 출력
            </p>
            <Link
              className="btn secondary"
              href="/ptw/status"
              style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "14px 16px", fontSize: 16, marginTop: "auto" }}
            >
              승인 현황 및 출력
            </Link>
          </div>

          <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
            <ShieldCheck size={32} />
            <h2 style={{ marginTop: 14, marginBottom: 8 }}>관리자 메뉴 (승인·출력)</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              제출된 허가서 검토 및 승인 처리, 회사 양식 엑셀 다운로드 및 A4/PDF 출력
            </p>
            <Link
              className="btn secondary"
              href="/ptw/admin"
              style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "14px 16px", fontSize: 16, marginTop: "auto" }}
            >
              허가서 관리자 대시보드
            </Link>
          </div>
        </div>

        <div className="footer" style={{ marginTop: 48 }}>
          DOSCO PTW SYSTEM · 동아스틸(주)
        </div>
      </main>
    </div>
  );
}