"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type Company = { id: string; name: string };
type Team = { id: string; name: string; company_id: string };
type Week = { id: string; week_label: string; topic: string };

export default function LeaderPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [company, setCompany] = useState("");
  const [team, setTeam] = useState("");
  const [week, setWeek] = useState("");
  const [leader, setLeader] = useState("");
  const [healthStatus, setHealthStatus] = useState("이상없음");
  const [dailyHazard, setDailyHazard] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canRetry, setCanRetry] = useState(false);

  const [submittedWorkers, setSubmittedWorkers] = useState<{ id: string; worker_name: string; acknowledged_at: string }[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  async function loadSubmittedWorkers(targetWeek: string, targetCompany: string, targetTeam: string) {
    if (!configured || !targetWeek || !targetCompany || !targetTeam) {
      setSubmittedWorkers([]);
      return;
    }
    setLoadingWorkers(true);
    const { data } = await supabase
      .from("tbm_acknowledgements")
      .select("id, worker_name, acknowledged_at")
      .eq("week_id", targetWeek)
      .eq("company_id", targetCompany)
      .eq("team_id", targetTeam)
      .order("acknowledged_at", { ascending: true });
    setSubmittedWorkers(data || []);
    setLoadingWorkers(false);
  }

  useEffect(() => {
    loadSubmittedWorkers(week, company, team);
  }, [week, company, team]);

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const [c, t, w] = await Promise.all([
        supabase.from("companies").select("id,name").eq("active", true).order("name"),
        supabase.from("teams").select("id,name,company_id").eq("active", true).order("name"),
        supabase.from("tbm_weeks").select("id,week_label,topic").eq("is_published", true).order("starts_at", { ascending: false })
      ]);

      const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];
      setCompanies(
        (c.data || []).sort(
          (a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name)
        )
      );
      setTeams(t.data || []);
      setWeeks(w.data || []);
      if (w.data?.[0]) setWeek(w.data[0].id);
    })();
  }, []);

  const filtered = teams.filter(t => t.company_id === company);
  const selectedCompanyName = companies.find(c => c.id === company)?.name;
  const teamOrder: Record<string, string[]> = {
    "동아스틸": ["전기파트", "품질파트", "기타부서"],
    "다인스틸": ["P5", "P9", "P10"],
    "나로스틸": ["C1", "P1", "P7", "P8"],
    "세현스틸": ["SL2", "SL5", "SCP1", "SCP2", "1공무", "2공무", "1품질", "2품질"],
    "에스로지스": ["1출하", "2출하"]
  };
  const orderedTeams = [...filtered].sort((a, b) => {
    const order = teamOrder[selectedCompanyName || ""] || [];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  async function compressImage(rawFile: File): Promise<Blob | File> {
    if (!rawFile.type.startsWith("image/")) return rawFile;
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(rawFile);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxSide = 1280;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(rawFile);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < rawFile.size) resolve(blob);
            else resolve(rawFile);
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(rawFile);
      };
      img.src = objectUrl;
    });
  }

  async function upload() {
    if (submitting) return;
    setMsg("");
    setCanRetry(false);

    if (!company || !team || !week || !leader.trim() || !file) {
      setMsg("모든 항목과 사진을 입력해 주세요.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMsg("사진은 20MB 이하로 올려 주세요.");
      return;
    }

    setSubmitting(true);
    setMsg("사진 용량을 최적화하여 업로드 중입니다...");

    try {
      const compressed = await compressImage(file);
      const isJpeg = compressed !== file;
      const ext = isJpeg ? "jpg" : (file.name.split(".").pop() || "jpg");
      const path = `${week}/${team}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("tbm-photos").upload(path, compressed, {
        upsert: false,
        contentType: isJpeg ? "image/jpeg" : file.type,
      });
      if (up.error) {
        throw new Error("사진 업로드 실패: " + up.error.message);
      }

      const { error } = await supabase.from("tbm_team_submissions").upsert(
        {
          week_id: week,
          company_id: company,
          team_id: team,
          leader_name: leader.trim(),
          health_status: healthStatus,
          daily_hazard: dailyHazard.trim() || "특이사항 없음",
          photo_path: path,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "week_id,team_id" }
      );
      if (error) {
        throw new Error("제출 기록 저장 실패: " + error.message);
      }

      setMsg("조별 TBM 일지 및 현장 사진이 제출되었습니다.");
    } catch (err: any) {
      setMsg(
        (err?.message || "전송 중 오류가 발생했습니다.") +
          " 입력하신 내용은 유지되니 [다시 시도]를 눌러 주세요."
      );
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mobile">
      <div style={{ marginBottom: 10 }}>
        <Link href="/" className="btn secondary">
          ← 홈으로
        </Link>
      </div>
      <div className="mobilehero">
        <div style={{ fontSize: 12, opacity: 0.8 }}>DONG-A STEEL · LEADER</div>
        <h1>조별 TBM 사진 제출</h1>
        <div style={{ fontSize: 13, opacity: 0.85 }}>조장 또는 지정 담당자용</div>
      </div>
      <div className="card">
        {!configured && <p className="muted">Supabase 연결 후 사용할 수 있습니다.</p>}
        <div className="field">
          <label>교육 회차</label>
          <select value={week} onChange={e => setWeek(e.target.value)}>
            <option value="">회차 선택</option>
            {weeks.map(w => <option key={w.id} value={w.id}>{w.week_label} · {w.topic}</option>)}
          </select>
        </div>
        <div className="field">
          <label>소속 회사</label>
          <select value={company} onChange={e => { setCompany(e.target.value); setTeam(""); }}>
            <option value="">회사 선택</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>소속 조</label>
          <select value={team} onChange={e => setTeam(e.target.value)}>
            <option value="">조 선택</option>
            {orderedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {week && company && team && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <b style={{ fontSize: 13.5, color: "#166534" }}>
                우리 조 실시간 서명 완료 현황 ({submittedWorkers.length}명)
              </b>
              <button
                type="button"
                className="btn secondary"
                style={{ padding: "4px 10px", fontSize: 12 }}
                onClick={() => loadSubmittedWorkers(week, company, team)}
              >
                {loadingWorkers ? "조회중..." : "새로고침"}
              </button>
            </div>
            {submittedWorkers.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {submittedWorkers.map((w, idx) => (
                  <span
                    key={w.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #86efac",
                      color: "#15803d",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    {idx + 1}. {w.worker_name} ✓
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "#4b5563" }}>
                아직 서명을 완료한 조원이 없습니다. 조원들이 QR로 서명을 마치면 위 [새로고침]으로 바로 확인할 수 있습니다.
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>제출자(조장) 이름</label>
          <input className="input" value={leader} onChange={e => setLeader(e.target.value)} placeholder="이름 입력" />
        </div>

        <div className="field">
          <label>작업자 건강 및 보호구 상태 점검</label>
          <select value={healthStatus} onChange={e => setHealthStatus(e.target.value)}>
            <option value="이상없음">전원 이상없음 (보호구 착용 및 건강 양호)</option>
            <option value="보호구 보완 조치 완료">보호구 미비자 보완 조치 후 작업 투입</option>
            <option value="건강 이상자 작업 조정">건강 이상자(음주·피로 등) 작업 제외/조정</option>
          </select>
        </div>

        <div className="field">
          <label>금주 중점 위험요인 및 안전대책 (한 줄 요약)</label>
          <input
            className="input"
            value={dailyHazard}
            onChange={e => setDailyHazard(e.target.value)}
            placeholder="예: 크레인 인양 하부 출입 통제 및 전선 피복 점검"
          />
        </div>

        <div className="field">
          <label>TBM 실시 사진</label>
          <div className="upload">
            <input type="file" accept="image/*" capture="environment" onChange={e => setFile(e.target.files?.[0] || null)} />
            <p className="muted">{file ? file.name : "현장에서 사진을 촬영하거나 선택해 주세요."}</p>
          </div>
        </div>

        <button className="btn" style={{ width: "100%" }} onClick={upload} disabled={submitting}>
          {submitting ? "제출 중..." : "사진 제출"}
        </button>

        {msg && (
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <p className="muted" style={{ color: canRetry ? "#b91c1c" : undefined, fontWeight: canRetry ? "bold" : undefined, marginBottom: canRetry ? 8 : 0 }}>
              {msg}
            </p>
            {canRetry && (
              <button
                type="button"
                className="btn"
                style={{ background: "#dc2626", borderColor: "#dc2626", padding: "8px 16px" }}
                onClick={upload}
                disabled={submitting}
              >
                {submitting ? "재전송 중..." : "다시 시도"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="footer">사진에는 교육 참여 현장이 확인되도록 촬영해 주세요.</div>
    </main>
  );
}