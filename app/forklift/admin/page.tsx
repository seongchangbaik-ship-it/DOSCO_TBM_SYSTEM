"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

const TBM_LABELS: Record<string, { stage: string; hazard: string; measure: string }> = {
  "1": { stage: "작업전 TBM", hazard: "지면 파손·미끄러움으로 전도 위험", measure: "작업 전 바닥 점검, 미끄럼 방지 조치" },
  "2": { stage: "작업전 TBM", hazard: "지게차 브레이크·타이어 불량", measure: "운행 전 일상 점검 후 발견 시 운행 금지" },
  "3": { stage: "작업전 TBM", hazard: "포크 체결 부 느슨함", measure: "포크 상태 및 체결 핀 확인, 이상 시 정비 요청" },
  "4": { stage: "작업전 TBM", hazard: "배터리·연료 부족으로 작업 중단", measure: "충전·주유 상태 점검 후 충분히 확보" },
  "5": { stage: "작업전 TBM", hazard: "경사로·장애물 확인", measure: "동선 사전 점검, 위험 구간 회피 계획 수립" },
  "6": { stage: "작업전 TBM", hazard: "지게차, 화물차량 사람 또는 타물체와 충돌 위험", measure: "보행통로 이동 및 주변 확인 철저" },
  "7": { stage: "작업중 TBM", hazard: "제한속도 초과로 충돌 위험", measure: "지정 속도 (10KM 이하) 준수, 급정지·급회전 금지" },
  "8": { stage: "작업중 TBM", hazard: "포크를 높인 상태로 주행", measure: "주행 시 포크 최저 위치 유지" },
  "9": { stage: "작업중 TBM", hazard: "적재물로 인한 시야 방해", measure: "과적 금지, 시야 방해 시 신호수 유도 활용" },
  "10": { stage: "작업중 TBM", hazard: "경사로 주행 시 전도", measure: "저속·직선 주행, 경사도 큰 구간은 우회" },
  "11": { stage: "작업중 TBM", hazard: "적재물 낙하 위험", measure: "화물 균형 확인, 묶음 고정 사용" },
  "12": { stage: "작업중 TBM", hazard: "보행자 접근으로 충돌", measure: "접근 시 경적·경광등 사용, 일시 정지" },
  "13": { stage: "작업중 TBM", hazard: "조명 불량 구역 작업", measure: "추가 조명 설치 또는 작업 제한" },
  "14": { stage: "작업후 TBM", hazard: "브레이크 미 체결, 키 방치", measure: "주차 브레이크 채우고 키 분리·관리" },
  "15": { stage: "작업후 TBM", hazard: "지정 구역 외 주차로 충돌 위험", measure: "반드시 지정된 주차 장소에 주차" },
  "16": { stage: "작업후 TBM", hazard: "이상 발생 보고 누락", measure: "TBM 일지 및 정비 요청서 기록 및 제출" },
};

