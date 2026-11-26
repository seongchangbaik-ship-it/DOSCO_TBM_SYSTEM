"use client";
import Link from "next/link";

export default function ForkliftMainPage() {
  return (
    <main className="shell">
      <div className="pagehead">
        <div>
          <h1>지게차 사용</h1>
          <div className="muted">
            키 수령·반납 신청 및 확인, 실시간 사용 현황 조회 및 관리자 메뉴를 선택해 주세요.
          </div>
        </div>
        <div className="row">
          <Link href="/" className="btn secondary">
            ← 홈으로
          </Link>
        </div>
      </div>

      <div className="grid section" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>지게차 사용 신청</h2>
          <p className="muted">
            지게차 종류·사용자·수령장소 입력 후 작업 전 점검 및 서명 제출
          </p>
          <Link href="/forklift" className="btn">
            지게차 사용 신청 이동
          </Link>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>키 반납 신청 및 확인</h2>
          <p className="muted">
            사용중 키 반납 신청(장소·특이사항·사진) 및 반납 확인자 이름 입력 후 확인완료 처리
          </p>
          <Link href="/forklift/return" className="btn">
            키 반납 신청 및 확인 이동
          </Link>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>지게차 사용 현황</h2>
          <p className="muted">
            실시간 수령·반납·확인 상태, 반납장소/시각, 특이사항 및 반납사진 최신 현황 조회
          </p>
          <Link href="/forklift/status" className="btn secondary">
            지게차 사용 현황 이동
          </Link>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>관리자 대시보드</h2>
          <p className="muted">
            전체 수령·반납 기록, TBM 점검 결과, 엑셀 다운로드(사진 포함), 건별 출력 및 삭제
          </p>
          <Link href="/forklift/admin" className="btn secondary">
            관리자 대시보드 이동
          </Link>
        </div>
      </div>
    </main>
  );
}