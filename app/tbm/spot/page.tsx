"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type Company = { id: string; name: string };
type Team = { id: string; name: string; company_id: string };

const WORK_PRESETS: Record<string, { titleExample: string; hazards: string; measures: string }> = {
  "R/C (롤 교체)": {
    titleExample: "예: P5 라인 조관기 롤 교체(R/C) 작업",
    hazards: "1. 크레인 롤 인양 중 낙하 및 하부 출입 위험\n2. 스탠드·롤 조립 및 체결 중 손·발 협착\n3. 스패너·유압공구 미끄러짐 및 전도",
    measures: "1. 인양 반경 내 출입통제 및 유도자(신호수) 배치\n2. 맨손 접촉 금지, 유도로프 및 안전고임목 사용\n3. 작업 전 설비 전원 차단(LOTO) 및 보호구 완전 착용",
  },
  "설비 정비": {
    titleExample: "예: SL2 절단기 유압라인 점검 및 부품 교체",
    hazards: "1. 설비 불시 가동으로 인한 끼임·협착 위험\n2. 잔압·고온 유체 분출 및 화상\n3. 협소 공간 작업 중 부딪힘·추락",
    measures: "1. 메인 전원 차단 후 잠금장치(LOTO) 및 조작금지 표지판 부착\n2. 배관 잔압 완전 제거 확인 후 해체 작업 실시\n3. 2인 1조 작업 및 안전모·보안면 착용",
  },
  "크레인·중량물 인양": {
    titleExample: "예: 코일 및 대형 자재 크레인 상·하차 작업",
    hazards: "1. 줄걸이 용구(와이어·샤클) 파단 및 편하중 낙하\n2. 중량물 흔들림에 의한 충돌 및 협착",
    measures: "1. 작업 전 와이어로프·샤클 손상 여부 점검 및 2줄 걸이 준수\n2. 지면 10cm 인양 후 중심 확인 및 인양물 하부 출입 절대 금지",
  },
  "돌발 조치": {
    titleExample: "예: 라인 트러블 긴급 복구 및 이물질 제거",
    hazards: "1. 급한 복구 과정에서 안전절차 생략 및 설비 오작동\n2. 날카로운 강판·버(Burr)에 의한 베임·찔림",
    measures: "1. 반드시 설비 완전 정지 및 운전실 통보 후 진입\n2. 베임방지장갑·안전화 착용 및 2인 1조 감시 하 작업",
  },
  "기타 작업": {
    titleExample: "예: 현장 환경정비 및 기타 수시 작업",
    hazards: "1. 이동 통로 전도 및 주변 가동 설비 접촉\n2. 수공구·전동공구 취급 부주의",
    measures: "1. 작업구역 정리정돈 및 주변 설비 간섭 여부 사전 확인\n2. 표준 보호구 착용 및 작업 전 안전수칙 공유",
  },
};

