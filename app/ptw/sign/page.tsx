"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type PtwInfo = {
  id: string;
  company_type: string;
  company_name: string | null;
  companies?: { name: string } | null;
  project_name: string;
  work_location: string;
  work_date: string;
  starts_at: string;
  ends_at: string;
  fire_work_details?: Record<string, any>;
  ptw_signatures?: { id: string; worker_name: string; worker_type: string }[];
};

const PLEDGE_ITEMS = [
  "1. 도급공사 관련 작업허가신청서를 작성·제출하여 공장장의 승인을 득한 후 작업한다.",
  "2. 작업자에 필요한 안전보건교육을 실시 후 작업한다.",
  "3. 작업현장 내 작업 시 보호구(안전헬멧, 안전화) 착용하여 작업한다.",
  "4. 고소작업, 전기작업, 화기작업(용접, 절단 등)의 안전수칙 준수하여 작업한다.",
  "5. 작업 전에는 반드시 작업준비 상태를 점검 및 위험예지훈련(TBM)을 실시한다.",
  "6. 작업현장 내 모든 위험작업의 수행은 위험성평가를 실시한 후 작업한다.",
  "7. 사다리 작업 시 최상부에는 올라가서 작업하지 않는다.",
  "8. 작업현장에 대한 안전점검을 실시하고 안전점검표 작성·보관한다.",
  "9. 밀폐공간출입, 중량물 취급, 굴착작업은 안전수칙을 준수하여 작업한다.",
  "10. 중장비 사용 시 사용승인을 받고, 신호수 배치하여 작업한다.",
  "11. 작업현장 내 작업 시 안전장치나 안전시설물은 임의로 해체하지 않는다.",
  "12. 작업현장 정리정돈 철저, 흡연구역 이외의 흡연행위 금지한다.",
  "13. 작업 시 산업안전보건법, 중대재해처벌법 등 기타 관련법규를 준수하여 작업한다.",
  "14. 안전보건공단에서 Guide하는 안전수칙 준수한다.",
  "15. 귀사 안전·보건에 관한 요구사항 준수하여 이행한다.",
  "16. 상기 내용을 지키지 않을 경우 작업을 중지한다.",
];

