"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

const FORKLIFT_TYPES = ["1공장 7톤", "1공장 14톤", "2공장 7톤"] as const;

const COMPANY_OPTIONS = [
  "동아스틸",
  "에스로지스",
  "나로스틸",
  "세현스틸",
  "다인스틸",
  "기타업체",
] as const;

const PICKUP_LOCATIONS = [
  "1공장 출하사무실",
  "2공장 협력사 사무실",
  "2공장 동아스틸 사무실",
  "기타장소",
] as const;

type ChecklistItem = {
  no: number;
  stage: "작업전 TBM" | "작업중 TBM" | "작업후 TBM";
  hazard: string;
  measure: string;
};

const TBM_CHECKLIST: ChecklistItem[] = [
  // 제1단 작업전 TBM
  {
    no: 1,
    stage: "작업전 TBM",
    hazard: "지면 파손·미끄러움으로 전도 위험",
    measure: "작업 전 바닥 점검, 미끄럼 방지 조치",
  },
  {
    no: 2,
    stage: "작업전 TBM",
    hazard: "지게차 브레이크·타이어 불량",
    measure: "운행 전 일상 점검 후 발견 시 운행 금지",
  },
  {
    no: 3,
    stage: "작업전 TBM",
    hazard: "포크 체결 부 느슨함",
    measure: "포크 상태 및 체결 핀 확인, 이상 시 정비 요청",
  },
  {
    no: 4,
    stage: "작업전 TBM",
    hazard: "배터리·연료 부족으로 작업 중단",
    measure: "충전·주유 상태 점검 후 충분히 확보",
  },
  {
    no: 5,
    stage: "작업전 TBM",
    hazard: "경사로·장애물 확인",
    measure: "동선 사전 점검, 위험 구간 회피 계획 수립",
  },
  {
    no: 6,
    stage: "작업전 TBM",
    hazard: "지게차, 화물차량 사람 또는 타물체와 충돌 위험",
    measure: "보행통로 이동 및 주변 확인 철저",
  },

  // 제2단 작업중 TBM
  {
    no: 7,
    stage: "작업중 TBM",
    hazard: "제한속도 초과로 충돌 위험",
    measure: "지정 속도 (10KM 이하) 준수, 급정지·급회전 금지",
  },
  {
    no: 8,
    stage: "작업중 TBM",
    hazard: "포크를 높인 상태로 주행",
    measure: "주행 시 포크 최저 위치 유지",
  },
  {
    no: 9,
    stage: "작업중 TBM",
    hazard: "적재물로 인한 시야 방해",
    measure: "과적 금지, 시야 방해 시 신호수 유도 활용",
  },
  {
    no: 10,
    stage: "작업중 TBM",
    hazard: "경사로 주행 시 전도",
    measure: "저속·직선 주행, 경사도 큰 구간은 우회",
  },
  {
    no: 11,
    stage: "작업중 TBM",
    hazard: "적재물 낙하 위험",
    measure: "화물 균형 확인, 묶음 고정 사용",
  },
  {
    no: 12,
    stage: "작업중 TBM",
    hazard: "보행자 접근으로 충돌",
    measure: "접근 시 경적·경광등 사용, 일시 정지",
  },
  {
    no: 13,
    stage: "작업중 TBM",
    hazard: "조명 불량 구역 작업",
    measure: "추가 조명 설치 또는 작업 제한",
  },

  // 제3단 작업후 TBM
  {
    no: 14,
    stage: "작업후 TBM",
    hazard: "브레이크 미 체결, 키 방치",
    measure: "주차 브레이크 채우고 키 분리·관리",
  },
  {
    no: 15,
    stage: "작업후 TBM",
    hazard: "지정 구역 외 주차로 충돌 위험",
    measure: "반드시 지정된 주차 장소에 주차",
  },
  {
    no: 16,
    stage: "작업후 TBM",
    hazard: "이상 발생 보고 누락",
    measure: "TBM 일지 및 정비 요청서 기록 및 제출",
  },
];

const STAGES: { key: ChecklistItem["stage"]; title: string; guide: string }[] = [
  {
    key: "작업전 TBM",
    title: "제1단 · 작업전 TBM",
    guide: "중점실시항목에 ◎표시하고 전원이 지시호칭한다 (적정 ○ / 부적정 △)",
  },
  {
    key: "작업중 TBM",
    title: "제2단 · 작업중 TBM",
    guide: "중점실시항목에 ◎표시하고 전원이 지시호칭한다 (적정 ○ / 부적정 △)",
  },
  {
    key: "작업후 TBM",
    title: "제3단 · 작업후 TBM",
    guide: "중점실시항목에 ◎표시하고 전원이 지시호칭한다 (적정 ○ / 부적정 △)",
  },
];

