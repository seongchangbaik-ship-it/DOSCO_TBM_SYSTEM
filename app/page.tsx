"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, FileText, Truck } from "lucide-react";
import { supabase, configured } from "@/lib/supabase";

export default function Home() {
  const [safetyPoint, setSafetyPoint] = useState(
    "설비 점검·정비 전 반드시 정지 및 전원 차단(LOTO)을 확인하고, 작업 전 주변 인원 안전을 살피세요."
  );

useEffect(() => {
    try {
      const savedPoint = window.localStorage.getItem("dosco_main_safety_point");
      if (savedPoint && savedPoint.trim()) {
        setSafetyPoint(savedPoint.trim());
      }
    } catch {
      // ignore storage read error
    }
  }, []);

  return (
    <>
      <style>{`
        .safety-point-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0f172a;
          color: #f8fafc;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 22px;
          border: 1px solid #1e293b;
        }
        .safety-point-badge {
          background: #ef4444;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 9px;
          border-radius: 6px;
          white-space: nowrap;
          flex-shrink: 0;
          letter-spacing: 0.3px;
        }
        .safety-point-text {
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1.45;
          color: #f8fafc;
          min-width: 0;
        }
      `}</style>

      <header className="topbar">
        <div className="brand">
          DOSCO SAFETY SYSTEM
          <small>동아스틸 안전보건 통합 관리</small>
        </div>
      </header>
      <main className="shell" style={{ maxWidth: 1080, paddingTop: 28 }}>
        <div
          className="safety-point-bar"
          role="region"
          aria-label="안전 POINT"
        >
          <span className="safety-point-badge">안전 POINT</span>
          <span className="safety-point-text">{safetyPoint}</span>
        </div>

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
            <p
              className="muted"
              style={{ marginBottom: 20, fontSize: 13.5, lineHeight: 1.5 }}
            >
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
            <p
              className="muted"
              style={{ marginBottom: 20, fontSize: 13.5, lineHeight: 1.5 }}
            >
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
            <p
              className="muted"
              style={{ marginBottom: 20, fontSize: 13.5, lineHeight: 1.5 }}
            >
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