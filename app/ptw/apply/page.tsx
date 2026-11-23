"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

export default function PtwApplyPage() {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    companyType: "internal",
    companyId: "",
    companyName: "",
    projectName: "",
    siteManager: "",
    contact: "",
    location: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "08:00",
    endTime: "17:00",
    workerCount: "",
    workContent: "",
    safetyGear: "안전모, 안전화, 안전대",
    workTypes: [] as string[],
    trainingType: "form",
    trainingInstructor: "",
    trainingContent: "1. 작업장 주변 인화물질 제거\n2. 소화기 비치\n3. 작업 전 안전교육 실시",
  });

  const [trainingPhoto, setTrainingPhoto] = useState<File | null>(null);
  const [signatures, setSignatures] = useState<{ name: string; type: string; data: string }[]>([]);

  const [showSignModal, setShowSignModal] = useState(false);
  const [signName, setSignName] = useState("");
  const [signType, setSignType] = useState("근로자");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const ALL_WORK_TYPES = [
    "일반작업", "화기작업", "제한공간(밀폐)작업", "고소작업",
    "중량물취급작업", "페인트작업", "굴착작업", "전기작업"
  ];

  useEffect(() => {
    if (configured) {
      supabase.from("companies").select("id,name").eq("active", true).order("name")
        .then(({ data }) => {
          if (data) setCompanies(data);
        });
    }
  }, []);

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
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = () => {
    if (!signName.trim()) return alert("이름을 입력하세요.");
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatures([...signatures, { name: signName.trim(), type: signType, data: dataUrl }]);
    setShowSignModal(false);
    setSignName("");
  };

  async function submitPtw() {
    if (form.companyType === "internal" && !form.companyId) return setMsg("협력사를 선택하세요.");
    if (form.companyType === "external" && !form.companyName.trim()) return setMsg("외부업체명을 입력하세요.");
    if (!form.projectName.trim() || !form.siteManager.trim() || !form.workContent.trim()) {
      return setMsg("필수 항목(공사명, 책임자, 작업내용)을 입력하세요.");
    }
    if (form.workTypes.length === 0) return setMsg("작업 종류를 1개 이상 선택하세요.");
    if (signatures.length === 0) return setMsg("최소 1명 이상의 서약 및 교육 서명이 필요합니다.");

    setIsSubmitting(true);
    setMsg("허가서를 전송하고 있습니다...");

    let photoPath = null;
    if (form.trainingType === "photo" && trainingPhoto) {
      const safeName = trainingPhoto.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      photoPath = `ptw-training/${crypto.randomUUID()}-${safeName}`;
      await supabase.storage.from("tbm-photos").upload(photoPath, trainingPhoto);
    }

    const { data: ptwData, error: ptwError } = await supabase.from("ptw_applications").insert({
      company_type: form.companyType,
      company_id: form.companyType === "internal" ? form.companyId : null,
      company_name: form.companyType === "external" ? form.companyName : null,
      project_name: form.projectName,
      site_manager: form.siteManager,
      contact_number: form.contact,
      work_location: form.location,
      work_date: form.date,
      starts_at: form.startTime,
      ends_at: form.endTime,
      worker_count: parseInt(form.workerCount) || signatures.length,
      work_content: form.workContent,
      safety_gear: form.safetyGear,
      work_types: form.workTypes,
      training_type: form.trainingType,
      training_instructor: form.trainingInstructor,
      training_content: form.trainingContent,
      training_photo_path: photoPath
    }).select("id").single();

    if (ptwError || !ptwData) {
      setMsg("오류 발생: " + (ptwError?.message || "저장 실패"));
      setIsSubmitting(false);
      return;
    }

    const sigInserts = signatures.map(sig => ({
      ptw_id: ptwData.id,
      worker_type: sig.type,
      worker_name: sig.name,
      signature_data: sig.data
    }));

    await supabase.from("ptw_signatures").insert(sigInserts);

    setSubmitted(true);
    setIsSubmitting(false);
  }

  if (submitted) {
    return (
      <main className="shell" style={{ maxWidth: 600, paddingTop: 40, textAlign: "center" }}>
        <div className="card">
          <div className="pill ok" style={{ display: "inline-block", marginBottom: 16 }}>신청 완료</div>
          <h2>안전작업허가서가 제출되었습니다.</h2>
          <p className="muted">관리자 승인 후 작업이 가능합니다.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <Link href="/ptw" className="btn secondary">허가서 메인으로</Link>
            <Link href="/" className="btn">전체 홈으로</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div>
      <header className="topbar">
        <div className="brand">DOSCO PTW SYSTEM<small>안전작업허가서 신청</small></div>
        <nav className="nav">
          <Link href="/ptw">허가서 메인</Link>
          <Link href="/">전체 홈</Link>
        </nav>
      </header>
      <main className="shell" style={{ maxWidth: 700 }}>

        <div className="pagehead" style={{ marginBottom: 16 }}>
          <h1>안전작업허가서 (일반)</h1>
          <p className="muted">아래 항목을 빠짐없이 입력해 주세요.</p>
        </div>

        <div className="card section">
          <h3>1. 기본 정보</h3>

          <div className="formgrid">
            <div className="field">
              <label>업체 구분</label>
              <select value={form.companyType} onChange={e => setForm({ ...form, companyType: e.target.value })}>
                <option value="internal">기존 협력사</option>
                <option value="external">외부업체 (직접입력)</option>
              </select>
            </div>

            <div className="field">
              <label>업체명</label>
              {form.companyType === "internal" ? (
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">협력사 선택</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="외부업체명 입력" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              )}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>공사명 (또는 작업명)</label>
              <input className="input" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} />
            </div>

            <div className="field">
              <label>현장 책임자(신청자)</label>
              <input className="input" value={form.siteManager} onChange={e => setForm({ ...form, siteManager: e.target.value })} />
            </div>
            <div className="field">
              <label>책임자 연락처</label>
              <input className="input" type="tel" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            </div>
          </div>

          <div className="formgrid" style={{ marginTop: 16 }}>
            <div className="field">
              <label>작업 위치 (설비명/라인)</label>
              <input className="input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="field">
              <label>작업 인원 (명)</label>
              <input type="number" className="input" placeholder="예: 3" value={form.workerCount} onChange={e => setForm({ ...form, workerCount: e.target.value })} />
            </div>
          </div>

          <div className="formgrid" style={{ marginTop: 16 }}>
            <div className="field">
              <label>작업 일자</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field" style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label>시작 시간</label>
                <input type="time" className="input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label>종료 시간</label>
                <input type="time" className="input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label>안전보호장구</label>
            <input className="input" value={form.safetyGear} onChange={e => setForm({ ...form, safetyGear: e.target.value })} />
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label>상세 작업 내용</label>
            <textarea value={form.workContent} onChange={e => setForm({ ...form, workContent: e.target.value })} style={{ height: 80 }} />
          </div>
        </div>

        <div className="card section">
          <h3>2. 작업 종류 선택 (다중 선택 가능)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            {ALL_WORK_TYPES.map(type => (
              <label key={type} className="checkrow" style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.workTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) setForm({ ...form, workTypes: [...form.workTypes, type] });
                    else setForm({ ...form, workTypes: form.workTypes.filter(t => t !== type) });
                  }}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        {form.workTypes.includes("화기작업") && (
          <div className="card section" style={{ border: "2px solid #eab308" }}>
            <h3 style={{ color: "#ca8a04" }}>🔥 화기취급작업 신청서 추가 대상</h3>
            <p className="muted" style={{ marginBottom: 0 }}>화기작업이 선택되었습니다. 제출 시 화기작업 허가 대상으로 표시됩니다.</p>
          </div>
        )}

        {form.workTypes.includes("중량물취급작업") && (
          <div className="card section" style={{ border: "2px solid #3b82f6" }}>
            <h3 style={{ color: "#2563eb" }}>🏗️ 중량물 취급 작업계획서 추가 대상</h3>
            <p className="muted" style={{ marginBottom: 0 }}>중량물취급작업이 선택되었습니다. 제출 시 중량물 작업계획 대상으로 표시됩니다.</p>
          </div>
        )}

        <div className="card section">
          <h3>3. 안전교육일지 첨부</h3>

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <label className="checkrow"><input type="radio" checked={form.trainingType === "form"} onChange={() => setForm({ ...form, trainingType: "form" })} /> 화면 직접 작성</label>
            <label className="checkrow"><input type="radio" checked={form.trainingType === "photo"} onChange={() => setForm({ ...form, trainingType: "photo" })} /> 종이일지 사진 촬영</label>
          </div>

          {form.trainingType === "form" ? (
            <div className="formgrid">
              <div className="field">
                <label>교육 강사 (현장관리감독자)</label>
                <input className="input" value={form.trainingInstructor} onChange={e => setForm({ ...form, trainingInstructor: e.target.value })} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>안전 교육 내용</label>
                <textarea value={form.trainingContent} onChange={e => setForm({ ...form, trainingContent: e.target.value })} style={{ height: 100 }} />
              </div>
            </div>
          ) : (
            <div className="field">
              <label>안전교육일지 사진 첨부</label>
              <input type="file" accept="image/*" capture="environment" onChange={e => setTrainingPhoto(e.target.files?.[0] || null)} />
            </div>
          )}
        </div>

        <div className="card section">
          <h3>4. 안전관리 준수 서약 및 서명</h3>
          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, maxHeight: 150, overflowY: "auto", marginBottom: 16, border: "1px solid #ddd" }}>
            <b>상기 본인은 아래 안전수칙을 성실히 이행할 것을 서약합니다.</b><br />
            1. 작업허가신청서를 작성 및 승인 득한 후 작업한다.<br />
            2. 작업자에 필요한 안전보건교육을 실시 후 작업한다.<br />
            3. 보호구(안전모, 안전화 등) 착용 후 작업한다.<br />
            (이하 16개 항목 전체 준수 동의)
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {signatures.map((sig, idx) => (
              <div key={idx} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, textAlign: "center", width: 120 }}>
                <img src={sig.data} alt="서명" style={{ width: "100%", height: 60, objectFit: "contain", background: "#f1f1f1", borderRadius: 4 }} />
                <div style={{ marginTop: 4, fontSize: 12 }}><b>{sig.name}</b> ({sig.type})</div>
              </div>
            ))}

            <button type="button" className="btn secondary" style={{ width: 120, height: 95 }} onClick={() => setShowSignModal(true)}>
              + 서명 추가
            </button>
          </div>
        </div>

        <button type="button" className="btn" style={{ width: "100%", padding: 16, fontSize: 16, marginBottom: 60 }} onClick={submitPtw} disabled={isSubmitting}>
          {isSubmitting ? "전송 중..." : "안전작업허가서 제출 (승인 요청)"}
        </button>

        {msg && <p style={{ color: "#b33", textAlign: "center", marginBottom: 40 }}>{msg}</p>}

        {showSignModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 400 }}>
              <h3>작업자 전자 서명</h3>

              <div className="field" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <select className="input" value={signType} onChange={e => setSignType(e.target.value)} style={{ width: 100 }}>
                  <option value="대표자">대표자</option>
                  <option value="근로자">근로자</option>
                </select>
                <input className="input" placeholder="이름 입력" value={signName} onChange={e => setSignName(e.target.value)} style={{ flex: 1 }} />
              </div>

              <div style={{ border: "2px dashed #ccc", borderRadius: 8, background: "#fafafa", marginBottom: 16 }}>
                <canvas
                  ref={canvasRef} width={360} height={150}
                  style={{ width: "100%", height: 150, touchAction: "none" }}
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px 8px" }}>
                  <span style={{ fontSize: 12, color: "#888" }}>이곳에 손가락으로 서명하세요</span>
                  <button type="button" className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={clearCanvas}>지우기</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setShowSignModal(false)}>취소</button>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={saveSignature}>서명 완료</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}