import Link from "next/link";
import { ClipboardList, FileText, Truck } from "lucide-react";

export default function Home() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          DOSCO SAFETY SYSTEM
          <small>동아스틸 안전보건 통합 관리</small>
        </div>
      </header>
      <main className="shell" style={{ maxWidth: 1080, paddingTop: 44 }}>
        <div className="pagehead">
          <div>
            <h1>동아스틸 안전보건 통합 시스템</h1>
            <div className="muted">이용하실 업무 시스템을 선택해 주세요.</div>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          <div
            className="card"
            style={{ padding: 22, display: "flex", flexDirection: "column" }}
          >
            <ClipboardList size={28} />
            <h2 style={{ marginTop: 12, marginBottom: 6, fontSize: 19 }}>
              TBM 통합관리시스템
            </h2>
            <p className="muted" style={{ marginBottom: 20, fontSize: 13.5, lineHeight: 1.5 }}>
              정기 안전교육 확인, 수시 작업 TBM(R/C·정비) 작성 및 실시 현황 관리
            </p>
            <Link
              className="btn"
              href="/tbm-main"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px 14px",
                fontSize: 14.5,
                marginTop: "auto",
              }}
            >
              TBM 통합관리시스템 이동
            </Link>
          </div>

          <div
            className="card"
            style={{ padding: 22, display: "flex", flexDirection: "column" }}
          >
            <FileText size={28} />
            <h2 style={{ marginTop: 12, marginBottom: 6, fontSize: 19 }}>
              안전작업허가서 작성
            </h2>
            <p className="muted" style={{ marginBottom: 20, fontSize: 13.5, lineHeight: 1.5 }}>
              위험작업 사전 허가서 작성, 안전조치 확인 및 승인 관리
            </p>
            <Link
              className="btn"
              href="/ptw"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px 14px",
                fontSize: 14.5,
                marginTop: "auto",
              }}
            >
              안전작업허가서 작성 이동
            </Link>
          </div>

          <div
            className="card"
            style={{ padding: 22, display: "flex", flexDirection: "column" }}
          >
            <Truck size={28} />
            <h2 style={{ marginTop: 12, marginBottom: 6, fontSize: 19 }}>
              지게차 사용
            </h2>
            <p className="muted" style={{ marginBottom: 20, fontSize: 13.5, lineHeight: 1.5 }}>
              지게차 키 수령·반납, 작업전/중/후 TBM 체크리스트 및 사용 현황·관리자 조회
            </p>
            <Link
              className="btn"
              href="/forklift-main"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px 14px",
                fontSize: 14.5,
                marginTop: "auto",
              }}
            >
              지게차 사용 이동
            </Link>
          </div>
        </div>

        <div className="footer" style={{ marginTop: 44 }}>
          DOSCO SAFETY SYSTEM · 동아스틸(주)
        </div>
      </main>
    </>
  );
}