export default function ForkliftAdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [logs, setLogs] = useState<any[]>([]);
  const [forkliftFilter, setForkliftFilter] = useState("전체");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [msg, setMsg] = useState("");

  async function verifyAdmin() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    const { data, error } = await supabase
      .from("tbm_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error || !data) {
      setIsAdmin(false);
      setLoginMsg("관리자 등록 정보를 찾을 수 없습니다.");
    } else {
      setIsAdmin(true);
      setLoginMsg("");
    }
    setChecking(false);
  }

  useEffect(() => {
    if (!configured) {
      setChecking(false);
      return;
    }
    verifyAdmin();
  }, []);

  async function login() {
    setLoginMsg("");
    if (!email.trim() || !password) {
      setLoginMsg("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoginMsg("로그인 실패: " + error.message);
      return;
    }
    await verifyAdmin();
  }

  async function loadLogs() {
    if (!configured || !isAdmin) return;
    const { data, error } = await supabase
      .from("forklift_logs")
      .select("*")
      .order("picked_up_at", { ascending: false })
      .limit(500);

    if (error) {
      setMsg("조회 오류: " + error.message);
      return;
    }
    setLogs(data || []);
  }

  useEffect(() => {
    if (isAdmin) loadLogs();
  }, [isAdmin]);

  async function deleteLog(id: string) {
    if (!window.confirm("이 지게차 사용 기록을 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("forklift_logs").delete().eq("id", id);
    if (error) {
      setMsg("삭제 실패: " + error.message);
      return;
    }
    if (selectedLog?.id === id) setSelectedLog(null);
    setMsg("지게차 사용 기록이 삭제되었습니다.");
    loadLogs();
  }

  if (!configured) {
    return (
      <main className="shell">
        <div className="card">Supabase 연결 설정을 확인해 주세요.</div>
      </main>
    );
  }

  if (checking) {
    return (
      <main className="shell">
        <div className="card">관리자 권한 확인 중...</div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="shell" style={{ maxWidth: 460, paddingTop: 60 }}>
        <div className="card">
          <div className="brand">DOSCO FORKLIFT ADMIN</div>
          <h1>관리자 로그인</h1>
          <div className="field">
            <label>이메일</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="관리자 이메일"
            />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
            />
          </div>
          <button className="btn" style={{ width: "100%" }} onClick={login}>
            로그인
          </button>
          <Link
            href="/"
            className="btn secondary"
            style={{ display: "block", width: "100%", marginTop: 10, textAlign: "center" }}
          >
            홈으로 돌아가기
          </Link>
          {loginMsg && <p style={{ color: "#b33", fontSize: 13, marginTop: 10 }}>{loginMsg}</p>}
        </div>
      </main>
    );
  }

  const filtered =
    forkliftFilter === "전체"
      ? logs
      : logs.filter((l) => l.forklift_type === forkliftFilter);

  const activeCnt = logs.filter((l) => l.status === "사용중").length;
  const abnormalCnt = logs.filter((l) =>
    Object.values(l.checklist || {}).some((v) => v === "부적정 △")
  ).length;

  return (
    <main className="shell">
      <div className="pagehead">
        <div>
          <h1>지게차 관리자 대시보드</h1>
          <div className="muted">수령·반납 이력, TBM 체크리스트 결과, 서명 조회 및 관리</div>
        </div>
        <div className="row">
          <Link href="/" className="btn secondary">
            홈
          </Link>
          <Link href="/forklift" className="btn secondary">
            사용 신청
          </Link>
          <Link href="/forklift/status" className="btn secondary">
            사용 현황
          </Link>
        </div>
      </div>

      <div className="grid section">
        <div className="card">
          <div className="muted">전체 사용 기록</div>
          <div className="metric">{logs.length}</div>
        </div>
        <div className="card">
          <div className="muted">현재 미반납(사용중)</div>
          <div className="metric">{activeCnt}</div>
        </div>
        <div className="card">
          <div className="muted">부적정 △ 포함 건</div>
          <div className="metric" style={{ color: "#dc2626" }}>
            {abnormalCnt}
          </div>
        </div>
      </div>

      {msg && (
        <div className="card section" style={{ padding: 12 }}>
          <p style={{ margin: 0, fontSize: 13.5 }}>{msg}</p>
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
          <h2 style={{ margin: 0 }}>지게차 TBM 및 키 관리 기록</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["전체", "1공장 7톤", "1공장 14톤", "2공장 7톤"].map((f) => (
              <button
                key={f}
                type="button"
                className="btn secondary"
                style={{
                  background: forkliftFilter === f ? "#dbeafe" : undefined,
                  fontWeight: forkliftFilter === f ? "bold" : "normal",
                }}
                onClick={() => setForkliftFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>상태</th>
                <th>지게차</th>
                <th>소속업체</th>
                <th>사용자</th>
                <th>자격</th>
                <th>수령장소 / 시각</th>
                <th>반납장소 / 시각</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className={`pill ${item.status === "반납완료" ? "ok" : "wait"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <b>{item.forklift_type}</b>
                  </td>
                  <td>{item.company_name}</td>
                  <td>{item.user_name}</td>
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
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setSelectedLog(item)}
                      >
                        상세
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        style={{
                          color: "#ef4444",
                          background: "#fee2e2",
                          borderColor: "#fca5a5",
                        }}
                        onClick={() => deleteLog(item.id)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="empty">
                    기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 999,
            overflowY: "auto",
            padding: 20,
          }}
        >
          <div className="card" style={{ maxWidth: 720, margin: "0 auto", background: "#fff" }}>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>지게차 TBM 상세 내역</h3>
              <button type="button" className="btn secondary" onClick={() => setSelectedLog(null)}>
                닫기
              </button>
            </div>

            <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              <b>지게차:</b> {selectedLog.forklift_type} / <b>상태:</b> {selectedLog.status}
              <br />
              <b>소속업체:</b> {selectedLog.company_name} / <b>사용자:</b> {selectedLog.user_name} (자격:{" "}
              {selectedLog.has_license})
              <br />
              <b>수령:</b> {selectedLog.pickup_location} (
              {new Date(selectedLog.picked_up_at).toLocaleString("ko-KR")})
              <br />
              <b>반납:</b>{" "}
              {selectedLog.status === "반납완료"
                ? `${selectedLog.return_location || "-"} (${
                    selectedLog.returned_at
                      ? new Date(selectedLog.returned_at).toLocaleString("ko-KR")
                      : "-"
                  })`
                : "미반납"}
              {selectedLog.return_note && (
                <>
                  <br />
                  <b>반납 메모:</b> {selectedLog.return_note}
                </>
              )}
            </p>

            <h4>체크리스트 점검 결과</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.keys(TBM_LABELS).map((num) => {
                const info = TBM_LABELS[num];
                const val = selectedLog.checklist?.[num] || "-";
                const isBad = val === "부적정 △";
                return (
                  <div
                    key={num}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: isBad ? "#fef2f2" : "#f8fafc",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 12.5 }}>
                      <b>{num}.</b> [{info.stage}] {info.hazard}
                    </div>
                    <span
                      className={`pill ${isBad ? "wait" : "ok"}`}
                      style={{
                        whiteSpace: "nowrap",
                        background: isBad ? "#fee2e2" : undefined,
                        color: isBad ? "#dc2626" : undefined,
                      }}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>

            {selectedLog.signature_data && (
              <div style={{ marginTop: 16 }}>
                <h4>사용자 서명</h4>
                <img
                  src={selectedLog.signature_data}
                  alt="서명"
                  style={{
                    maxHeight: 110,
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    padding: 6,
                    background: "#fafafa",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}