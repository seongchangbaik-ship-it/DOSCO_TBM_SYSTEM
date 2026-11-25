import Link from "next/link";
import { Truck, ClipboardCheck, ListChecks, ShieldCheck } from "lucide-react";

export default function ForkliftMainPage() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          DOSCO SAFETY SYSTEM
          <small>동아스틸 지게차 키·TBM 관리</small>
        </div>
        <Link href="/" className="btn secondary">
          ← 메인으로
        </Link>
      </header>

      <main className="shell" style={{ maxWidth: 820, paddingTop: 48 }}>
        <div className="pagehead">
          <div>
            <h1>지게차 사용</h1>
            <div className="muted">
              키 수령·반납, 작업전/중/후 TBM 체크리스트 점검 및 관리자 조회 메뉴를 선택해 주세요.
            </div>
          </div>
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          <div
            className="card"
            style={{ padding: 24, display: "flex", flexDirection: "column" }}
          >
            <ClipboardCheck size={28} />
            <h2 style={{ marginTop: 12, marginBottom: 8 }}>지게차 사용 신청</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              지게차 종류·사용자·수령장소 입력 후 TBM 체크리스트 점검 및 서명 제출
            </p>
            <Link
              className="btn"
              href="/forklift"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px 14px",
                marginTop: "auto",
              }}
            >
              지게차 사용 신청 이동
            </Link>
          </div>

          <div
            className="card"
            style={{ padding: 24, display: "flex", flexDirection: "column" }}
          >
            <ListChecks size={28} />
            <h2 style={{ marginTop: 12, marginBottom: 8 }}>지게차 사용 현황</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              현재 사용 중·반납 완료 현황 확인 및 키 반납장소 선택 반납 처리
            </p>
            <Link
              className="btn secondary"
              href="/forklift/status"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px 14px",
                marginTop: "auto",
              }}
            >
              지게차 사용 현황 이동
            </Link>
          </div>

          <div
            className="card"
            style={{ padding: 24, display: "flex", flexDirection: "column" }}
          >
            <ShieldCheck size={28} />
            <h2 style={{ marginTop: 12, marginBottom: 8 }}>관리자 대시보드</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              전체 수령·반납 기록, 16개 TBM 점검 결과, 사용자 서명 조회 및 삭제
            </p>
            <Link
              className="btn secondary"
              href="/forklift/admin"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                padding: "12px 14px",
                marginTop: "auto",
              }}
            >
              관리자 대시보드 이동
            </Link>
          </div>
        </div>

        <div className="footer" style={{ marginTop: 48 }}>
          <Truck size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
          DOSCO SAFETY SYSTEM · 동아스틸(주)
        </div>
      </main>
    </>
  );
}