function WorkerSignForm() {
  const searchParams = useSearchParams();
  const ptwId = searchParams.get("id") || "";

  const [item, setItem] = useState<PtwInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signType, setSignType] = useState("근로자");
  const [signName, setSignName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  async function loadPtw() {
    if (!configured || !ptwId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("ptw_applications")
      .select("id, company_type, company_name, companies(name), project_name, work_location, work_date, starts_at, ends_at, fire_work_details, ptw_signatures(id, worker_name, worker_type)")
      .eq("id", ptwId)
      .maybeSingle();

    if (error || !data) {
      setMsg("해당 안전작업허가서 정보를 찾을 수 없습니다.");
    } else {
      setItem(data as unknown as PtwInfo);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPtw();
  }, [ptwId]);

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

  async function handleSubmit() {
    if (!item) return;
    if (!signName.trim()) {
      alert("성명을 입력해 주세요.");
      return;
    }
    if (!hasDrawn || !canvasRef.current) {
      alert("서명란에 서명을 해 주세요.");
      return;
    }
    setSaving(true);
    setMsg("");
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const { error } = await supabase.from("ptw_signatures").insert({
      ptw_id: item.id,
      worker_type: signType,
      worker_name: signName.trim(),
      signature_data: dataUrl,
    });
    if (error) {
      setMsg("서명 저장 오류: " + error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setDone(true);
    loadPtw();
  }

  function resetForNextWorker() {
    setSignName("");
    setSignType("근로자");
    setDone(false);
    setHasDrawn(false);
    setTimeout(() => clearCanvas(), 50);
  }

  if (loading) {
    return (
      <main className="mobile">
        <div className="card">허가서 정보를 불러오는 중...</div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mobile">
        <div className="card">
          <p style={{ color: "#b91c1c", fontWeight: "bold" }}>{msg || "유효하지 않은 서명 링크입니다."}</p>
          <Link href="/ptw/status" className="btn secondary" style={{ marginTop: 12 }}>승인 현황으로 이동</Link>
        </div>
      </main>
    );
  }

  const companyName = item.company_type === "internal"
    ? (item.companies?.name || "협력사")
    : (item.company_name || "외부업체");

  return (
    <main className="mobile">
      <div className="mobilehero">
        <div style={{ fontSize: 12, opacity: 0.85 }}>DOSCO PTW SYSTEM</div>
        <h1>안전관리 준수 서약 및 서명</h1>
        <div style={{ fontSize: 13, opacity: 0.9 }}>작업 전 안전수칙 확인 및 전자서명</div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, lineHeight: 1.7 }}>
          <div><b>업체명:</b> {companyName}</div>
          <div><b>공사명:</b> {item.project_name}</div>
          <div><b>작업일시:</b> {item.work_date} ({item.starts_at?.slice(0, 5)} ~ {item.ends_at?.slice(0, 5)})</div>
          <div><b>작업장소:</b> {item.work_location || "-"}</div>
        </div>
      </div>

      {done ? (
        <div className="card section" style={{ textAlign: "center" }}>
          <div className="pill ok" style={{ marginBottom: 10 }}>서명 완료</div>
          <h2 style={{ margin: "8px 0" }}>{signName}님의 서명이 등록되었습니다.</h2>
          <p className="muted">안전수칙을 준수하여 안전하게 작업해 주시기 바랍니다.</p>
          <button type="button" className="btn secondary" style={{ width: "100%", marginTop: 14 }} onClick={resetForNextWorker}>
            다른 작업자 이어서 서명하기
          </button>
        </div>
      ) : (
        <div className="card section">
          <h3 style={{ marginTop: 0 }}>[안전관리 준수 서약서]</h3>
          <div style={{ background: "#f8f9fa", padding: 12, borderRadius: 8, fontSize: 12.5, lineHeight: 1.6, maxHeight: 180, overflowY: "auto", marginBottom: 14, border: "1px solid #ddd" }}>
            <b>상기 본인은 귀 작업장에서 작업하는 기간 중 본인의 관리책임 및 지휘·감독 근로자의 불안전행동 또는 귀사에서 요구하는 준수사항 위반으로 발생되는 제반사고에 대하여 본인이 일체의 책임을 지겠으며, 아울러 안전사고 예방을 위해 아래사항을 성실히 이행할 것을 서약합니다.</b>
            <br />
            {PLEDGE_ITEMS.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>

          <div className="field" style={{ display: "flex", gap: 8 }}>
            <select className="input" value={signType} onChange={e => setSignType(e.target.value)} style={{ width: 105 }}>
              <option value="대표자">대표자</option>
              <option value="근로자">근로자</option>
            </select>
            <input
              className="input"
              placeholder="본인 성명 입력"
              value={signName}
              onChange={e => setSignName(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fafafa", marginTop: 12, marginBottom: 14 }}>
            <canvas
              ref={canvasRef}
              width={360}
              height={160}
              style={{ width: "100%", height: 160, touchAction: "none", display: "block" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderTop: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>위 칸에 손가락으로 정자 서명해 주세요</span>
              <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={clearCanvas}>
                지우기
              </button>
            </div>
          </div>

          <button type="button" className="btn" style={{ width: "100%", padding: 14, fontSize: 15 }} onClick={handleSubmit} disabled={saving}>
            {saving ? "등록 중..." : "서약 동의 및 서명 제출"}
          </button>
          {msg && <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{msg}</p>}
        </div>
      )}

      {(item.ptw_signatures || []).length > 0 && (
        <div className="card section">
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 6 }}>
            현재 서명 완료 인원 ({item.ptw_signatures!.length}명)
          </div>
          <div style={{ fontSize: 12.5, color: "#475569" }}>
            {item.ptw_signatures!.map(s => `${s.worker_name}(${s.worker_type})`).join(", ")}
          </div>
        </div>
      )}
    </main>
  );
}

export default function PtwSignPage() {
  return (
    <Suspense fallback={<main className="mobile"><div className="card">불러오는 중...</div></main>}>
      <WorkerSignForm />
    </Suspense>
  );
}