"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type Company = { id: string; name: string };
type Team = { id: string; name: string; company_id: string };
type Week = {
  id: string;
  week_label: string;
  topic: string;
  title?: string;
  content?: string;
  photo_paths?: string[];
};
type ProcessRule = {
  id: string;
  process_name: string;
  rule_text: string;
};
type WorkerEntry = {
  id: string;
  worker_name: string;
  individual_scheduled: boolean;
  selected_rules: string[];
  signature_data: string | null;
  has_drawn: boolean;
};

function getProcessByTeamName(teamName: string): string {
  if (["P5", "P9", "P10", "C1", "P1", "P7", "P8"].includes(teamName)) return "조관";
  if (["SL2", "SL5"].includes(teamName)) return "슬리터";
  if (["SCP1", "SCP2"].includes(teamName)) return "도장";
  if (["1출하", "2출하"].includes(teamName)) return "출하";
  if (["1공무", "2공무", "전기파트"].includes(teamName)) return "공무";
  if (["1품질", "2품질", "품질파트"].includes(teamName)) return "품질";
  return "전사공통";
}

function LeaderForm() {
  const searchParams = useSearchParams();
  const initialWeekId = searchParams.get("w") || "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [processRules, setProcessRules] = useState<ProcessRule[]>([]);
  const [company, setCompany] = useState("");
  const [team, setTeam] = useState("");
  const [week, setWeek] = useState("");
const [leader, setLeader] = useState("");
  const [healthStatus, setHealthStatus] = useState("이상없음");
  const [dailyHazard, setDailyHazard] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [msg, setMsg] = useState("");
  const [isErrorMsg, setIsErrorMsg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [submittedDone, setSubmittedDone] = useState(false);

  // 다같이 서명 모달 및 개별진행 상태 (기본값: 개별진행 체크)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [individualScheduled, setIndividualScheduled] = useState(true);
  const [workerSelectedRules, setWorkerSelectedRules] = useState<string[]>([]);
  const [workerEntries, setWorkerEntries] = useState<WorkerEntry[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [submittedWorkers, setSubmittedWorkers] = useState<
    {
      id: string;
      worker_name: string;
      status?: string;
      is_individual_scheduled?: boolean;
      acknowledged_at?: string | null;
    }[]
  >([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  const selectedWeekObj = weeks.find((w) => w.id === week) || null;

  function setNotice(text: string, isError = false) {
    setMsg(text);
    setIsErrorMsg(isError);
  }

  async function loadSubmittedWorkers(
    targetWeek: string,
    targetCompany: string,
    targetTeam: string
  ) {
    if (!configured || !targetWeek || !targetCompany || !targetTeam) {
      setSubmittedWorkers([]);
      return;
    }
    setLoadingWorkers(true);
    const { data } = await supabase
      .from("tbm_acknowledgements")
      .select("id, worker_name, status, is_individual_scheduled, acknowledged_at")
      .eq("week_id", targetWeek)
      .eq("company_id", targetCompany)
      .eq("team_id", targetTeam)
      .order("id", { ascending: true });
    setSubmittedWorkers(data || []);
    setLoadingWorkers(false);
  }

  useEffect(() => {
    loadSubmittedWorkers(week, company, team);
  }, [week, company, team]);

  useEffect(() => {
    if (!configured) return;
    (async () => {
      const [c, t, w, r] = await Promise.all([
        supabase.from("companies").select("id,name").eq("active", true).order("name"),
        supabase.from("teams").select("id,name,company_id").eq("active", true).order("name"),
        supabase
          .from("tbm_weeks")
          .select("id,week_label,topic,title,content,photo_paths")
          .eq("is_published", true)
          .order("starts_at", { ascending: false }),
        supabase.from("tbm_process_rules").select("id,process_name,rule_text"),
      ]);

      const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];
      setCompanies(
        (c.data || []).sort(
          (a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name)
        )
      );
      setTeams(t.data || []);
      setProcessRules((r.data as ProcessRule[]) || []);

      const loadedWeeks = (w.data as Week[]) || [];
      setWeeks(loadedWeeks);
      if (initialWeekId && loadedWeeks.some((item) => item.id === initialWeekId)) {
        setWeek(initialWeekId);
      } else if (loadedWeeks[0]) {
        setWeek(loadedWeeks[0].id);
      }
    })();
  }, [initialWeekId]);

  const filtered = teams.filter((t) => t.company_id === company);
  const selectedCompanyName = companies.find((c) => c.id === company)?.name;
  const teamOrder: Record<string, string[]> = {
    동아스틸: ["전기파트", "품질파트", "기타부서"],
    다인스틸: ["P5", "P9", "P10"],
    나로스틸: ["C1", "P1", "P7", "P8"],
    세현스틸: ["SL2", "SL5", "SCP1", "SCP2", "1공무", "2공무", "1품질", "2품질"],
    에스로지스: ["1출하", "2출하"],
  };
  const orderedTeams = [...filtered].sort((a, b) => {
    const order = teamOrder[selectedCompanyName || ""] || [];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  const selectedTeamObj = teams.find((t) => t.id === team);
  const currentProcess = selectedTeamObj ? getProcessByTeamName(selectedTeamObj.name) : "전사공통";
  const normalizeProc = (s: string) => (s || "").replace(/\s+/g, "").trim();
  const matchedProcessRules = processRules.filter(
    (r) => normalizeProc(r.process_name) === normalizeProc(currentProcess)
  );
  const matchedCommonRules = processRules.filter(
    (r) => normalizeProc(r.process_name).includes("전사공통")
  );
  const combinedRules = [...matchedProcessRules, ...matchedCommonRules].filter(
    (rule, idx, arr) => arr.findIndex((item) => item.id === rule.id) === idx
  );
  const applicableRules = combinedRules.length > 0 ? combinedRules : processRules;
  const minRequiredRules = Math.min(2, applicableRules.length);

  function toggleWorkerRule(ruleText: string, checked: boolean) {
    if (checked) {
      setWorkerSelectedRules((prev) => (prev.includes(ruleText) ? prev : [...prev, ruleText]));
    } else {
      setWorkerSelectedRules((prev) => prev.filter((item) => item !== ruleText));
    }
  }

  const getCoords = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (individualScheduled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current || individualScheduled) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  function openBatchSignatureModal() {
    setModalMsg("");
    setIndividualScheduled(false);
    setBatchModalOpen(true);
  }

  function closeBatchSignatureModal() {
    setModalMsg("");
    setBatchModalOpen(false);
  }

  function addWorkerEntry() {
    const trimmed = workerName.trim();
    setModalMsg("");

    if (!trimmed) {
      setModalMsg("근로자 이름을 입력해 주세요.");
      return;
    }

    if (!individualScheduled && (!hasDrawn || !canvasRef.current)) {
      setModalMsg("서명란에 서명해 주세요. (또는 개별진행을 체크해 주세요)");
      return;
    }

    if (!individualScheduled && minRequiredRules > 0 && workerSelectedRules.length < minRequiredRules) {
      setModalMsg(`위험요인·안전수칙을 ${minRequiredRules}개 이상 선택해 주세요.`);
      return;
    }

    const sig =
      individualScheduled || !canvasRef.current
        ? null
        : canvasRef.current.toDataURL("image/png");

    const entry: WorkerEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      worker_name: trimmed,
      individual_scheduled: individualScheduled,
      selected_rules: individualScheduled ? [] : workerSelectedRules,
      signature_data: sig,
      has_drawn: !individualScheduled && hasDrawn,
    };

    setWorkerEntries((prev) => [...prev, entry]);
    setWorkerName("");
    setWorkerSelectedRules([]);
    clearCanvas();
    setModalMsg(`${trimmed}님이 명단에 추가되었습니다.`);
  }

  function removeWorkerEntry(id: string) {
    setWorkerEntries((prev) => prev.filter((item) => item.id !== id));
  }

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

function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const oversized = picked.find((f) => f.size > 20 * 1024 * 1024);
    if (oversized) {
      setNotice("사진 한 장당 20MB 이하로 올려 주세요.", true);
      setFileInputKey((k) => k + 1);
      return;
    }

    const newUrls = picked.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...picked]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    setNotice("", false);
    setFileInputKey((k) => k + 1);
  }

  function handleRemovePhoto(index: number) {
    setPreviewUrls((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, idx) => idx !== index);
    });
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  function clearPhotos() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setFiles([]);
    setFileInputKey((k) => k + 1);
  }

  async function upload() {
    if (submitting) return;
    setNotice("", false);
    setCanRetry(false);

    if (!company || !team || !week || !leader.trim() || files.length === 0) {
      setNotice("모든 항목과 사진을 1장 이상 첨부해 주세요.", true);
      return;
    }

    setSubmitting(true);
    setNotice("사진 용량을 최적화하여 업로드 중입니다...", false);

    try {
      const uploadedPaths: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const compressed = await compressImage(currentFile);
        const isJpeg = compressed !== currentFile;
        const ext = isJpeg ? "jpg" : currentFile.name.split(".").pop() || "jpg";
        const path = `${week}/${team}/${Date.now()}_${i}.${ext}`;
        const up = await supabase.storage.from("tbm-photos").upload(path, compressed, {
          upsert: false,
          contentType: isJpeg ? "image/jpeg" : currentFile.type,
        });
        if (up.error) {
          throw new Error(`사진(${i + 1}번째) 업로드 실패: ` + up.error.message);
        }
        uploadedPaths.push(path);
      }

      const primaryPath = uploadedPaths[0];

      const { error } = await supabase.from("tbm_team_submissions").upsert(
        {
          week_id: week,
          company_id: company,
          team_id: team,
          leader_name: leader.trim(),
          health_status: healthStatus,
          daily_hazard: dailyHazard.trim() || "특이사항 없음",
          photo_path: primaryPath,
          photo_paths: uploadedPaths,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "week_id,team_id" }
      );
      if (error) {
        throw new Error("제출 기록 저장 실패: " + error.message);
      }

      if (workerEntries.length > 0) {
        const rows = workerEntries.map((entry) => ({
          week_id: week,
          company_id: company,
          team_id: team,
          worker_name: entry.worker_name,
          selected_rules: entry.selected_rules || [],
          signature_data: entry.individual_scheduled ? null : entry.signature_data,
          status: entry.individual_scheduled ? "개별진행" : "완료",
          is_individual_scheduled: entry.individual_scheduled,
          acknowledged_at: entry.individual_scheduled ? null : new Date().toISOString(),
        }));
        const { error: ackError } = await supabase
          .from("tbm_acknowledgements")
          .insert(rows);
        if (ackError) {
          throw new Error(
            "근로자 서명/개별진행 저장 실패: " + ackError.message
          );
        }
      }

      setWorkerEntries([]);
      setWorkerName("");
      setIndividualScheduled(true);
      setWorkerSelectedRules([]);
      clearCanvas();
      setBatchModalOpen(false);
      await loadSubmittedWorkers(week, company, team);
      setSubmittedDone(true);
      setNotice("조별 TBM 일지, 현장 사진 및 근로자 등록이 저장되었습니다.", false);
    } catch (err: any) {
      setNotice(
        (err?.message || "전송 중 오류가 발생했습니다.") +
          " 입력하신 내용은 유지되니 [다시 시도]를 눌러 주세요.",
        true
      );
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

function handleContinueNextWorker() {
    setSubmittedDone(false);
    setNotice("", false);
    setCanRetry(false);
    clearPhotos();
    setDailyHazard("");
    setWorkerName("");
    setWorkerSelectedRules([]);
    clearCanvas();
    openBatchSignatureModal();
  }

  function handleResetAll() {
    setSubmittedDone(false);
    setNotice("", false);
    setCanRetry(false);
setLeader("");
    setHealthStatus("이상없음");
    setDailyHazard("");
    clearPhotos();
    setWorkerEntries([]);
    setWorkerName("");
    setIndividualScheduled(true);
    setWorkerSelectedRules([]);
    clearCanvas();
    setBatchModalOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="mobile">
      <div className="row" style={{ gap: 8, marginBottom: 10 }}>
        <Link href="/tbm/regular" className="btn secondary">
          ← 정기 TBM
        </Link>
        <Link href="/tbm-main" className="btn secondary">
          TBM 메뉴
        </Link>
      </div>

      <div className="mobilehero">
        <div style={{ fontSize: 12, opacity: 0.8 }}>DONG-A STEEL · LEADER</div>
        <h1>조장등록 (조별 TBM 사진 제출)</h1>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          교육자료 확인 · 사진 첨부 · 개별진행 / 한꺼번에 진행
        </div>
      </div>

      {selectedWeekObj && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
          }}
        >
          <div className="row between" style={{ marginBottom: 6 }}>
            <b style={{ fontSize: 13.5, color: "#1e3a8a" }}>
              금주 교육자료 · {selectedWeekObj.week_label}
            </b>
            <span className="pill ok" style={{ fontSize: 11.5 }}>
              교육 진행용
            </span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>
            {selectedWeekObj.topic}{" "}
            {selectedWeekObj.title ? `— ${selectedWeekObj.title}` : ""}
          </div>
          {selectedWeekObj.content && (
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.6,
                color: "#334155",
              }}
            >
              {selectedWeekObj.content}
            </div>
          )}
        </div>
      )}

      <div className="card">
        {!configured && (
          <p className="muted">Supabase 연결 후 사용할 수 있습니다.</p>
        )}
        <div className="field">
          <label>교육 회차</label>
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="">회차 선택</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.week_label} · {w.topic}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>소속 회사</label>
          <select
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              setTeam("");
              setWorkerSelectedRules([]);
            }}
          >
            <option value="">회사 선택</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>소속 조</label>
          <select
            value={team}
            onChange={(e) => {
              setTeam(e.target.value);
              setWorkerSelectedRules([]);
            }}
          >
            <option value="">조 선택</option>
            {orderedTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {week && company && team && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              padding: 12,
              marginTop: 12,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <b style={{ fontSize: 13.5, color: "#166534" }}>
                우리 조 서명/개별진행 현황 ({submittedWorkers.length}명)
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
                {submittedWorkers.map((w, idx) => {
                  const isPending =
                    w.is_individual_scheduled || w.status === "개별진행";
                  return (
                    <span
                      key={w.id}
                      style={{
                        background: "#fff",
                        border: isPending
                          ? "1px solid #fcd34d"
                          : "1px solid #86efac",
                        color: isPending ? "#b45309" : "#15803d",
                        borderRadius: 999,
                        padding: "3px 10px",
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      {idx + 1}. {w.worker_name}{" "}
                      {isPending ? "(개별진행)" : "✓"}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "#4b5563" }}>
                아직 등록된 조원 내역이 없습니다.
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label>제출자(조장) 이름</label>
          <input
            className="input"
            value={leader}
            onChange={(e) => setLeader(e.target.value)}
            placeholder="이름 입력"
          />
        </div>

        <div className="field">
          <label>작업자 건강 및 보호구 상태 점검</label>
          <select
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value)}
          >
            <option value="이상없음">
              전원 이상없음 (보호구 착용 및 건강 양호)
            </option>
            <option value="보호구 보완 조치 완료">
              보호구 미비자 보완 조치 후 작업 투입
            </option>
            <option value="건강 이상자 작업 조정">
              건강 이상자(음주·피로 등) 작업 제외/조정
            </option>
          </select>
        </div>

        <div className="field">
          <label>금주 중점 위험요인 및 안전대책 (한 줄 요약)</label>
          <input
            className="input"
            value={dailyHazard}
            onChange={(e) => setDailyHazard(e.target.value)}
            placeholder="예: 크레인 인양 하부 출입 통제 및 전선 피복 점검"
          />
        </div>

<div className="field">
          <label>TBM 실시 사진 (여러 장 선택 가능)</label>
          <div className="upload">
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
            />
            <p className="muted">
              {files.length > 0
                ? `총 ${files.length}장 선택됨 (사진을 추가하거나 우측 상단 ×로 삭제 가능)`
                : "현장에서 사진을 촬영하거나 여러 장 선택해 주세요."}
            </p>
          </div>

          {previewUrls.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 8,
                marginTop: 10,
              }}
            >
              {previewUrls.map((url, idx) => (
                <div
                  key={url}
                  style={{
                    position: "relative",
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid #cbd5e1",
                    aspectRatio: "1 / 1",
                    background: "#f8fafc",
                  }}
                >
                  <img
                    src={url}
                    alt={`첨부 미리보기 ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`사진 ${idx + 1} 삭제`}
                    onClick={() => handleRemovePhoto(idx)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(15, 23, 42, 0.78)",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: "bold",
                      lineHeight: "24px",
                      textAlign: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 기본: 개별진행 상태 안내 + [한꺼번에 진행] 서명 창 열기 */}
        <div
          style={{
            marginTop: 14,
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              근로자 진행 방식
            </div>
            <span className="pill ok" style={{ fontSize: 11.5 }}>
              {workerEntries.length > 0
                ? `합동 서명 ${workerEntries.length}명 준비됨`
                : "기본: 개별진행"}
            </span>
          </div>

          <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 10px 0", lineHeight: 1.5 }}>
            기본값은 <b>개별진행</b>이며, 근로자가 직접 접속해 확인·서명합니다. 현장에서 조원 서명을 한꺼번에 받을 때만 아래 버튼을 눌러 창을 여세요.
          </p>

          <button
            type="button"
            className="btn secondary"
            style={{
              width: "100%",
              background: "#eff6ff",
              borderColor: "#93c5fd",
              color: "#1e3a8a",
              fontWeight: 700,
            }}
            onClick={openBatchSignatureModal}
          >
            한꺼번에 진행 (이름 · 안전수칙 · 서명 창 열기)
          </button>

          {workerEntries.length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {workerEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <b>
                      {idx + 1}. {entry.worker_name}
                    </b>{" "}
                    <span
                      className={`pill ${
                        entry.individual_scheduled ? "wait" : "ok"
                      }`}
                      style={{ fontSize: 11.5, marginLeft: 4 }}
                    >
                      {entry.individual_scheduled
                        ? "개별진행 예정"
                        : `서명 완료 · 수칙 ${entry.selected_rules.length}개`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "3px 8px", fontSize: 11.5 }}
                    onClick={() => removeWorkerEntry(entry.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn"
          style={{ width: "100%" }}
          onClick={upload}
          disabled={submitting}
        >
          {submitting ? "제출 중..." : "사진 및 근로자 등록 제출"}
        </button>

        {msg && (
          <div style={{ marginTop: 10, textAlign: "center" }}>
            <p
              className="muted"
              style={{
                color: isErrorMsg || canRetry ? "#dc2626" : undefined,
                fontWeight: isErrorMsg || canRetry ? "bold" : undefined,
                marginBottom: canRetry ? 8 : 0,
              }}
            >
              {msg}
            </p>
            {canRetry && (
              <button
                type="button"
                className="btn"
                style={{
                  background: "#dc2626",
                  borderColor: "#dc2626",
                  padding: "8px 16px",
                }}
                onClick={upload}
                disabled={submitting}
              >
                {submitting ? "재전송 중..." : "다시 시도"}
              </button>
            )}
          </div>
        )}

        {submittedDone && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn secondary"
              style={{ flex: 1 }}
              onClick={handleContinueNextWorker}
            >
              다른 조원 이어서 등록
            </button>
            <button
              type="button"
              className="btn secondary"
              style={{ flex: 1 }}
              onClick={handleResetAll}
            >
              처음부터 다시
            </button>
          </div>
        )}
      </div>

      {/* 한꺼번에 진행 (이름 · 안전수칙 체크 · 서명) 전용 모달 */}
      {batchModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            zIndex: 999,
            overflowY: "auto",
            padding: 14,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              margin: "12px auto",
              background: "#fff",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 10,
                marginBottom: 12,
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  한꺼번에 진행 (조원 서명 등록)
                </h3>
                <div className="muted" style={{ fontSize: 12 }}>
                  이름 입력 → 안전수칙 {minRequiredRules}개 이상 선택 → 서명 후 명단 추가
                </div>
              </div>
              <button
                type="button"
                className="btn secondary"
                style={{ padding: "5px 10px", fontSize: 12 }}
                onClick={closeBatchSignatureModal}
              >
                닫기
              </button>
            </div>

            <div className="field" style={{ marginTop: 0 }}>
              <label>근로자 이름</label>
              <input
                className="input"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                placeholder="근로자 이름 입력"
              />
            </div>

            {applicableRules.length > 0 && (
              <div
                style={{
                  background: "#eff6ff",
                  border: "1.5px solid #93c5fd",
                  borderRadius: 10,
                  padding: 11,
                  marginTop: 10,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <b style={{ fontSize: 13, color: "#1e3a8a" }}>
                    [{currentProcess} 공정] 위험요인·중점 안전수칙 선택
                  </b>
                  <span
                    className={`pill ${
                      workerSelectedRules.length >= minRequiredRules ? "ok" : "wait"
                    }`}
                    style={{ fontSize: 11 }}
                  >
                    {workerSelectedRules.length}개 선택 (최소 {minRequiredRules}개)
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#1d4ed8", margin: "0 0 8px 0" }}>
                  근로자 본인이 확인한 위험요인·안전수칙을{" "}
                  <b>{minRequiredRules}개 이상</b> 선택해 주세요.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {applicableRules.map((rule) => {
                    const checked = workerSelectedRules.includes(rule.rule_text);
                    return (
                      <label
                        key={rule.id}
                        className="checkrow"
                        style={{
                          margin: 0,
                          padding: "7px 9px",
                          borderRadius: 8,
                          border: checked
                            ? "1.5px solid #2563eb"
                            : "1px solid #cbd5e1",
                          background: checked ? "#dbeafe" : "#fff",
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          alignItems: "flex-start",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            toggleWorkerRule(rule.rule_text, e.target.checked)
                          }
                          style={{ marginTop: 2 }}
                        />
                        <span>{rule.rule_text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="field" style={{ marginTop: 10, marginBottom: 10 }}>
              <label>근로자 서명</label>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={120}
                  style={{
                    width: "100%",
                    height: 120,
                    touchAction: "none",
                    display: "block",
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    서명란에 서명해 주세요
                  </span>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={clearCanvas}
                  >
                    지우기
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{ width: "100%" }}
              onClick={addWorkerEntry}
            >
              + 근로자 명단에 추가
            </button>

            {modalMsg && (
              <p
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  fontSize: 12.5,
                  textAlign: "center",
                  color: modalMsg.includes("추가되었습니다") ? "#15803d" : "#dc2626",
                  fontWeight: 700,
                }}
              >
                {modalMsg}
              </p>
            )}

            {workerEntries.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  추가된 명단 ({workerEntries.length}명)
                </div>
                {workerEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 12.5,
                    }}
                  >
                    <div>
                      <b>
                        {idx + 1}. {entry.worker_name}
                      </b>{" "}
                      <span style={{ color: "#2563eb", fontSize: 11.5 }}>
                        (수칙 {entry.selected_rules.length}개 · 서명완료)
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "3px 8px", fontSize: 11.5 }}
                      onClick={() => removeWorkerEntry(entry.id)}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn secondary"
              style={{ width: "100%", marginTop: 12 }}
              onClick={closeBatchSignatureModal}
            >
              명단 확정 후 조장 화면으로 돌아가기
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
          제출을 완료하셨나요?
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 10px 0" }}>
          메인 홈 화면으로 돌아가 다른 메뉴를 이용할 수 있습니다.
        </p>
        <Link
          href="/"
          className="btn secondary"
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          홈으로
        </Link>
      </div>

      <div className="footer">
        사진에는 교육 참여 현장이 확인되도록 촬영해 주세요.
      </div>
    </main>
  );
}

export default function LeaderPage() {
  return (
    <Suspense
      fallback={
        <main className="mobile">
          <div className="card">조장 페이지를 불러오는 중...</div>
        </main>
      }
    >
      <LeaderForm />
    </Suspense>
  );
}