import Link from "next/link";
import { ClipboardList, FileText } from "lucide-react";

export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          DOSCO SAFETY SYSTEM
          <small>동아스틸 안전보건 통합 관리</small>
        </div>
      </header>
      <main className="shell" style={{ maxWidth: 820, paddingTop: 48 }}>
        <div className="pagehead">
          <div>
            <h1>동아스틸 안전보건 통합 시스템</h1>
            <div className="muted">이용하실 업무 시스템을 선택해 주세요.</div>
          </div>
        </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
            <ClipboardList size={32} />
            <h2 style={{ marginTop: 14, marginBottom: 8 }}>TBM 통합관리시스템</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              주간 안전교육자료 게시, 근로자 교육 확인 및 조별 TBM 사진 제출 관리
            </p>
            <Link
              className="btn"
              href="/tbm-main"
              style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "14px 16px", fontSize: 16, marginTop: "auto" }}
            >
              TBM 통합관리시스템 이동
            </Link>
          </div>

          <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column" }}>
            <FileText size={32} />
            <h2 style={{ marginTop: 14, marginBottom: 8 }}>안전작업허가서 작성</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              위험작업 사전 허가서 작성, 안전조치 확인 및 승인 관리
            </p>
            <Link
              className="btn"
              href="/ptw"
              style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "14px 16px", fontSize: 16, marginTop: "auto" }}
            >
              안전작업허가서 작성 이동
            </Link>
          </div>
        </div>

        <div className="footer" style={{ marginTop: 48 }}>
          DOSCO SAFETY SYSTEM · 동아스틸(주)
        </div>
      </main>
    </>
  );
}