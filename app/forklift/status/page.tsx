"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

const RETURN_LOCATIONS = [
  "1공장 출하사무실",
  "2공장 협력사 사무실",
  "2공장 동아스틸 사무실",
  "기타장소",
] as const;

type ForkliftLog = {
  id: string;
  forklift_type: string;
  company_name: string;
  user_name: string;
  has_license: string;
  pickup_location: string;
  checklist: Record<string, string>;
  status: string;
  picked_up_at: string;
  returned_at: string | null;
  return_location: string | null;
  return_note: string | null;
  return_photo_data: string | null;
};

export default function ForkliftStatusPage() {
  const [logs, setLogs] = useState<ForkliftLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"전체" | "사용중" | "반납완료">("전체");
  const [msg, setMsg] = useState("");

  const [returningLog, setReturningLog] = useState<ForkliftLog | null>(null);
  const [returnType, setReturnType] = useState<string>("1공장 출하사무실");
  const [customReturnLocation, setCustomReturnLocation] = useState("");
  const [returnConfirmed, setReturnConfirmed] = useState(false);
  const [returnPhotoData, setReturnPhotoData] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [savingReturn, setSavingReturn] = useState(false);

  async function loadLogs() {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("forklift_logs")
      .select("*")
      .order("picked_up_at", { ascending: false })
      .limit(200);

    if (error) {
      setMsg("현황 조회 오류: " + error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  function openReturnModal(item: ForkliftLog) {
    setMsg("");
    setReturningLog(item);
    setReturnType(
      item.pickup_location === "1공장 출하사무실" ||
        item.pickup_location === "2공장 협력사 사무실" ||
        item.pickup_location === "2공장 동아스틸 사무실"
        ? item.pickup_location
        : "1공장 출하사무실"
    );
    setCustomReturnLocation("");
    setReturnConfirmed(false);
    setReturnPhotoData(null);
    setReturnNote("");
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReturnPhotoData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function confirmReturn() {
    if (!returningLog || savingReturn) return;
    setMsg("");

    if (returnType === "기타장소" && !customReturnLocation.trim()) {
      setMsg("기타장소를 선택하셨습니다. 반납 장소를 직접 입력해 주세요.");
      return;
    }

    if (!returnConfirmed) {
      setMsg('"지정된 반납장소에 반납하셨습니까?" 항목의 예에 체크해 주세요.');
      return;
    }

    setSavingReturn(true);

    try {
      const finalReturnLocation =
        returnType === "기타장소" ? customReturnLocation.trim() : returnType;

      const { error } = await supabase
        .from("forklift_logs")
        .update({
          status: "반납완료",
          returned_at: new Date().toISOString(),
          return_location: finalReturnLocation,
          return_note: returnNote.trim() || null,
          return_photo_data: returnPhotoData,
        })
        .eq("id", returningLog.id);

      if (error) {
        throw new Error(error.message);
      }

      setMsg(
        `${returningLog.forklift_type} (${returningLog.user_name}님) 키가 [${finalReturnLocation}]에 반납 처리되었습니다.`
      );
      setReturningLog(null);
      await loadLogs();
    } catch (err: any) {
      setMsg("반납 처리 오류: " + (err?.message || "잠시 후 다시 시도해 주세요."));
    } finally {
      setSavingReturn(false);
    }
  }

  function countAbnormal(checklist: Record<string, string>) {
    if (!checklist) return 0;
    return Object.values(checklist).filter((v) => v === "부적정 △").length;
  }

  const filteredLogs = logs.filter((item) => {
    if (filterStatus === "전체") return true;
    return item.status === filterStatus;
  });

  const activeCount = logs.filter((l) => l.status === "사용중").length;
  const returnedCount = logs.filter((l) => l.status === "반납완료").length;

  return (
    <main className="shell">
      <div className="pagehead">
        <div>
          <h1>지게차 사용 현황</h1>
          <div className="muted">실시간 키 수령·반납 상태 확인 및 키 반납 처리</div>
        </div>
        <div className="row">
          <Link href="/" className="btn secondary">
            ← 홈으로
          </Link>
          <Link href="/forklift" className="btn">
            + 지게차 사용 신청
          </Link>
        </div>
      </div>

      <div className="grid section">
        <div className="card">
          <div className="muted">현재 사용 중</div>
          <div className="metric">{activeCount}</div>
        </div>
        <div className="card">
          <div className="muted">반납 완료</div>
          <div className="metric green">{returnedCount}</div>
        </div>
        <div className="card">
          <div className="muted">전체 기록</div>
          <div className="metric">{logs.length}</div>
        </div>
      </div>

      {msg && !returningLog && (
        <div className="card section" style={{ padding: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{msg}</p>
        </div>
      )}

      <div className="section card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>수령 / 반납 목록</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {(["전체", "사용중", "반납완료"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className="btn secondary"
                style={{
                  background: filterStatus === tab ? "#dbeafe" : undefined,
                  fontWeight: filterStatus === tab ? "bold" : "normal",
                }}
                onClick={() => setFilterStatus(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="empty">불러오는 중...</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>상태</th>
                  <th>지게차</th>
                  <th>소속 / 사용자</th>
                  <th>자격</th>
                  <th>수령장소 / 수령일시</th>
                  <th>반납장소 / 반납일시</th>
                  <th>반납사진</th>
                  <th>점검</th>
                  <th>반납</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item) => {
                  const abnCnt = countAbnormal(item.checklist);
                  return (
                    <tr key={item.id}>
                      <td>
                        <span className={`pill ${item.status === "반납완료" ? "ok" : "wait"}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <b>{item.forklift_type}</b>
                      </td>
                      <td>
                        {item.company_name} / <b>{item.user_name}</b>
                      </td>
                      <td>{item.has_license}</td>
                      <td>
                        <div>{item.pickup_location}</div>
                        <small className="muted">
                          {new Date(item.picked_up_at).toLocaleString("ko-KR")}
                        </small>
                      </td>
                      <td>
                        {item.status === "반납완료" ? (
                          <>
                            <div>{item.return_location || "-"}</div>
                            <small className="muted">
                              {item.returned_at
                                ? new Date(item.returned_at).toLocaleString("ko-KR")
                                : "-"}
                            </small>
                          </>
                        ) : (
                          <span className="muted">미반납</span>
                        )}
                      </td>
                      <td>
                        {item.return_photo_data ? (
                          <a href={item.return_photo_data} target="_blank" rel="noreferrer">
                            <img
                              src={item.return_photo_data}
                              alt="반납 사진"
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                              }}
                            />
                          </a>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        {abnCnt > 0 ? (
                          <span className="pill" style={{ background: "#fee2e2", color: "#dc2626" }}>
                            부적정 {abnCnt}건
                          </span>
                        ) : (
                          <span className="pill ok">양호</span>
                        )}
                      </td>
                      <td>
                        {item.status === "사용중" ? (
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: "6px 12px", fontSize: 12.5 }}
                            onClick={() => openReturnModal(item)}
                          >
                            반납
                          </button>
                        ) : (
                          <span className="pill ok">반납</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!filteredLogs.length && (
                  <tr>
                    <td colSpan={9} className="empty">
                      표시할 지게차 사용 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {returningLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            overflowY: "auto",
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 460,
              width: "100%",
              background: "#fff",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginTop: 0 }}>지게차 키 반납</h3>
            <p className="muted" style={{ marginTop: 4 }}>
              <b>{returningLog.forklift_type}</b> · {returningLog.company_name}{" "}
              {returningLog.user_name}님
            </p>

            <div className="field">
              <label>반납장소 선택</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {RETURN_LOCATIONS.map((loc) => (
                  <label
                    key={loc}
                    className="checkrow"
                    style={{
                      margin: 0,
                      padding: "9px 12px",
                      borderRadius: 8,
                      border: returnType === loc ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      background: returnType === loc ? "#eff6ff" : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name="returnType"
                      checked={returnType === loc}
                      onChange={() => setReturnType(loc)}
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            </div>

            {returnType === "기타장소" && (
              <div className="field">
                <label>기타 반납 장소 직접 입력</label>
                <input
                  className="input"
                  value={customReturnLocation}
                  onChange={(e) => setCustomReturnLocation(e.target.value)}
                  placeholder="반납한 장소를 입력하세요"
                />
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: "#eff6ff",
                border: "1px solid #93c5fd",
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                지정된 반납장소에 반납하셨습니까?
              </div>
              <label className="checkrow" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={returnConfirmed}
                  onChange={(e) => setReturnConfirmed(e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>예</span>
              </label>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>반납 사진 첨부 (선택)</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                style={{ marginTop: 6, fontSize: 13 }}
              />
              {returnPhotoData && (
                <div style={{ marginTop: 8 }}>
                  <img
                    src={returnPhotoData}
                    alt="반납 사진 미리보기"
                    style={{
                      width: "100%",
                      maxHeight: 180,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                    }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ marginTop: 6, padding: "4px 10px", fontSize: 12 }}
                    onClick={() => setReturnPhotoData(null)}
                  >
                    사진 제거
                  </button>
                </div>
              )}
            </div>

            <div className="field">
              <label>특이사항 / 메모 (선택)</label>
              <input
                className="input"
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                placeholder="특이사항이 없으면 비워 두셔도 됩니다"
              />
            </div>

            {msg && (
              <p style={{ color: "#dc2626", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                {msg}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                type="button"
                className="btn secondary"
                disabled={savingReturn}
                onClick={() => setReturningLog(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn"
                disabled={savingReturn}
                onClick={confirmReturn}
              >
                {savingReturn ? "반납 처리 중..." : "반납"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}