export default function ForkliftPage() {
  const [forkliftType, setForkliftType] = useState<string>("1공장 7톤");
  const [companyType, setCompanyType] = useState<string>("동아스틸");
  const [customCompanyName, setCustomCompanyName] = useState("");
  const [userName, setUserName] = useState("");
  const [hasLicense, setHasLicense] = useState<string>("유");

  const [pickupType, setPickupType] = useState<string>("1공장 출하사무실");
  const [customPickupLocation, setCustomPickupLocation] = useState("");

  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, "적정 ○" | "부적정 △" | "">>({});
  const [pledgeChecked, setPledgeChecked] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function handlePickupClick() {
    setMsg("");
    if (!forkliftType) {
      setMsg("지게차 종류를 선택해 주세요.");
      return;
    }
    if (companyType === "기타업체" && !customCompanyName.trim()) {
      setMsg("기타업체를 선택하셨습니다. 소속업체명을 입력해 주세요.");
      return;
    }
    if (!userName.trim()) {
      setMsg("사용자 이름을 입력해 주세요.");
      return;
    }
    if (pickupType === "기타장소" && !customPickupLocation.trim()) {
      setMsg("기타장소를 선택하셨습니다. 키 수령 장소를 입력해 주세요.");
      return;
    }
    setChecklistOpen(true);
  }

  function getCoords(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
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
  }

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
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
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleSubmit() {
    if (submitting) return;
    setMsg("");
    setCanRetry(false);

    if (!configured) {
      setMsg("Supabase 환경설정을 확인해 주세요.");
      return;
    }

    if (!checklistOpen) {
      setMsg("먼저 [수령] 버튼을 눌러 TBM 체크리스트를 확인해 주세요.");
      return;
    }

    const missingItem = TBM_CHECKLIST.find(
      (item) => checklist[String(item.no)] !== "적정 ○" && checklist[String(item.no)] !== "부적정 △"
    );
    if (missingItem) {
      setMsg(`${missingItem.no}번 항목(${missingItem.hazard})의 적정 ○ / 부적정 △을 선택해 주세요.`);
      return;
    }

    if (!pledgeChecked) {
      setMsg("점검 완료 및 반납 서약 문구에 동의 체크를 해 주세요.");
      return;
    }

    if (!hasDrawn || !canvasRef.current) {
      setMsg("서명란에 서명을 해 주세요.");
      return;
    }

    const finalCompanyName =
      companyType === "기타업체" ? customCompanyName.trim() : companyType;
    const finalPickupLocation =
      pickupType === "기타장소" ? customPickupLocation.trim() : pickupType;

    setSubmitting(true);
    try {
      const signatureData = canvasRef.current.toDataURL("image/png");
      const { error } = await supabase.from("forklift_logs").insert({
        forklift_type: forkliftType,
        company_name: finalCompanyName,
        company_type: companyType,
        user_name: userName.trim(),
        has_license: hasLicense,
        pickup_location: finalPickupLocation,
        pickup_location_type: pickupType,
        checklist,
        pledge_agreed: true,
        signature_data: signatureData,
        status: "사용중",
        picked_up_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setDone(true);
    } catch (err: any) {
      setMsg(
        "제출 오류: " +
          (err?.message || "네트워크 오류") +
          " 입력 내용은 그대로 유지되니 [다시 시도]를 눌러 주세요."
      );
      setCanRetry(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mobile">
      <div className="row between" style={{ marginBottom: 10 }}>
        <Link href="/" className="btn secondary">
          ← 홈으로
        </Link>
        <Link href="/forklift/status" className="btn secondary">
          지게차 사용 현황 →
        </Link>
      </div>

      <div className="mobilehero">
        <div style={{ fontSize: 12, opacity: 0.8 }}>DONG-A STEEL · FORKLIFT TBM</div>
        <h1>지게차 사용 신청</h1>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          키 수령 · 작업전/중/후 TBM 체크리스트 · 서명
        </div>
      </div>

      {!done ? (
        <>
          <div className="card section">
            <h3 style={{ marginTop: 0 }}>1. 지게차 · 사용자 · 키 수령 장소</h3>

            <div className="field">
              <label>지게차 종류</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {FORKLIFT_TYPES.map((type) => (
                  <label
                    key={type}
                    className="checkrow"
                    style={{
                      margin: 0,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: forkliftType === type ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      background: forkliftType === type ? "#eff6ff" : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name="forkliftType"
                      checked={forkliftType === type}
                      onChange={() => setForkliftType(type)}
                    />
                    <b>{type}</b>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>소속업체</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                {COMPANY_OPTIONS.map((comp) => (
                  <label
                    key={comp}
                    className="checkrow"
                    style={{
                      margin: 0,
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: companyType === comp ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      background: companyType === comp ? "#eff6ff" : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name="companyType"
                      checked={companyType === comp}
                      onChange={() => setCompanyType(comp)}
                    />
                    <span>{comp}</span>
                  </label>
                ))}
              </div>
            </div>

            {companyType === "기타업체" && (
              <div className="field">
                <label>기타업체명 직접 입력</label>
                <input
                  className="input"
                  value={customCompanyName}
                  onChange={(e) => setCustomCompanyName(e.target.value)}
                  placeholder="소속 업체명을 입력하세요"
                />
              </div>
            )}

            <div className="field">
              <label>사용자 (이름)</label>
              <input
                className="input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="사용자 이름 입력"
              />
            </div>

            <div className="field">
              <label>자격유무</label>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                {["유", "무"].map((lic) => (
                  <label key={lic} className="checkrow" style={{ margin: 0 }}>
                    <input
                      type="radio"
                      name="hasLicense"
                      checked={hasLicense === lic}
                      onChange={() => setHasLicense(lic)}
                    />
                    <span>{lic}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>키 수령 장소</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {PICKUP_LOCATIONS.map((loc) => (
                  <label
                    key={loc}
                    className="checkrow"
                    style={{
                      margin: 0,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: pickupType === loc ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      background: pickupType === loc ? "#eff6ff" : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name="pickupType"
                      checked={pickupType === loc}
                      onChange={() => setPickupType(loc)}
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>

            {pickupType === "기타장소" && (
              <div className="field">
                <label>기타 수령 장소 직접 입력</label>
                <input
                  className="input"
                  value={customPickupLocation}
                  onChange={(e) => setCustomPickupLocation(e.target.value)}
                  placeholder="키를 수령한 장소를 입력하세요"
                />
              </div>
            )}

            <button
              type="button"
              className="btn"
              style={{ width: "100%", marginTop: 10 }}
              onClick={handlePickupClick}
            >
              수령 (TBM 체크리스트 열기)
            </button>
          </div>

          {checklistOpen && (
            <div className="card section">
              <div className="row between" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>2. 지게차 TBM 체크리스트</h3>
                <span className="pill ok">{forkliftType}</span>
              </div>

              {STAGES.map((stageObj) => (
                <div key={stageObj.key} style={{ marginTop: 14 }}>
                  <div
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "#1e3a8a",
                      color: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{stageObj.title}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 2 }}>{stageObj.guide}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {TBM_CHECKLIST.filter((item) => item.stage === stageObj.key).map((item) => {
                      const currentVal = checklist[String(item.no)] || "";
                      return (
                        <div
                          key={item.no}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                            {item.no}. {item.hazard}
                          </div>
                          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                            안전대책: {item.measure}
                          </div>
                          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                            {(["적정 ○", "부적정 △"] as const).map((opt) => (
                              <label key={opt} className="checkrow" style={{ margin: 0 }}>
                                <input
                                  type="radio"
                                  name={`chk_${item.no}`}
                                  checked={currentVal === opt}
                                  onChange={() =>
                                    setChecklist((prev) => ({ ...prev, [String(item.no)]: opt }))
                                  }
                                />
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: opt === "부적정 △" ? "#dc2626" : "#1d4ed8",
                                  }}
                                >
                                  {opt}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 8,
                  background: "#eff6ff",
                  border: "1px solid #93c5fd",
                }}
              >
                <label className="checkrow" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={pledgeChecked}
                    onChange={(e) => setPledgeChecked(e.target.checked)}
                  />
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                    작업 전 지게차 점검을 완료하였고 안전하게 작업하고 종료 후 정해진 장소에
                    반납하겠습니다.
                  </span>
                </label>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label>사용자 서명</label>
                <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fafafa" }}>
                  <canvas
                    ref={canvasRef}
                    width={360}
                    height={140}
                    style={{ width: "100%", height: 140, touchAction: "none", display: "block" }}
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
                      padding: "6px 12px",
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
                style={{ width: "100%", marginTop: 14 }}
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? "제출 중..." : "제출 (수령 완료)"}
              </button>
            </div>
          )}

          {msg && (
            <div className="card section" style={{ textAlign: "center" }}>
              <p style={{ color: "#b33", fontSize: 13, marginBottom: canRetry ? 10 : 0 }}>{msg}</p>
              {canRetry && (
                <button
                  type="button"
                  className="btn"
                  style={{ background: "#dc2626", borderColor: "#dc2626" }}
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "재전송 중..." : "다시 시도"}
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card section" style={{ textAlign: "center" }}>
          <div className="pill ok">수령 완료</div>
          <h2>지게차 키 수령이 등록되었습니다.</h2>
          <p className="muted">
            {forkliftType} · {companyType === "기타업체" ? customCompanyName : companyType} ·{" "}
            {userName}님
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
            <Link href="/forklift/status" className="btn">
              지게차 사용 현황 보기
            </Link>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setDone(false);
                setChecklistOpen(false);
                setChecklist({});
                setPledgeChecked(false);
                setHasDrawn(false);
                setUserName("");
                setCustomCompanyName("");
                setCustomPickupLocation("");
              }}
            >
              추가 신청
            </button>
          </div>
        </div>
      )}
    </main>
  );
}