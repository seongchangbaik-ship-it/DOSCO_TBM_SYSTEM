import Link from "next/link";
import { ClipboardList, Users, Camera, Wrench, ClipboardCheck, QrCode } from "lucide-react";

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
          <Link href="/tbm">정기 TBM</Link>
          <Link href="/tbm/spot">수시 TBM</Link>
          <Link href="/tbm/status">실시 현황</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </header>
      <main className="shell">
        <div className="pagehead">
          <div>
            <h1>TBM 통합 관리 시스템</h1>
            <div className="muted">
              정기 안전교육 확인, 수시 작업 TBM(R/C·정비) 작성 및 조별 실시 현황을 한 곳에서 관리합니다.
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <Users />
            <h3>정기 안전교육 확인</h3>
            <p className="muted">주간 교육자료 숙지 및 근로자 본인 전자서명</p>
            <Link className="btn" href="/tbm" style={{ marginTop: "auto", textAlign: "center", textDecoration: "none" }}>
              근로자 페이지
            </Link>
          </div>

<div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <Camera />
            <h3>조별 사진·일지 제출</h3>
            <p className="muted">우리 조 실시간 서명 확인 및 정기 TBM 사진·일지 등록</p>
            <Link className="btn secondary" href="/leader" style={{ marginTop: "auto", textAlign: "center", textDecoration: "none" }}>
              조장 페이지
            </Link>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", borderColor: "#99f6e4", background: "#f0fdfa" }}>
            <Wrench color="#0f766e" />
            <h3 style={{ color: "#0f766e" }}>수시 작업 TBM 작성</h3>
            <p className="muted">R/C(롤 교체)·설비 정비·돌발작업 전 현장 TBM 일지 및 서명</p>
            <Link
              className="btn"
              href="/tbm/spot"
              style={{ marginTop: "auto", textAlign: "center", textDecoration: "none", background: "#0f766e", borderColor: "#0f766e" }}
            >
              수시 TBM 작성
            </Link>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <ClipboardCheck />
            <h3>TBM 실시 현황</h3>
            <p className="muted">정기·수시 TBM 통합 현황 조회 및 A4 일지 출력</p>
            <Link className="btn secondary" href="/tbm/status" style={{ marginTop: "auto", textAlign: "center", textDecoration: "none" }}>
              실시 현황 보기
            </Link>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column" }}>
            <ClipboardList />
            <h3>교육자료 및 실적 관리</h3>
            <p className="muted">주간 교육자료 게시, 라인별 QR 엑셀 및 교육실적 출력</p>
            <Link className="btn secondary" href="/admin" style={{ marginTop: "auto", textAlign: "center", textDecoration: "none" }}>
              관리자 대시보드
            </Link>
          </div>
        </div>

        <div className="section card">
          <h2>
            <QrCode size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
            현장 라인별 QR코드 운영 안내
          </h2>
          <p className="muted" style={{ marginBottom: 0 }}>
            관리자 대시보드의 <b>[라인별 맞춤 QR 엑셀 다운로드]</b>로 출력한 QR코드를 각 라인 게시판에 부착하면, 근로자가 스캔 즉시 소속 회사와 조가 자동 선택된 화면에서 간편하게 서명할 수 있습니다.
          </p>
        </div>

        <div className="footer">DOSCO TBM SYSTEM · 동아스틸(주)</div>
      </main>
    </>
  );
}