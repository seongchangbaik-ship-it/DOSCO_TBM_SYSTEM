"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

const PRE_WORK_LABELS: Record<string, { hazard: string; measure: string }> = {
  "1": { hazard: "지면 파손·미끄러움으로 전도 위험", measure: "작업 전 바닥 점검, 미끄럼 방지 조치" },
  "2": { hazard: "지게차 브레이크·타이어 불량", measure: "운행 전 일상 점검 후 발견 시 운행 금지" },
  "3": { hazard: "포크 체결 부 느슨함", measure: "포크 상태 및 체결 핀 확인, 이상 시 정비 요청" },
  "4": { hazard: "배터리·연료 부족으로 작업 중단", measure: "충전·주유 상태 점검 후 충분히 확보" },
  "5": { hazard: "경사로·장애물 확인", measure: "동선 사전 점검, 위험 구간 회피 계획 수립" },
  "6": { hazard: "지게차, 화물차량 사람 또는 타물체와 충돌 위험", measure: "보행통로 이동 및 주변 확인 철저" },
};

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const filtered =
    forkliftFilter === "전체"
      ? logs
      : logs.filter((l) => l.forklift_type === forkliftFilter);

  function downloadExcelWithPhotos() {
    if (!filtered.length) {
      setMsg("엑셀로 내려받을 기록이 없습니다.");
      return;
    }

    const headerCells = [
      "번호",
      "상태",
      "지게차",
      "소속업체",
      "사용자",
      "자격유무",
      "수령장소",
      "수령일시",
      "반납장소",
      "반납일시",
      "작업중 안전수칙",
      "1.지면전도",
      "2.브레이크·타이어",
      "3.포크체결",
      "4.배터리·연료",
      "5.경사로·장애물",
      "6.충돌위험",
      "반납특이사항",
      "특이사항메모",
      "반납사진",
      "서명사진",
    ]
      .map(
        (h) =>
          `<th style="background:#1e3a8a;color:#ffffff;border:1px solid #94a3b8;padding:8px;font-size:12px;">${escapeHtml(
            h
          )}</th>`
      )
      .join("");

    const rowsHtml = filtered
      .map((item, idx) => {
        const chk = item.checklist || {};
        const pickedStr = item.picked_up_at
          ? new Date(item.picked_up_at).toLocaleString("ko-KR")
          : "-";
        const returnedStr =
          item.status === "반납완료" && item.returned_at
            ? new Date(item.returned_at).toLocaleString("ko-KR")
            : item.status === "반납완료"
            ? "-"
            : "미반납";

        const photoCell = item.return_photo_data
          ? `<img src="${item.return_photo_data}" width="90" height="70" style="width:90px;height:70px;object-fit:cover;" />`
          : "-";

        const signCell = item.signature_data
          ? `<img src="${item.signature_data}" width="90" height="45" style="width:90px;height:45px;object-fit:contain;" />`
          : "-";

        const cells = [
          idx + 1,
          item.status || "-",
          item.forklift_type || "-",
          item.company_name || "-",
          item.user_name || "-",
          item.has_license || "-",
          item.pickup_location || "-",
          pickedStr,
          item.status === "반납완료" ? item.return_location || "-" : "미반납",
          returnedStr,
          chk.work_rules_agreed ? "준수 동의" : "미기록",
          chk["1"] || "-",
          chk["2"] || "-",
          chk["3"] || "-",
          chk["4"] || "-",
          chk["5"] || "-",
          chk["6"] || "-",
          item.status === "반납완료" ? item.return_issue_status || "없음" : "-",
          item.return_note || "-",
        ]
          .map(
            (val) =>
              `<td style="border:1px solid #cbd5e1;padding:6px;font-size:12px;vertical-align:middle;">${escapeHtml(
                val
              )}</td>`
          )
          .join("");

        return `<tr style="height:82px;">${cells}<td style="border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:middle;">${photoCell}</td><td style="border:1px solid #cbd5e1;padding:6px;text-align:center;vertical-align:middle;">${signCell}</td></tr>`;
      })
      .join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table border="1" style="border-collapse:collapse;">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `지게차_사용현황_${forkliftFilter}_${today}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function printSingleTbm(item: any) {
    const printWin = window.open("", "_blank", "width=820,height=920");
    if (!printWin) {
      setMsg("팝업 차단이 켜져 있습니다. 브라우저에서 팝업을 허용한 뒤 다시 시도해 주세요.");
      return;
    }

    const chk = item.checklist || {};
    const pickedStr = item.picked_up_at
      ? new Date(item.picked_up_at).toLocaleString("ko-KR")
      : "-";
    const returnedStr =
      item.status === "반납완료" && item.returned_at
        ? new Date(item.returned_at).toLocaleString("ko-KR")
        : item.status === "반납완료"
        ? "-"
        : "미반납";

    const checklistRows = Object.keys(PRE_WORK_LABELS)
      .map((num) => {
        const info = PRE_WORK_LABELS[num];
        const val = chk[num] || "-";
        const isBad = val === "부적정 △";
        return `
          <tr>
            <td style="text-align:center;font-weight:bold;">${escapeHtml(num)}</td>
            <td>
              <div style="font-weight:bold;">${escapeHtml(info.hazard)}</div>
              <div style="font-size:11.5px;color:#475569;margin-top:2px;">안전대책: ${escapeHtml(
                info.measure
              )}</div>
            </td>
            <td style="text-align:center;font-weight:bold;color:${
              isBad ? "#dc2626" : "#1d4ed8"
            };">${escapeHtml(val)}</td>
          </tr>
        `;
      })
      .join("");

    const returnPhotoBlock = item.return_photo_data
      ? `
        <div class="box">
          <div class="box-title">반납 사진</div>
          <img src="${item.return_photo_data}" alt="반납 사진" class="photo-img" />
        </div>
      `
      : `
        <div class="box">
          <div class="box-title">반납 사진</div>
          <div class="muted">첨부된 반납 사진 없음</div>
        </div>
      `;

    const signatureBlock = item.signature_data
      ? `
        <div class="box">
          <div class="box-title">사용자 서명</div>
          <img src="${item.signature_data}" alt="사용자 서명" class="sign-img" />
        </div>
      `
      : "";

    const html = `
      <!doctype html>
      <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>지게차 TBM 기록 - ${escapeHtml(item.forklift_type)} - ${escapeHtml(
      item.user_name
    )}</title>
        <style>
          body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #0f172a; margin: 24px; }
          .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px; }
          h1 { margin: 0; font-size: 20px; }
          .sub { font-size: 12px; color: #475569; margin-top: 4px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
          .info-table th, .info-table td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
          .info-table th { background: #f1f5f9; width: 16%; font-weight: bold; }
          .info-table td { width: 34%; }
          .chk-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12.5px; }
          .chk-table th, .chk-table td { border: 1px solid #cbd5e1; padding: 7px 9px; }
          .chk-table th { background: #1e3a8a; color: #fff; }
          .rule-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-size: 13px; }
          .media-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }
          .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
          .box-title { font-weight: bold; font-size: 13px; margin-bottom: 8px; }
          .photo-img { max-width: 100%; max-height: 240px; object-fit: contain; display: block; border-radius: 4px; }
          .sign-img { max-height: 110px; object-fit: contain; display: block; }
          .muted { color: #64748b; font-size: 12.5px; }
          .no-print { margin-bottom: 14px; text-align: right; }
          .print-btn { padding: 8px 14px; font-size: 13px; font-weight: bold; background: #1d4ed8; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
          @media print {
            .no-print { display: none; }
            body { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="print-btn" onclick="window.print()">인쇄 / PDF 저장</button>
        </div>
        <div class="head">
          <div>
            <h1>동아스틸 지게차 사용 및 TBM 점검 기록</h1>
            <div class="sub">DOSCO SAFETY SYSTEM · 지게차 키 수령/반납 및 점검표</div>
          </div>
          <div style="font-size: 12.5px; font-weight: bold;">상태: ${escapeHtml(item.status)}</div>
        </div>

        <table class="info-table">
          <tr>
            <th>지게차 종류</th>
            <td><b>${escapeHtml(item.forklift_type)}</b></td>
            <th>소속업체 / 사용자</th>
            <td>${escapeHtml(item.company_name)} / <b>${escapeHtml(item.user_name)}</b> (자격: ${escapeHtml(
      item.has_license
    )})</td>
          </tr>
          <tr>
            <th>수령장소</th>
            <td>${escapeHtml(item.pickup_location)}</td>
            <th>수령일시</th>
            <td>${escapeHtml(pickedStr)}</td>
          </tr>
          <tr>
            <th>반납장소</th>
            <td>${escapeHtml(item.status === "반납완료" ? item.return_location || "-" : "미반납")}</td>
            <th>반납일시</th>
            <td>${escapeHtml(returnedStr)}</td>
          </tr>
          <tr>
            <th>반납 특이사항</th>
            <td>${escapeHtml(
              item.status === "반납완료" ? item.return_issue_status || "없음" : "-"
            )}</td>
            <th>특이사항 메모</th>
            <td>${escapeHtml(item.return_note || "-")}</td>
          </tr>
        </table>

        <table class="chk-table">
          <thead>
            <tr>
              <th style="width: 7%;">번호</th>
              <th>작업 전 지게차 점검 항목 및 안전대책</th>
              <th style="width: 16%;">점검결과</th>
            </tr>
          </thead>
          <tbody>
            ${checklistRows}
          </tbody>
        </table>

        <div class="rule-box">
          <b>작업중 안전수칙 준수 여부:</b> ${
            chk.work_rules_agreed ? "작업중 안전수칙을 준수하겠습니다. (동의 완료)" : "미기록"
          }
          <br />
          <b>점검 및 반납 서약:</b> ${
            item.pledge_agreed
              ? "작업 전 지게차 점검을 완료하였고 안전하게 작업하고 종료 후 정해진 장소에 반납하겠습니다. (동의 완료)"
              : "미기록"
          }
        </div>

        <div class="media-grid">
          ${returnPhotoBlock}
          ${signatureBlock}
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 300);
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

  const activeCnt = logs.filter((l) => l.status === "사용중").length;
  const issueCnt = logs.filter((l) => l.return_issue_status === "있음").length;

  return (
    <main className="shell">
      <div className="pagehead">
        <div>
          <h1>지게차 관리자 대시보드</h1>
          <div className="muted">수령·반납 이력, 엑셀 다운로드(사진 포함), 건별 TBM 출력/PDF 저장</div>
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn" onClick={downloadExcelWithPhotos}>
            현황 엑셀 다운로드 (사진 포함)
          </button>
          <Link href="/" className="btn secondary">
            홈
          </Link>
          <Link href="/forklift-main" className="btn secondary">
            지게차 메뉴
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
          <div className="muted">반납 특이사항 있음</div>
          <div className="metric" style={{ color: "#dc2626" }}>
            {issueCnt}
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
          <h2 style={{ margin: 0 }}>지게차 사용 및 점검 기록</h2>
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
                <th>반납사진</th>
                <th>특이사항</th>
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
                    {item.return_photo_data ? (
                      <a href={item.return_photo_data} target="_blank" rel="noreferrer">
                        <img
                          src={item.return_photo_data}
                          alt="반납 사진"
                          style={{
                            width: 44,
                            height: 44,
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
                    {item.status === "반납완료" ? (
                      <span
                        className="pill"
                        style={{
                          background: item.return_issue_status === "있음" ? "#fee2e2" : "#dcfce7",
                          color: item.return_issue_status === "있음" ? "#dc2626" : "#15803d",
                        }}
                      >
                        {item.return_issue_status || "없음"}
                      </span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                        onClick={() => printSingleTbm(item)}
                      >
                        출력/PDF
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
                  <td colSpan={10} className="empty">
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
            <div className="row between" style={{ marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>지게차 사용 상세 내역</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "7px 12px", fontSize: 13 }}
                  onClick={() => printSingleTbm(selectedLog)}
                >
                  TBM 출력 / PDF 저장
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setSelectedLog(null)}
                >
                  닫기
                </button>
              </div>
            </div>

            <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              <b>지게차:</b> {selectedLog.forklift_type} / <b>상태:</b> {selectedLog.status}
              <br />
              <b>소속업체:</b> {selectedLog.company_name} / <b>사용자:</b> {selectedLog.user_name}{" "}
              (자격: {selectedLog.has_license})
              <br />
              <b>수령:</b> {selectedLog.pickup_location} (
              {new Date(selectedLog.picked_up_at).toLocaleString("ko-KR")})
              <br />
              <b>작업중 안전수칙 준수:</b>{" "}
              {selectedLog.checklist?.work_rules_agreed ? "준수 동의" : "미기록"}
              <br />
              <b>반납:</b>{" "}
              {selectedLog.status === "반납완료"
                ? `${selectedLog.return_location || "-"} (${
                    selectedLog.returned_at
                      ? new Date(selectedLog.returned_at).toLocaleString("ko-KR")
                      : "-"
                  })`
                : "미반납"}
              {selectedLog.status === "반납완료" && (
                <>
                  <br />
                  <b>반납 특이사항 유무:</b> {selectedLog.return_issue_status || "없음"}
                </>
              )}
              {selectedLog.return_note && (
                <>
                  <br />
                  <b>특이사항 메모:</b> {selectedLog.return_note}
                </>
              )}
            </p>

            <h4>작업 전 지게차 점검 결과</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.keys(PRE_WORK_LABELS).map((num) => {
                const info = PRE_WORK_LABELS[num];
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
                      <b>{num}.</b> {info.hazard}
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

            {selectedLog.return_photo_data && (
              <div style={{ marginTop: 16 }}>
                <h4>반납 사진</h4>
                <a href={selectedLog.return_photo_data} target="_blank" rel="noreferrer">
                  <img
                    src={selectedLog.return_photo_data}
                    alt="반납 사진"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 280,
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      padding: 4,
                      background: "#fafafa",
                    }}
                  />
                </a>
              </div>
            )}

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