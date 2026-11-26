"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type WeekItem = {
  id: string;
  title: string;
  topic: string;
  content: string;
  week_label: string;
  starts_at: string;
  ends_at: string;
  photo_paths?: string[];
};

type AckRow = {
  id: string;
  week_id: string;
  company_id: string;
  team_id: string;
  worker_name: string;
  status?: string;
  is_individual_scheduled?: boolean;
  acknowledged_at?: string | null;
};

type SubmissionRow = {
  id: string;
  week_id: string;
  company_id: string;
  team_id: string;
  leader_name: string;
  health_status?: string;
  daily_hazard?: string;
  submitted_at?: string;
};

export default function RegularTBMPage() {
  const [weeks, setWeeks] = useState<WeekItem[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<WeekItem | null>(null);
  const [materialPhotos, setMaterialPhotos] = useState<string[]>([]);
  const [companiesMap, setCompaniesMap] = useState<Record<string, string>>({});
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [acks, setAcks] = useState<AckRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function openMaterial(item: WeekItem) {
    setSelectedMaterial(item);
    setMaterialPhotos([]);
    const paths = item.photo_paths || [];
    if (!configured || paths.length === 0) return;

    const urls: string[] = [];
    for (const p of paths) {
      const { data, error } = await supabase.storage
        .from("tbm-education-photos")
        .createSignedUrl(p, 3600);
      if (!error && data?.signedUrl) urls.push(data.signedUrl);
    }
    setMaterialPhotos(urls);
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [wRes, cRes, tRes, sRes, aRes] = await Promise.all([
        supabase
          .from("tbm_weeks")
          .select("id,title,topic,content,week_label,starts_at,ends_at,photo_paths")
          .eq("is_published", true)
          .order("starts_at", { ascending: false }),
        supabase.from("companies").select("id,name"),
        supabase.from("teams").select("id,name"),
        supabase
          .from("tbm_team_submissions")
          .select("id,week_id,company_id,team_id,leader_name,health_status,daily_hazard,submitted_at")
          .order("submitted_at", { ascending: false }),
        supabase
          .from("tbm_acknowledgements")
          .select("id,week_id,company_id,team_id,worker_name,status,is_individual_scheduled,acknowledged_at")
          .order("acknowledged_at", { ascending: true }),
      ]);

      const cMap: Record<string, string> = {};
      for (const c of cRes.data || []) cMap[c.id] = c.name;
      const tMap: Record<string, string> = {};
      for (const t of tRes.data || []) tMap[t.id] = t.name;

      setCompaniesMap(cMap);
      setTeamsMap(tMap);
      setWeeks((wRes.data as WeekItem[]) || []);
      setSubmissions((sRes.data as SubmissionRow[]) || []);
      setAcks((aRes.data as AckRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const individualPendingList = acks.filter(
    (a) => a.is_individual_scheduled || a.status === "개별진행"
  );

  return (
    <>
      <style>{`
        .reg-tbm-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.85fr) minmax(300px, 1fr);
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 960px) {
          .reg-tbm-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="topbar no-print">
        <div className="brand">
          DOSCO TBM SYSTEM
          <small>정기 TBM 통합 현황판 및 실시등록</small>
        </div>
        <nav className="nav">
          <Link href="/tbm-main">TBM 메뉴</Link>
          <Link href="/leader">조장등록</Link>
          <Link href="/tbm">근로자등록</Link>
          <Link href="/tbm/status">실시 현황</Link>
        </nav>
      </header>

      <main className="shell">
        <div className="pagehead">
          <div>
            <h1>정기 TBM</h1>
            <div className="muted">
              누적 교육자료 확인과 조별 정기 TBM 실시 현황을 보고, 우측 실시등록에서 조장등록·근로자등록을 진행하세요.
            </div>
          </div>
          <div className="row">
            <Link href="/tbm-main" className="btn secondary">
              ← TBM 메뉴
            </Link>
          </div>
        </div>

        <div className="reg-tbm-layout section">
          {/* 왼쪽: 현황판 (누적 교육자료 + 조별 정기TBM 실시 현황) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="card">
              <div className="row between" style={{ marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>누적 교육자료 현황판</h2>
                <span className="pill ok">총 {weeks.length}건</span>
              </div>
              <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
                교육자료를 클릭하면 상세 내용과 교육 사진을 따로 확인할 수 있습니다.
              </p>

              {loading ? (
                <p className="muted">교육자료를 불러오는 중...</p>
              ) : weeks.length === 0 ? (
                <p className="muted">등록된 교육자료가 없습니다.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {weeks.map((w, idx) => {
                    const active = selectedMaterial?.id === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => openMaterial(w)}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: active ? "1.5px solid #1d4ed8" : "1px solid #e2e8f0",
                          background: active ? "#eff6ff" : "#fff",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1e40af" }}>
                            {idx === 0 ? `[최신] ${w.week_label}` : w.week_label} · {w.topic}
                          </div>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0f172a", marginTop: 2 }}>
                            {w.title}
                          </div>
                        </div>
                        <span className="btn secondary" style={{ padding: "6px 12px", fontSize: 12.5, flexShrink: 0 }}>
                          자료 보기
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedMaterial && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid #bfdbfe",
                    background: "#f8fafc",
                  }}
                >
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <b style={{ fontSize: 15, color: "#0f172a" }}>
                      {selectedMaterial.week_label} — {selectedMaterial.title}
                    </b>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => {
                        setSelectedMaterial(null);
                        setMaterialPhotos([]);
                      }}
                    >
                      닫기
                    </button>
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                    주제: {selectedMaterial.topic}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.7 }}>
                    {selectedMaterial.content}
                  </div>
                  {materialPhotos.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      {materialPhotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={`교육자료 사진 ${i + 1}`}
                            style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8 }}
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <div className="row between" style={{ marginBottom: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>조별 정기 TBM 실시 현황</h2>
                <Link href="/tbm/status" className="btn secondary" style={{ padding: "6px 12px", fontSize: 12.5 }}>
                  전체 현황·출력
                </Link>
              </div>

              {submissions.length === 0 ? (
                <p className="muted">아직 제출된 조별 정기 TBM 기록이 없습니다.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px" }}>소속 회사 / 조</th>
                        <th style={{ padding: "8px 10px" }}>조장</th>
                        <th style={{ padding: "8px 10px" }}>서명 완료 / 개별진행</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.slice(0, 10).map((s) => {
                        const teamAcks = acks.filter(
                          (a) => a.week_id === s.week_id && a.team_id === s.team_id
                        );
                        const pendingCount = teamAcks.filter(
                          (a) => a.is_individual_scheduled || a.status === "개별진행"
                        ).length;
                        const doneCount = teamAcks.length - pendingCount;
                        return (
                          <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px" }}>
                              <b>{companiesMap[s.company_id] || "-"}</b> / {teamsMap[s.team_id] || "-"}
                            </td>
                            <td style={{ padding: "10px" }}>{s.leader_name}</td>
                            <td style={{ padding: "10px" }}>
                              <span className="pill ok">{doneCount}명 완료</span>
                              {pendingCount > 0 && (
                                <span className="pill wait" style={{ marginLeft: 6 }}>
                                  개별진행 {pendingCount}명
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 실시등록 (조장등록 / 근로자등록 두 칸) */}
          <div className="card" style={{ position: "sticky", top: 16 }}>
            <h2 style={{ marginTop: 0, marginBottom: 6, fontSize: 18 }}>실시등록</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 13 }}>
              현장 진행 방식에 따라 조장등록 또는 근로자등록을 선택해 주세요.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Link
                href="/leader"
                className="card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  border: "1.5px solid #1e3a8a",
                  background: "#f8fafc",
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1e3a8a", marginBottom: 4 }}>
                  조장등록
                </div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  상단 교육자료 확인, 현장 사진 첨부 및 하단 근로자 이름·서명·개별진행 체크 등록
                </div>
              </Link>

              <Link
                href="/tbm"
                className="card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  border: "1.5px solid #0f766e",
                  background: "#f0fdfa",
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f766e", marginBottom: 4 }}>
                  근로자등록
                </div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                  교육자료 및 공정 안전수칙 확인 후 본인 이름 입력 및 전자서명 제출
                </div>
              </Link>
            </div>

            {individualPendingList.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 10,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e", marginBottom: 8 }}>
                  개별진행 대기 근로자 ({individualPendingList.length}명)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {individualPendingList.map((item) => (
                    <Link
                      key={item.id}
                      href={`/tbm?w=${encodeURIComponent(item.week_id)}&c=${encodeURIComponent(item.company_id)}&t=${encodeURIComponent(item.team_id)}&name=${encodeURIComponent(item.worker_name)}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "#fff",
                        border: "1px solid #fcd34d",
                        textDecoration: "none",
                        color: "#0f172a",
                        fontSize: 13,
                      }}
                    >
                      <span>
                        <b>{item.worker_name}</b> · {teamsMap[item.team_id] || ""}
                      </span>
                      <span style={{ color: "#b45309", fontWeight: 600, fontSize: 12 }}>
                        서명하기 →
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}