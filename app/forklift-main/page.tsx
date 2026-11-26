"use client";
import Link from "next/link";

const CARDS = [
  {
    title: "지게차 사용 신청",
    desc: "지게차 종류·사용자·수령장소 입력 후 작업 전 점검 및 서명 제출",
    href: "/forklift",
    cta: "지게차 사용 신청 이동",
    primary: true,
  },
  {
    title: "키 반납 신청 및 확인",
    desc: "사용중 키 반납 신청(장소·특이사항·사진) 및 반납 확인자 이름 입력 후 확인완료 처리",
    href: "/forklift/return",
    cta: "키 반납 신청 및 확인 이동",
    primary: true,
  },
  {
    title: "지게차 사용 현황",
    desc: "실시간 수령·반납·확인 상태, 반납장소/시각, 특이사항 및 반납사진 최신 현황 조회",
    href: "/forklift/status",
    cta: "지게차 사용 현황 이동",
    primary: false,
  },
  {
    title: "관리자 대시보드",
    desc: "전체 수령·반납 기록, TBM 점검 결과, 엑셀 다운로드(사진 포함), 건별 출력 및 삭제",
    href: "/forklift/admin",
    cta: "관리자 대시보드 이동",
    primary: false,
  },
];

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

      <div
        className="grid section"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          alignItems: "stretch",
        }}
      >
        {CARDS.map((card) => (
          <div
            key={card.href}
            className="card"
            style={{
              padding: 24,
              minHeight: 210,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 8px 0", fontSize: 20 }}>{card.title}</h2>
              <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
                {card.desc}
              </p>
            </div>
            <Link
              href={card.href}
              className={`btn ${card.primary ? "" : "secondary"}`}
              style={{
                width: "100%",
                textAlign: "center",
                padding: "12px 16px",
                fontSize: 14.5,
                fontWeight: 600,
                boxSizing: "border-box",
              }}
            >
              {card.cta}
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}