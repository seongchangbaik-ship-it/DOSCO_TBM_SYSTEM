"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type SpotLogInfo = {
  id: string;
  work_date: string;
  work_category: string;
  work_title: string;
  leader_name: string;
  hazard_factors: string;
  safety_measures: string;
  companies?: { name: string } | null;
  teams?: { name: string } | null;
  tbm_spot_signatures?: { id: string; worker_name: string }[];
};

function SpotWorkerSignForm() {
  const searchParams = useSearchParams();
  const spotId = searchParams.get("id") || "";

  const [item, setItem] = useState<SpotLogInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [signName, setSignName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  async function loadSpot() {
    if (!configured || !spotId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("tbm_spot_logs")
      .select("*, companies(name), teams(name), tbm_spot_signatures(id, worker_name)")
      .eq("id", spotId)
      .maybeSingle();

    if (error || !data) {
      setMsg("해당 수시 TBM 정보를 찾을 수 없습니다.");
    } else {
      setItem(data as unknown as SpotLogInfo);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSpot();
  }, [spotId]);

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
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const { error } = await supabase.from("tbm_spot_signatures").insert({
      spot_id: item.id,
      worker_name: signName.trim(),
      signature_data: dataUrl,
    });
    setSaving(false);
    if (error) {
      setMsg("서명 저장 오류: " + error.message);
      return;
    }
    setDone(true);
    loadSpot();
  }

  function resetNext() {
    setSignName("");
    setDone(false);
    setHasDrawn(false);
    setTimeout(() => clearCanvas(), 50);
  }

  if (loading) return <main className="mobile"><div className="card">불러오는 중...</div></main>;

  if (!item) {
    return (
      <main className="mobile">
        <div className="card">
          <p style={{ color: "#b91c1c", fontWeight: "bold" }}>{msg || "유효하지 않은 서명 링크입니다."}</p>
          <Link href="/tbm/status" className="btn secondary" style={{ marginTop: 10 }}>TBM 실시 현황으로 이동</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mobile">
      <div className="mobilehero" style={{ background: "linear-gradient(135deg, #0f766e, #115e59)" }}>
        <div style={{ fontSize: 12, opacity: 0.85 }}>DOSCO TBM SYSTEM</div>
        <h1>수시 작업 TBM 확인 서명</h1>
        <div style={{ fontSize: 13, opacity: 0.9 }}>{item.work_category} · {item.work_date}</div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
          <div><b>소속:</b> {item.companies?.name || "-"} / {item.teams?.name || "-"}</div>
          <div><b>작업명:</b> {item.work_title}</div>
          <div><b>책임자:</b> {item.leader_name}</div>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginTop: 10, fontSize: 12.5, whiteSpace: "pre-wrap" }}>
          <b>[핵심 위험요인]</b><br />{item.hazard_factors || "-"}<br /><br />
          <b>[안전대책]</b><br />{item.safety_measures || "-"}
        </div>
      </div>

      {done ? (
        <div className="card section" style={{ textAlign: "center" }}>
          <div className="pill ok" style={{ marginBottom: 10 }}>서명 완료</div>
          <h2 style={{ margin: "8px 0" }}>{signName}님의 TBM 서명이 등록되었습니다.</h2>
          <p className="muted">안전수칙을 준수하여 작업해 주시기 바랍니다.</p>
          <button type="button" className="btn secondary" style={{ width: "100%", marginTop: 12 }} onClick={resetNext}>
            다른 작업자 이어서 서명하기
          </button>
        </div>
      ) : (
        <div className="card section">
          <h3 style={{ marginTop: 0 }}>위 위험요인 및 안전대책을 숙지하였습니다</h3>
          <div className="field">
            <label>본인 성명</label>
            <input className="input" placeholder="성명 입력" value={signName} onChange={e => setSignName(e.target.value)} />
          </div>
          <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fafafa", marginTop: 10, marginBottom: 14 }}>
            <canvas
              ref={canvasRef}
              width={360}
              height={150}
              style={{ width: "100%", height: 150, touchAction: "none", display: "block" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 10px", borderTop: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>손가락으로 정자 서명해 주세요</span>
              <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={clearCanvas}>지우기</button>
            </div>
          </div>
          <button type="button" className="btn" style={{ width: "100%", padding: 14, background: "#0f766e", borderColor: "#0f766e" }} onClick={handleSubmit} disabled={saving}>
            {saving ? "등록 중..." : "TBM 내용 확인 및 서명 제출"}
          </button>
          {msg && <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{msg}</p>}
        </div>
      )}

      {(item.tbm_spot_signatures || []).length > 0 && (
        <div className="card section">
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>
            현재 서명 완료 인원 ({item.tbm_spot_signatures!.length}명)
          </div>
          <div style={{ fontSize: 12.5, color: "#475569" }}>
            {item.tbm_spot_signatures!.map(s => s.worker_name).join(", ")}
          </div>
        </div>
      )}
    </main>
  );
}

export default function SpotWorkerSignPage() {
  return (
    <Suspense fallback={<main className="mobile"><div className="card">불러오는 중...</div></main>}>
      <SpotWorkerSignForm />
    </Suspense>
  );
}