export default function SpotTbmCreatePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const todayYmd = new Date().toISOString().slice(0, 10);
  const [companyId, setCompanyId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [workDate, setWorkDate] = useState(todayYmd);
  const [workCategory, setWorkCategory] = useState("R/C (롤 교체)");
  const [workTitle, setWorkTitle] = useState("");
  const [leaderName, setLeaderName] = useState("");
const [healthStatus, setHealthStatus] = useState("전원 이상없음 (보호구 착용 및 건강 양호)");
  const [hazardFactors, setHazardFactors] = useState(WORK_PRESETS["R/C (롤 교체)"].hazards);
  const [safetyMeasures, setSafetyMeasures] = useState(WORK_PRESETS["R/C (롤 교체)"].measures);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const [signatures, setSignatures] = useState<{ name: string; data: string }[]>([]);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signName, setSignName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [createdSpotId, setCreatedSpotId] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState("");
  const [msg, setMsg] = useState("");
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    if (!configured) return;
    Promise.all([
      supabase.from("companies").select("id,name").eq("active", true),
      supabase.from("teams").select("id,name,company_id").eq("active", true),
    ]).then(([c, t]) => {
      const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];
      const sorted = (c.data || []).sort(
        (a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name)
      );
      setCompanies(sorted);
      setTeams(t.data || []);
    });
  }, []);

  const selectedCompany = companies.find(c => c.id === companyId);
  const teamOrder: Record<string, string[]> = {
    "동아스틸": ["전기파트", "품질파트", "기타부서"],
    "다인스틸": ["P5", "P9", "P10"],
    "나로스틸": ["C1", "P1", "P7", "P8"],
    "세현스틸": ["SL2", "SL5", "SCP1", "SCP2", "1공무", "2공무", "1품질", "2품질"],
    "에스로지스": ["1출하", "2출하"],
  };
  const orderedTeams = teams
    .filter(t => t.company_id === companyId)
    .sort((a, b) => {
      const order = selectedCompany ? teamOrder[selectedCompany.name] : undefined;
      if (!order) return a.name.localeCompare(b.name);
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  function selectCategory(cat: string) {
    setWorkCategory(cat);
    const preset = WORK_PRESETS[cat];
    if (preset) {
      setHazardFactors(preset.hazards);
      setSafetyMeasures(preset.measures);
    }
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
        if (!ctx) { resolve(rawFile); return; }
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
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(rawFile); };
      img.src = objectUrl;
    });
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
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
    if (!isDrawing || !canvasRef.current) return;
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

  function saveLocalSignature() {
    if (!signName.trim()) {
      alert("작업자 성명을 입력해 주세요.");
      return;
    }
    if (!hasDrawn || !canvasRef.current) {
      alert("서명란에 서명을 해 주세요.");
      return;
    }
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatures([...signatures, { name: signName.trim(), data: dataUrl }]);
    setSignName("");
    setHasDrawn(false);
    clearCanvas();
  }

function handlePhotoFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;

    const newUrls = picked.map((f) => URL.createObjectURL(f));
    setPhotoFiles((prev) => [...prev, ...picked]);
    setPhotoPreviewUrls((prev) => [...prev, ...newUrls]);
    setMsg("");
    setPhotoInputKey((k) => k + 1);
  }

  function handleRemovePhotoFile(index: number) {
    setPhotoPreviewUrls((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, idx) => idx !== index);
    });
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit() {
    if (submitting) return;
    setMsg("");
    setCanRetry(false);

    if (!companyId || !teamId) {
      setMsg("소속 회사와 소속 조를 선택해 주세요.");
      return;
    }
    if (!workTitle.trim() || !leaderName.trim()) {
      setMsg("작업명(설비/내용)과 작성자(작업책임자) 성명을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadedPaths: string[] = [];

      for (let i = 0; i < photoFiles.length; i++) {
        const currentFile = photoFiles[i];
        const compressed = await compressImage(currentFile);
        const isJpeg = compressed !== currentFile;
        const ext = isJpeg ? "jpg" : (currentFile.name.split(".").pop() || "jpg");
        const path = `spot-tbm/${workDate}/${crypto.randomUUID()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("tbm-photos").upload(path, compressed, {
          contentType: isJpeg ? "image/jpeg" : currentFile.type,
        });
        if (upErr) {
          throw new Error(`사진(${i + 1}번째) 업로드 실패: ` + upErr.message);
        }
        uploadedPaths.push(path);
      }

      const photoPath: string | null = uploadedPaths[0] || null;

      const { data: spotData, error } = await supabase
        .from("tbm_spot_logs")
        .insert({
          company_id: companyId,
          team_id: teamId,
          work_date: workDate,
          work_category: workCategory,
          work_title: workTitle.trim(),
          leader_name: leaderName.trim(),
          health_status: healthStatus,
          hazard_factors: hazardFactors,
          safety_measures: safetyMeasures,
          photo_path: photoPath,
          photo_paths: uploadedPaths,
        })
        .select("id")
        .single();

      if (error || !spotData) {
        throw new Error("등록 오류: " + (error?.message || "저장 실패"));
      }

      if (signatures.length > 0) {
        const { error: sigErr } = await supabase.from("tbm_spot_signatures").insert(
          signatures.map(s => ({
            spot_id: spotData.id,
            worker_name: s.name,
            signature_data: s.data,
          }))
        );
        if (sigErr) {
          throw new Error("서명 저장 오류: " + sigErr.message);
        }
      }

      setCreatedSpotId(spotData.id);
    } catch (err: any) {
      setMsg(
        (err?.message || "저장 중 통신 오류가 발생했습니다.") +
          " 입력하신 내용은 그대로 유지되니 [다시 시도]를 눌러 주세요."
      );
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyShareLink() {
    if (!createdSpotId) return;
    const shareUrl = `${window.location.origin}/tbm/spot/sign?id=${createdSpotId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyMsg("서명 링크가 복사되었습니다! 현장 카톡방에 붙여넣어 동료들에게 공유해 주세요.");
    } catch {
      window.prompt("아래 링크를 복사해 카톡방에 공유해 주세요:", shareUrl);
    }
  }

  if (createdSpotId) {
    return (
      <main className="mobile">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="pill ok" style={{ marginBottom: 10 }}>수시 TBM 등록 완료</div>
          <h2 style={{ margin: "8px 0" }}>수시 작업 TBM 일지가 등록되었습니다.</h2>
          <p className="muted" style={{ fontSize: 13.5 }}>
            함께 작업하는 동료들이 각자 스마트폰으로 서명해야 한다면 아래 링크를 카톡방에 공유해 주세요.
          </p>

          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, marginTop: 16, marginBottom: 16 }}>
            <button type="button" className="btn" style={{ width: "100%" }} onClick={copyShareLink}>
              동료 서명 링크 복사 (카톡방 공유)
            </button>
            {copyMsg && <p style={{ fontSize: 12.5, color: "#15803d", fontWeight: 600, marginTop: 8, marginBottom: 0 }}>{copyMsg}</p>}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/tbm/status" className="btn secondary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
              TBM 실시 현황 보기
            </Link>
            <Link href="/tbm" className="btn secondary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
              TBM 메인으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mobile">
            <div className="row between" style={{ marginBottom: 10 }}>
        <Link href="/tbm-main" className="btn secondary">
          ← TBM 메뉴
        </Link>
        <Link href="/tbm/status" className="btn secondary">
          실시 현황 보기 →
        </Link>
      </div>
      <div className="mobilehero" style={{ background: "linear-gradient(135deg, #0f766e, #115e59)" }}>
        <div className="row between"><span style={{ fontSize: 12, opacity: 0.85 }}>DOSCO TBM SYSTEM</span>
        </div>
        <h1>수시 작업 TBM 작성</h1>
        <div style={{ fontSize: 13, opacity: 0.9 }}>R/C(롤 교체) · 설비 정비 · 돌발작업 전 현장 TBM</div>
      </div>

      {/* 1. 작업 유형 선택 */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>1. 작업 구분 선택 (위험요인 자동입력)</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.keys(WORK_PRESETS).map(cat => (
            <button
              key={cat}
              type="button"
              className="btn secondary"
              onClick={() => selectCategory(cat)}
              style={{
                background: workCategory === cat ? "#0f766e" : "#fff",
                color: workCategory === cat ? "#fff" : "#1e293b",
                borderColor: workCategory === cat ? "#0f766e" : "#cbd5e1",
                fontWeight: "bold",
                fontSize: 13,
                padding: "8px 12px",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 기본 정보 및 위험요인 */}
      <div className="card section">
        <h3 style={{ marginTop: 0 }}>2. 작업 정보 및 위험요인 점검</h3>

        <div className="field">
          <label>작업 일자</label>
          <input type="date" className="input" value={workDate} onChange={e => setWorkDate(e.target.value)} />
        </div>

        <div className="field">
          <label>소속 회사</label>
          <select value={companyId} onChange={e => { setCompanyId(e.target.value); setTeamId(""); }}>
            <option value="">회사 선택</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>소속 조 (라인)</label>
          <select value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">조 선택</option>
            {orderedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>작업명 (설비명 및 작업내용)</label>
          <input
            className="input"
            value={workTitle}
            onChange={e => setWorkTitle(e.target.value)}
            placeholder={WORK_PRESETS[workCategory]?.titleExample || "작업명 입력"}
          />
        </div>

        <div className="field">
          <label>작성자 (작업책임자 / 조장)</label>
          <input className="input" value={leaderName} onChange={e => setLeaderName(e.target.value)} placeholder="성명 입력" />
        </div>

        <div className="field">
          <label>작업자 건강 및 보호구 상태</label>
          <select value={healthStatus} onChange={e => setHealthStatus(e.target.value)}>
            <option value="전원 이상없음 (보호구 착용 및 건강 양호)">전원 이상없음 (보호구 착용 및 건강 양호)</option>
            <option value="보호구 보완 조치 후 투입">보호구 보완 조치 후 투입</option>
            <option value="건강 이상자 작업 제외·조정">건강 이상자 작업 제외·조정</option>
          </select>
        </div>

        <div className="field">
          <label>핵심 유해·위험요인 (수정 가능)</label>
          <textarea value={hazardFactors} onChange={e => setHazardFactors(e.target.value)} style={{ height: 95 }} />
        </div>

        <div className="field">
          <label>안전대책 및 준수사항 (수정 가능)</label>
          <textarea value={safetyMeasures} onChange={e => setSafetyMeasures(e.target.value)} style={{ height: 95 }} />
        </div>

<div className="field">
          <label>현장 TBM 실시 사진 (선택 · 여러 장 가능)</label>
          <div className="upload">
            <input
              key={photoInputKey}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoFilesChange}
            />
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {photoFiles.length > 0
                ? `총 ${photoFiles.length}장 선택됨 (사진 추가 또는 우측 상단 ×로 삭제 가능)`
                : "작업 전 인원 집합 또는 현장 사진을 촬영하거나 여러 장 선택하세요."}
            </p>
          </div>

          {photoPreviewUrls.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 8,
                marginTop: 10,
              }}
            >
              {photoPreviewUrls.map((url, idx) => (
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
                    alt={`현장 사진 미리보기 ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`현장 사진 ${idx + 1} 삭제`}
                    onClick={() => handleRemovePhotoFile(idx)}
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
      </div>

      {/* 3. 참여 작업자 전자서명 */}
      <div className="card section">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>3. 참여 작업자 서명 ({signatures.length}명)</h3>
          <button type="button" className="btn secondary" style={{ fontSize: 12.5 }} onClick={() => setShowSignModal(true)}>
            + 이 기기에서 서명 추가
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
          지금 이 폰으로 바로 연속 서명을 받거나, 먼저 등록한 뒤 카톡방 링크를 공유해 각자 폰으로 서명하게 할 수 있습니다.
        </p>

        {signatures.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {signatures.map((sig, idx) => (
              <div key={idx} style={{ position: "relative", border: "1px solid #cbd5e1", borderRadius: 8, padding: 6, width: 100, textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setSignatures(signatures.filter((_, i) => i !== idx))}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
                <img src={sig.data} alt="서명" style={{ width: "100%", height: 42, objectFit: "contain" }} />
                <div style={{ fontSize: 12, fontWeight: "bold" }}>{sig.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn"
        style={{ width: "100%", padding: 15, fontSize: 16, marginTop: 14, background: "#0f766e", borderColor: "#0f766e" }}
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "저장 중..." : "수시 작업 TBM 제출하기"}
      </button>

      {msg && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <p style={{ color: "#b91c1c", fontWeight: "bold", marginBottom: canRetry ? 8 : 0 }}>{msg}</p>
          {canRetry && (
            <button
              type="button"
              className="btn"
              style={{ background: "#dc2626", borderColor: "#dc2626", padding: "10px 18px" }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "재전송 중..." : "다시 시도"}
            </button>
          )}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Link href="/tbm" className="muted" style={{ fontSize: 13 }}>← 정기 TBM 화면으로 돌아가기</Link>
      </div>

      {/* 연속 서명 팝업 모달 */}
      {showSignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="card" style={{ width: "100%", maxWidth: 400 }}>
            <h3 style={{ marginTop: 0 }}>참여 작업자 연속 서명</h3>
            <div className="field">
              <label>작업자 성명</label>
              <input className="input" placeholder="이름 입력" value={signName} onChange={e => setSignName(e.target.value)} />
            </div>
            <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fafafa", marginTop: 10, marginBottom: 12 }}>
              <canvas
                ref={canvasRef}
                width={360}
                height={145}
                style={{ width: "100%", height: 145, touchAction: "none", display: "block" }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", borderTop: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>손가락으로 서명 후 [서명 등록] 클릭</span>
                <button type="button" className="btn secondary" style={{ padding: "3px 8px", fontSize: 12 }} onClick={clearCanvas}>지우기</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setShowSignModal(false)}>닫기</button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={saveLocalSignature}>서명 등록 (계속)</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}



