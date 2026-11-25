"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type RegularMergedItem = {
  key: string;
  weekId: string;
  weekLabel: string;
  topic: string;
  content: string;
  photoPaths?: string[];
  companyId: string;
  companyName: string;
  teamId: string;
  teamName: string;
  leaderSubmission?: {
    id: string;
    leader_name: string;
    health_status?: string;
    daily_hazard?: string;
    photo_path?: string;
    submitted_at: string;
  };
  workers: {
    id: string;
    worker_name: string;
    selected_rules?: string[];
    signature_data?: string;
    acknowledged_at: string;
  }[];
  latestTime: string;
};

type SpotLogItem = {
  id: string;
  work_date: string;
  work_category: string;
  work_title: string;
  leader_name: string;
  health_status?: string;
  hazard_factors?: string;
  safety_measures?: string;
  photo_path?: string | null;
  created_at: string;
  companies?: { name: string } | null;
  teams?: { name: string } | null;
  tbm_spot_signatures?: { id: string; worker_name: string; signature_data: string; signed_at: string }[];
};

export default function TbmStatusPage() {
const [tab, setTab] = useState<"all" | "regular" | "spot">("all");
  const [loading, setLoading] = useState(true);
  const [regularItems, setRegularItems] = useState<RegularMergedItem[]>([]);
  const [spotItems, setSpotItems] = useState<SpotLogItem[]>([]);

  // 정기 TBM 미실시 조 현황판 상태
  const [weeksList, setWeeksList] = useState<{ id: string; week_label: string; topic: string; is_published: boolean }[]>([]);
  const [companiesList, setCompaniesList] = useState<{ id: string; name: string }[]>([]);
  const [teamsList, setTeamsList] = useState<{ id: string; name: string; company_id: string }[]>([]);
  const [checkWeekId, setCheckWeekId] = useState<string>("");
  const [onlyUnfinished, setOnlyUnfinished] = useState<boolean>(false);
  const [missingCopyMsg, setMissingCopyMsg] = useState<string>("");

 // 상세 모달 상태
  const [selectedRegular, setSelectedRegular] = useState<RegularMergedItem | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<SpotLogItem | null>(null);
  const [detailPhotoUrl, setDetailPhotoUrl] = useState("");
  const [detailEduPhotoUrls, setDetailEduPhotoUrls] = useState<string[]>([]);
  const [copyMsg, setCopyMsg] = useState("");

  // 수시 TBM 상세창 내 즉시 추가 서명 상태
  const [addSignName, setAddSignName] = useState("");
  const [addHasDrawn, setAddHasDrawn] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const addCanvasRef = useRef<HTMLCanvasElement>(null);
  const [addDrawing, setAddDrawing] = useState(false);

  async function loadAll() {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [acksRes, subsRes, spotsRes] = await Promise.all([
      supabase
        .from("tbm_acknowledgements")
        .select("*, companies(name), teams(name), tbm_weeks(week_label, topic, content, photo_paths)")
        .order("acknowledged_at", { ascending: false })
        .limit(1000),
      supabase
        .from("tbm_team_submissions")
        .select("*, companies(name), teams(name), tbm_weeks(week_label, topic, content, photo_paths)")
        .order("submitted_at", { ascending: false })
        .limit(500),
      supabase
        .from("tbm_spot_logs")
        .select("*, companies(name), teams(name), tbm_spot_signatures(*)")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    // 정기 TBM (회차 + 회사 + 조 기준 자동 통합)
    const map = new Map<string, RegularMergedItem>();

    (subsRes.data || []).forEach((s: any) => {
      const key = `${s.week_id}_${s.company_id}_${s.team_id}`;
      map.set(key, {
        key,
        weekId: s.week_id,
        weekLabel: s.tbm_weeks?.week_label || "-",
        topic: s.tbm_weeks?.topic || "-",
        content: s.tbm_weeks?.content || "-",
        photoPaths: s.tbm_weeks?.photo_paths || [],
        companyId: s.company_id,
        companyName: s.companies?.name || "-",
        teamId: s.team_id,
        teamName: s.teams?.name || "-",
        leaderSubmission: s,
        workers: [],
        latestTime: s.submitted_at,
      });
    });

    (acksRes.data || []).forEach((a: any) => {
      const key = `${a.week_id}_${a.company_id}_${a.team_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.workers.push(a);
        if (!existing.photoPaths?.length && a.tbm_weeks?.photo_paths?.length) {
          existing.photoPaths = a.tbm_weeks.photo_paths;
        }
        if (a.acknowledged_at > existing.latestTime) {
          existing.latestTime = a.acknowledged_at;
        }
      } else {
        map.set(key, {
          key,
          weekId: a.week_id,
          weekLabel: a.tbm_weeks?.week_label || "-",
          topic: a.tbm_weeks?.topic || "-",
          content: a.tbm_weeks?.content || "-",
          photoPaths: a.tbm_weeks?.photo_paths || [],
          companyId: a.company_id,
          companyName: a.companies?.name || "-",
          teamId: a.team_id,
          teamName: a.teams?.name || "-",
          workers: [a],
          latestTime: a.acknowledged_at,
        });
      }
    });

const mergedList = Array.from(map.values()).sort((a, b) =>
      b.latestTime.localeCompare(a.latestTime)
    );
    setRegularItems(mergedList);
    setSpotItems((spotsRes.data as SpotLogItem[]) || []);

    const [weeksRes, companiesRes, teamsRes] = await Promise.all([
      supabase
        .from("tbm_weeks")
        .select("id, week_label, topic, is_published")
        .order("starts_at", { ascending: false })
        .limit(30),
      supabase.from("companies").select("id, name").eq("active", true).order("name"),
      supabase.from("teams").select("id, name, company_id").eq("active", true).order("name"),
    ]);

    const fetchedWeeks = weeksRes.data || [];
    setWeeksList(fetchedWeeks);
    setCompaniesList(companiesRes.data || []);
    setTeamsList(teamsRes.data || []);

    if (fetchedWeeks.length > 0) {
      setCheckWeekId((prev) => {
        if (prev && fetchedWeeks.some((w) => w.id === prev)) return prev;
        const pub = fetchedWeeks.find((w) => w.is_published);
        return pub ? pub.id : fetchedWeeks[0].id;
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

// 협력사 정렬 및 선택 회차별 실시/미실시 현황 계산 (동아스틸 제외)
  const companyOrder = ["다인스틸", "나로스틸", "세현스틸", "에스로지스"];
  const teamOrder: Record<string, string[]> = {
    다인스틸: ["P5", "P9", "P10"],
    나로스틸: ["C1", "P1", "P7", "P8"],
    세현스틸: ["SL2", "SL5", "SCP1", "SCP2", "1공무", "2공무", "1품질", "2품질"],
    에스로지스: ["1출하", "2출하"],
  };

  const sortedCompanies = companiesList
    .filter((c) => c.name !== "동아스틸")
    .sort((a, b) => {
      const ia = companyOrder.indexOf(a.name);
      const ib = companyOrder.indexOf(b.name);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  const targetWeekObj = weeksList.find((w) => w.id === checkWeekId);
  const weekRegularItems = regularItems.filter((item) => item.weekId === checkWeekId);

  const companyStatusList = sortedCompanies
    .map((comp) => {
      const order = teamOrder[comp.name] || [];
      const compTeams = teamsList
        .filter((t) => t.company_id === comp.id)
        .sort((a, b) => {
          const ia = order.indexOf(a.name);
          const ib = order.indexOf(b.name);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        })
        .map((team) => {
          const found = weekRegularItems.find(
            (r) => r.companyId === comp.id && r.teamId === team.id
          );
          const hasLeader = Boolean(found?.leaderSubmission);
          const workerCount = found?.workers.length || 0;
          let status: "done" | "partial" | "missing" = "missing";
          if (hasLeader && workerCount > 0) status = "done";
          else if (hasLeader || workerCount > 0) status = "partial";

          return {
            ...team,
            hasLeader,
            workerCount,
            status,
            mergedItem: found || null,
          };
        });

      return {
        ...comp,
        teams: compTeams,
      };
    })
    .filter((comp) => comp.teams.length > 0);

  const allTeamStatuses = companyStatusList.flatMap((c) =>
    c.teams.map((t) => ({ ...t, companyName: c.name }))
  );
  const totalTeamCount = allTeamStatuses.length;
  const doneTeamCount = allTeamStatuses.filter((t) => t.status === "done").length;
  const partialTeamCount = allTeamStatuses.filter((t) => t.status === "partial").length;
  const missingTeamCount = allTeamStatuses.filter((t) => t.status === "missing").length;

  async function copyMissingTeamsNotice() {
    const weekTitle = targetWeekObj
      ? `${targetWeekObj.week_label} (${targetWeekObj.topic})`
      : "금주 정기 TBM";
    const missingByCompany = companyStatusList
      .map((c) => {
        const targets = c.teams.filter((t) => t.status !== "done");
        if (targets.length === 0) return null;
        const labels = targets.map((t) =>
          t.status === "partial"
            ? `${t.name}(${t.hasLeader ? "근로자서명 미완" : "조장사진 미제출"})`
            : t.name
        );
        return `- ${c.name}: ${labels.join(", ")}`;
      })
      .filter(Boolean);

    if (missingByCompany.length === 0) {
      setMissingCopyMsg("모든 조가 정기 TBM을 완료했습니다!");
      setTimeout(() => setMissingCopyMsg(""), 3000);
      return;
    }

    const noticeText = `[정기 TBM 미실시·미완료 조 안내]\n대상 회차: ${weekTitle}\n\n${missingByCompany.join(
      "\n"
    )}\n\n※ 작업 시작 전 TBM 교육 확인 및 서명, 조장 현장사진 제출을 완료해 주세요.\n바로가기: ${window.location.origin}/tbm`;

    try {
      await navigator.clipboard.writeText(noticeText);
      setMissingCopyMsg("미실시 조 안내 문구가 복사되었습니다! 단톡방에 붙여넣기 하세요.");
    } catch {
      window.prompt("아래 안내 문구를 복사해 단톡방에 공유해 주세요:", noticeText);
    }
    setTimeout(() => setMissingCopyMsg(""), 4000);
  }

  async function getPhotoUrl(path?: string | null) {
    if (!path) return "";
    const { data } = await supabase.storage.from("tbm-photos").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }

async function openRegularModal(item: RegularMergedItem) {
    setSelectedSpot(null);
    setSelectedRegular(item);
    setDetailPhotoUrl("");
    setDetailEduPhotoUrls([]);

    if (item.leaderSubmission?.photo_path) {
      setDetailPhotoUrl(await getPhotoUrl(item.leaderSubmission.photo_path));
    }

    if (item.photoPaths && item.photoPaths.length > 0) {
      const eduUrls: string[] = [];
      for (const eduPath of item.photoPaths) {
        const { data: signedEdu, error: eduErr } = await supabase.storage
          .from("tbm-education-photos")
          .createSignedUrl(eduPath, 3600);
        if (!eduErr && signedEdu?.signedUrl) {
          eduUrls.push(signedEdu.signedUrl);
        }
      }
      setDetailEduPhotoUrls(eduUrls);
    }
  }

  async function openSpotModal(item: SpotLogItem) {
    setSelectedRegular(null);
    setSelectedSpot(item);
    setDetailPhotoUrl("");
    setDetailEduPhotoUrls([]);
    setCopyMsg("");
    setAddSignName("");
    setAddHasDrawn(false);
    if (item.photo_path) {
      setDetailPhotoUrl(await getPhotoUrl(item.photo_path));
    }
  }

  async function copySpotShareLink(id: string) {
    const shareUrl = `${window.location.origin}/tbm/spot/sign?id=${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMsg("서명 링크가 복사되었습니다! 카톡방에 공유해 주세요.");
    } catch {
      window.prompt("아래 링크를 복사해 카톡방에 공유해 주세요:", shareUrl);
    }
  }

  const getCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startAddDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = addCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x, y);
    setAddDrawing(true);
    setAddHasDrawn(true);
  };

  const moveAddDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!addDrawing || !addCanvasRef.current) return;
    const canvas = addCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopAddDraw = () => setAddDrawing(false);

  const clearAddCanvas = () => {
    const canvas = addCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAddHasDrawn(false);
  };

  async function submitExtraSpotSignature() {
    if (!selectedSpot) return;
    if (!addSignName.trim()) { alert("작업자 성명을 입력하세요."); return; }
    if (!addHasDrawn || !addCanvasRef.current) { alert("서명란에 서명해 주세요."); return; }

    setAddSaving(true);
    const dataUrl = addCanvasRef.current.toDataURL("image/png");
    const { error } = await supabase.from("tbm_spot_signatures").insert({
      spot_id: selectedSpot.id,
      worker_name: addSignName.trim(),
      signature_data: dataUrl,
    });
    setAddSaving(false);
    if (error) { alert("서명 추가 오류: " + error.message); return; }

    setAddSignName("");
    clearAddCanvas();
    const { data: refreshed } = await supabase
      .from("tbm_spot_logs")
      .select("*, companies(name), teams(name), tbm_spot_signatures(*)")
      .eq("id", selectedSpot.id)
      .maybeSingle();
    if (refreshed) setSelectedSpot(refreshed as SpotLogItem);
    loadAll();
  }

  return (
    <div>
      <style>{`
        .tbm-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
        .tbm-table-scroll table { min-width: 650px; width: 100%; }
        .tbm-table-scroll th, .tbm-table-scroll td { white-space: nowrap; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { height: auto !important; overflow: visible !important; background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-modal-wrapper { position: static !important; inset: auto !important; overflow: visible !important; background: none !important; padding: 0 !important; }
          .print-modal-card { box-shadow: none !important; border: none !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 10mm !important; }
        }
      `}</style>

      <header className="topbar no-print">
        <div className="brand">
          DOSCO TBM SYSTEM
          <small>TBM 실시 현황 (정기 · 수시 통합)</small>
        </div>
        <nav className="nav">
          <Link href="/">전체 홈</Link>
          <Link href="/tbm">정기 TBM</Link>
          <Link href="/tbm/spot">수시 TBM 작성</Link>
          <Link href="/leader">조장 제출</Link>
        </nav>
      </header>

      <main className="shell no-print">
        <div className="pagehead">
          <div>
            <h1>TBM 실시 현황</h1>
            <div className="muted">정기 안전교육(조별 통합)과 수시 작업 TBM(R/C·정비) 기록을 확인하고 상세 일지를 출력할 수 있습니다.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/tbm/spot" className="btn" style={{ background: "#0f766e", borderColor: "#0f766e" }}>
              + 수시 작업 TBM 작성
            </Link>
            <button className="btn secondary" onClick={loadAll}>새로고침</button>
          </div>
        </div>

{/* 정기 TBM 조별 실시·미실시 현황판 */}
        {tab !== "spot" && weeksList.length > 0 && (
          <div className="card section" style={{ borderLeft: "4px solid #dc2626" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>📊 정기 TBM 조별 실시 · 미실시 현황판</h2>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  조장 사진·일지 제출과 근로자 서명이 모두 완료되어야 <b>실시완료</b>로 집계됩니다.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={checkWeekId}
                  onChange={(e) => setCheckWeekId(e.target.value)}
                  style={{ minWidth: 210, fontWeight: "bold" }}
                >
                  {weeksList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.week_label} · {w.topic}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setOnlyUnfinished((prev) => !prev)}
                  style={{
                    background: onlyUnfinished ? "#fee2e2" : "#fff",
                    color: onlyUnfinished ? "#b91c1c" : "#1e293b",
                    borderColor: onlyUnfinished ? "#fca5a5" : "#cbd5e1",
                    fontWeight: "bold",
                  }}
                >
                  {onlyUnfinished ? "전체 조 보기" : `미실시·미완만 보기 (${missingTeamCount + partialTeamCount})`}
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{ background: "#1e3a8a", borderColor: "#1e3a8a" }}
                  onClick={copyMissingTeamsNotice}
                >
                  카톡방 미실시 안내 복사
                </button>
              </div>
            </div>

            {missingCopyMsg && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  color: "#15803d",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 12,
                  fontWeight: 600,
                }}
              >
                {missingCopyMsg}
              </div>
            )}

            {/* 요약 배지 */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, fontSize: 13 }}>
              <span className="pill" style={{ background: "#f1f5f9", color: "#334155", fontWeight: "bold" }}>
                전체 대상: {totalTeamCount}개 조
              </span>
              <span className="pill ok" style={{ fontWeight: "bold" }}>
                실시완료: {doneTeamCount}개 조
              </span>
              <span className="pill" style={{ background: "#fef3c7", color: "#92400e", fontWeight: "bold" }}>
                일부미완(조장 또는 서명 누락): {partialTeamCount}개 조
              </span>
              <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c", fontWeight: "bold" }}>
                미실시: {missingTeamCount}개 조
              </span>
            </div>

            {/* 회사별 조 상태 그리드 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
              {companyStatusList.map((comp) => {
                const visibleTeams = onlyUnfinished
                  ? comp.teams.filter((t) => t.status !== "done")
                  : comp.teams;
                if (visibleTeams.length === 0) return null;

                const compDoneCount = comp.teams.filter((t) => t.status === "done").length;

                return (
                  <div
                    key={comp.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                        paddingBottom: 6,
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <b style={{ fontSize: 14, color: "#0f172a" }}>{comp.name}</b>
                      <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
                        완료 {compDoneCount}/{comp.teams.length}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {visibleTeams.map((t) => {
                        const isDone = t.status === "done";
                        const isPartial = t.status === "partial";
                        const bg = isDone ? "#dcfce7" : isPartial ? "#fef3c7" : "#fee2e2";
                        const border = isDone ? "#86efac" : isPartial ? "#fcd34d" : "#fca5a5";
                        const color = isDone ? "#166534" : isPartial ? "#92400e" : "#b91c1c";

                        const subLabel = isDone
                          ? `완료(${t.workerCount}명)`
                          : isPartial
                          ? `${t.hasLeader ? "서명0명" : "조장미제출"}`
                          : "미실시";

                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (t.mergedItem) openRegularModal(t.mergedItem);
                            }}
                            title={
                              t.mergedItem
                                ? "클릭하면 상세 일지를 확인할 수 있습니다"
                                : "아직 제출된 기록이 없습니다"
                            }
                            style={{
                              background: bg,
                              border: `1px solid ${border}`,
                              color,
                              borderRadius: 8,
                              padding: "5px 9px",
                              fontSize: 12.5,
                              fontWeight: 700,
                              cursor: t.mergedItem ? "pointer" : "default",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>{t.name}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.9 }}>
                              · {subLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 필터 탭 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className="btn secondary"
            onClick={() => setTab("all")}
            style={{ background: tab === "all" ? "#1e3a8a" : "#fff", color: tab === "all" ? "#fff" : "#1e293b", fontWeight: "bold" }}
          >
            전체 보기
          </button>
          <button
            className="btn secondary"
            onClick={() => setTab("spot")}
            style={{ background: tab === "spot" ? "#0f766e" : "#fff", color: tab === "spot" ? "#fff" : "#1e293b", fontWeight: "bold" }}
          >
            🛠️ 수시 작업 TBM ({spotItems.length})
          </button>
          <button
            className="btn secondary"
            onClick={() => setTab("regular")}
            style={{ background: tab === "regular" ? "#2563eb" : "#fff", color: tab === "regular" ? "#fff" : "#1e293b", fontWeight: "bold" }}
          >
            📘 정기 안전교육 ({regularItems.length})
          </button>
        </div>

        {/* 1. 수시 작업 TBM 목록 */}
        {(tab === "all" || tab === "spot") && (
          <div className="card section">
            <h2>🛠️ 수시 작업 TBM 현황 (R/C · 정비 · 돌발작업)</h2>
            <div className="tablewrap tbm-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>작업일자</th>
                    <th>구분</th>
                    <th>소속 / 조</th>
                    <th>작업명</th>
                    <th>책임자</th>
                    <th>참여 서명</th>
                    <th>상세 / 서명추가</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="empty">불러오는 중...</td></tr>
                  ) : spotItems.length > 0 ? (
                    spotItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.work_date}</td>
                        <td><span className="pill" style={{ background: "#ccfbf1", color: "#0f766e" }}>{item.work_category}</span></td>
                        <td><b>{item.companies?.name || "-"}</b> / {item.teams?.name || "-"}</td>
                        <td>{item.work_title}</td>
                        <td>{item.leader_name}</td>
                        <td><span className="pill ok">{(item.tbm_spot_signatures || []).length}명 서명</span></td>
                        <td>
                          <button className="btn secondary" onClick={() => openSpotModal(item)}>상세 / 서명·출력</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="empty">등록된 수시 작업 TBM이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. 정기 안전교육 조별 통합 현황 */}
        {(tab === "all" || tab === "regular") && (
          <div className="card section">
            <h2>📘 정기 안전교육 실시 현황 (조별 통합)</h2>
            <div className="tablewrap tbm-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>교육 회차</th>
                    <th>소속 회사</th>
                    <th>소속 조</th>
                    <th>조장 사진·일지</th>
                    <th>근로자 서명 인원</th>
                    <th>상세 / 출력</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="empty">불러오는 중...</td></tr>
                  ) : regularItems.length > 0 ? (
                    regularItems.map(item => (
                      <tr key={item.key}>
                        <td>{item.weekLabel}</td>
                        <td><b>{item.companyName}</b></td>
                        <td>{item.teamName}</td>
                        <td>
                          {item.leaderSubmission ? (
                            <span className="pill ok">제출완료 ({item.leaderSubmission.leader_name})</span>
                          ) : (
                            <span className="pill wait">조장 미제출</span>
                          )}
                        </td>
                        <td>
                          <span className="pill" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                            {item.workers.length}명 확인완료
                          </span>
                        </td>
                        <td>
                          <button className="btn secondary" onClick={() => openRegularModal(item)}>상세 / 일지출력</button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} className="empty">정기 안전교육 기록이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ================= 수시 작업 TBM 상세 및 A4 출력 / 서명추가 모달 ================= */}
      {selectedSpot && (
        <div className="print-modal-wrapper" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, overflowY: "auto", padding: 16 }}>
          <div className="card print-modal-card" style={{ maxWidth: 800, margin: "0 auto", background: "#fff" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #ddd", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => window.print()}>A4 인쇄 / PDF 저장</button>
                <button className="btn secondary" onClick={() => copySpotShareLink(selectedSpot.id)}>
                  동료 서명 링크 복사 (카톡방 공유)
                </button>
              </div>
              <button className="btn secondary" onClick={() => setSelectedSpot(null)}>닫기</button>
            </div>

            {copyMsg && (
              <div className="no-print" style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
                {copyMsg}
              </div>
            )}

            {/* A4 출력 본문 */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", fontSize: 12 }}>
              <tbody>
                <tr>
                  <th colSpan={4} style={{ border: "1px solid #000", padding: 10, fontSize: 18, background: "#f3f4f6" }}>
                    수 시 작 업 T B M 일 지 ({selectedSpot.work_category})
                  </th>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6, width: 110 }}>작업일자</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>{selectedSpot.work_date}</td>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6, width: 110 }}>소속 / 조</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>{selectedSpot.companies?.name} / {selectedSpot.teams?.name}</td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>작업명</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>{selectedSpot.work_title}</td>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>작업책임자</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>{selectedSpot.leader_name}</td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>건강·보호구</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>{selectedSpot.health_status || "-"}</td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>유해·위험요인</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {selectedSpot.hazard_factors || "-"}
                  </td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>안전대책</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {selectedSpot.safety_measures || "-"}
                  </td>
                </tr>
                {detailPhotoUrl && (
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>현장 실시 사진</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 8, textAlign: "center" }}>
                      <img src={detailPhotoUrl} alt="현장 TBM 사진" style={{ maxHeight: 220, border: "1px solid #ccc" }} />
                    </td>
                  </tr>
                )}
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>
                    참여자 서명<br />({(selectedSpot.tbm_spot_signatures || []).length}명)
                  </th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(selectedSpot.tbm_spot_signatures || []).map(sig => (
                        <div key={sig.id} style={{ border: "1px solid #999", padding: 4, textAlign: "center", width: 95 }}>
                          <img src={sig.signature_data} alt="서명" style={{ width: "100%", height: 40, objectFit: "contain" }} />
                          <div style={{ fontSize: 11.5, fontWeight: "bold" }}>{sig.worker_name}</div>
                        </div>
                      ))}
                      {(selectedSpot.tbm_spot_signatures || []).length === 0 && (
                        <span className="muted">등록된 참여자 서명이 없습니다.</span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 현장에서 즉시 추가 서명 */}
            <div className="no-print" style={{ marginTop: 16, padding: 12, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc" }}>
              <div style={{ fontWeight: "bold", fontSize: 13.5, marginBottom: 8 }}>+ 이 기기에서 참여자 서명 추가하기</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input className="input" placeholder="추가할 작업자 성명" value={addSignName} onChange={e => setAddSignName(e.target.value)} style={{ flex: 1 }} />
                <button type="button" className="btn secondary" onClick={clearAddCanvas}>지우기</button>
              </div>
              <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fff", marginBottom: 8 }}>
                <canvas
                  ref={addCanvasRef}
                  width={360}
                  height={110}
                  style={{ width: "100%", height: 110, touchAction: "none", display: "block" }}
                  onMouseDown={startAddDraw}
                  onMouseMove={moveAddDraw}
                  onMouseUp={stopAddDraw}
                  onMouseLeave={stopAddDraw}
                  onTouchStart={startAddDraw}
                  onTouchMove={moveAddDraw}
                  onTouchEnd={stopAddDraw}
                />
              </div>
              <button type="button" className="btn" style={{ width: "100%" }} onClick={submitExtraSpotSignature} disabled={addSaving}>
                {addSaving ? "등록 중..." : "서명 추가 등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 정기 안전교육 통합 상세 및 A4 출력 모달 ================= */}
      {selectedRegular && (
        <div className="print-modal-wrapper" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, overflowY: "auto", padding: 16 }}>
          <div className="card print-modal-card" style={{ maxWidth: 800, margin: "0 auto", background: "#fff" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #ddd" }}>
              <button className="btn" onClick={() => window.print()}>A4 인쇄 / PDF 저장</button>
              <button className="btn secondary" onClick={() => setSelectedRegular(null)}>닫기</button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", fontSize: 12 }}>
              <tbody>
                <tr>
                  <th colSpan={4} style={{ border: "1px solid #000", padding: 10, fontSize: 18, background: "#f3f4f6" }}>
                    정 기 안 전 교 육 및 T B M 일 지
                  </th>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6, width: 110 }}>교육 회차</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>{selectedRegular.weekLabel}</td>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6, width: 110 }}>소속 / 조</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>{selectedRegular.companyName} / {selectedRegular.teamName}</td>
                </tr>
<tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>교육 주제</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>{selectedRegular.topic}</td>
                </tr>
<tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>교육 내용</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6, whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                    {selectedRegular.content || "-"}
                  </td>
                </tr>
                {detailEduPhotoUrls.length > 0 && (
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>교육자료 사진</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 8 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                        {detailEduPhotoUrls.map((eduUrl, idx) => (
                          <img
                            key={idx}
                            src={eduUrl}
                            alt={`교육자료 사진 ${idx + 1}`}
                            style={{ maxHeight: 180, maxWidth: "48%", objectFit: "contain", border: "1px solid #ccc" }}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>조장 확인</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>
                    {selectedRegular.leaderSubmission ? `${selectedRegular.leaderSubmission.leader_name} (제출완료)` : "미제출"}
                  </td>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>건강·보호구</th>
                  <td style={{ border: "1px solid #000", padding: 6 }}>
                    {selectedRegular.leaderSubmission?.health_status || "-"}
                  </td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>금주 핵심 위험</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>
                    {selectedRegular.leaderSubmission?.daily_hazard || "-"}
                  </td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>개인별 선택<br />안전수칙</th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 6, lineHeight: 1.6 }}>
                    {selectedRegular.workers.length > 0 ? (
                      selectedRegular.workers.map(w => (
                        <div key={w.id} style={{ marginBottom: 4 }}>
                          <b>{w.worker_name}</b> -{" "}
                          {Array.isArray(w.selected_rules) && w.selected_rules.length > 0
                            ? w.selected_rules.join(" / ")
                            : "선택 항목 없음"}
                        </div>
                      ))
                    ) : (
                      <span className="muted">등록된 개인별 확인 내역이 없습니다.</span>
                    )}
                  </td>
                </tr>
                {detailPhotoUrl && (
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>TBM 실시 사진</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 8, textAlign: "center" }}>
                      <img src={detailPhotoUrl} alt="조별 TBM 사진" style={{ maxHeight: 220, border: "1px solid #ccc" }} />
                    </td>
                  </tr>
                )}
                <tr>
                  <th style={{ border: "1px solid #000", background: "#f9fafb", padding: 6 }}>
                    근로자 서명<br />({selectedRegular.workers.length}명)
                  </th>
                  <td colSpan={3} style={{ border: "1px solid #000", padding: 8 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {selectedRegular.workers.map(w => (
                        <div key={w.id} style={{ border: "1px solid #999", padding: 4, textAlign: "center", width: 95 }}>
                          {w.signature_data ? (
                            <img src={w.signature_data} alt="서명" style={{ width: "100%", height: 40, objectFit: "contain" }} />
                          ) : (
                            <div style={{ height: 40, lineHeight: "40px", fontSize: 11, color: "#666" }}>서명완료</div>
                          )}
                          <div style={{ fontSize: 11.5, fontWeight: "bold" }}>{w.worker_name}</div>
                        </div>
                      ))}
                      {selectedRegular.workers.length === 0 && (
                        <span className="muted">등록된 근로자 서명이 없습니다.</span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}