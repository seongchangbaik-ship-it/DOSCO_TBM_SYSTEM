"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type ForkliftLog = {
  id: string;
  forklift_type: string;
  company_name: string;
  user_name: string;
  has_license: string;
  pickup_location: string;
  checklist: Record<string, any>;
  status: string;
  picked_up_at: string;
  returned_at: string | null;
  return_location: string | null;
  return_issue_status: string | null;
  return_note: string | null;
  return_photo_data: string | null;
};

export default function ForkliftStatusPage() {
  const [logs, setLogs] = useState<ForkliftLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"전체" | "사용중" | "반납완료" | "확인완료">("전체");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [msg, setMsg] = useState("");

  async function loadLogs(silent = false) {
    if (!configured) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("forklift_logs")
      .select("*")
      .order("picked_up_at", { ascending: false })
      .limit(200);

    if (error) {
      setMsg("현황 조회 오류: " + error.message);
    } else {
      setMsg("");
      setLogs(data || []);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR"));
    }
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadLogs(false);

    if (!configured) return;

    const channel = supabase
      .channel("forklift-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forklift_logs" },
        () => {
          loadLogs(true);
        }
      )
      .subscribe();

    const timer = setInterval(() => {
      loadLogs(true);
    }, 10000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  function countAbnormal(checklist: Record<string, any>) {
    if (!checklist) return 0;
    return Object.entries(checklist)
      .filter(([key]) => ["1", "2", "3", "4", "5", "6"].includes(key))
      .filter(([, val]) => val === "부적정 △").length;
  }

  const isReturnedOnly = (status: string) =>
    status === "반납완료" || status === "반납확인";
  const isConfirmDone = (status: string) => status === "확인완료";

  const filteredLogs = logs.filter((item) => {
    if (filterStatus === "전체") return true;
    if (filterStatus === "사용중") return item.status === "사용중";
    if (filterStatus === "반납완료") return isReturnedOnly(item.status);
    if (filterStatus === "확인완료") return isConfirmDone(item.status);
    return true;
  });

  const activeCount = logs.filter((l) => l.status === "사용중").length;
  const returnedCount = logs.filter((l) => isReturnedOnly(l.status)).length;
  const confirmDoneCount = logs.filter((l) => isConfirmDone(l.status)).length;

  return (
    <main className="shell">
      <div className="pagehead">
        <div>
          <h1>지게차 사용 현황</h1>
          <div className="muted">
            실시간 수령·반납·확인 현황 조회{lastUpdated ? ` · 최종 갱신: ${lastUpdated}` : ""}
          </div>
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <Link href="/forklift-main" className="btn secondary">
            ← 지게차 메뉴
          </Link>
          <Link href="/forklift/return" className="btn">
            키 반납 신청 및 확인
          </Link>
          <button type="button" className="btn secondary" onClick={() => loadLogs(false)}>
            새로고침
          </button>
        </div>
      </div>

      <div className="grid section">
        <div className="card">
          <div className="muted">사용중</div>
          <div className="metric">{activeCount}</div>
        </div>
        <div className="card">
          <div className="muted">반납완료</div>
          <div className="metric">{returnedCount}</div>
        </div>
        <div className="card">
          <div className="muted">확인완료</div>
          <div className="metric green">{confirmDoneCount}</div>
        </div>
      </div>

      {msg && (
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
          <h2 style={{ margin: 0 }}>실시간 사용 / 반납 목록</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["전체", "사용중", "반납완료", "확인완료"] as const).map((tab) => (
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
                  <th>특이사항</th>
                  <th>반납사진</th>
                  <th>점검</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item) => {
                  const abnCnt = countAbnormal(item.checklist);
                  const isActive = item.status === "사용중";
                  const isDone = isConfirmDone(item.status);
                  const isReturned = !isActive && (isDone || isReturnedOnly(item.status));
                  const displayStatus = isDone
                    ? "확인완료"
                    : isReturnedOnly(item.status)
                    ? "반납완료"
                    : item.status;
                  const hasIssue = item.return_issue_status === "있음";

                  return (
                    <tr key={item.id}>
                      <td>
                        <span
                          className={`pill ${isActive ? "wait" : "ok"}`}
                          style={
                            isDone
                              ? { background: "#dcfce7", color: "#15803d", fontWeight: 700 }
                              : undefined
                          }
                        >
                          {displayStatus}
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
                        {isReturned ? (
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
                        {isReturned ? (
                          <div>
                            <span
                              className="pill"
                              style={{
                                background: hasIssue ? "#fee2e2" : "#dcfce7",
                                color: hasIssue ? "#dc2626" : "#15803d",
                              }}
                            >
                              {item.return_issue_status || "없음"}
                            </span>
                            {item.return_note && (
                              <div style={{ fontSize: 12, marginTop: 4 }}>{item.return_note}</div>
                            )}
                          </div>
                        ) : (
                          <span className="muted">-</span>
                        )}
                      </td>
                      <td>
                        {item.return_photo_data ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(item.return_photo_data)}
                            style={{
                              padding: 0,
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            title="사진 크게 보기"
                          >
                            <img
                              src={item.return_photo_data}
                              alt="반납 사진"
                              style={{
                                width: 48,
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid #cbd5e1",
                                display: "block",
                              }}
                            />
                          </button>
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

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 640, width: "100%", background: "#fff" }}
          >
            <div className="row between" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>반납 사진</h3>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setPreviewPhoto(null)}
              >
                닫기
              </button>
            </div>
            <img
              src={previewPhoto}
              alt="반납 사진 확대"
              style={{
                width: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}