"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ExcelJS from "exceljs";
import { supabase, configured } from "@/lib/supabase";

type PtwSignature = {
  id: string;
  worker_type: string;
  worker_name: string;
  signature_data: string;
};

type PtwApplication = {
  id: string;
  company_type: string;
  company_id: string | null;
  company_name: string | null;
  companies?: { name: string } | null;
  project_name: string;
  site_manager: string;
  contact_number: string;
  work_location: string;
  work_date: string;
  starts_at: string;
  ends_at: string;
  worker_count: number;
  work_content: string;
  safety_gear: string;
  work_types: string[];
  training_type: string;
  training_instructor: string;
  training_content: string;
  training_photo_path: string | null;
  status: string;
  created_at: string;
  ptw_signatures?: PtwSignature[];
};

export default function PtwAdminPage() {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");

  const [items, setItems] = useState<PtwApplication[]>([]);
  const [selectedItem, setSelectedItem] = useState<PtwApplication | null>(null);
  const [trainingPhotoUrl, setTrainingPhotoUrl] = useState<string>("");
  const [msg, setMsg] = useState("");

  async function verifyAdmin() {
    const { data: { session } } = await supabase.auth.getSession();
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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoginMsg("로그인 실패: " + error.message);
      return;
    }
    await verifyAdmin();
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setPassword("");
  }

  async function loadPtwList() {
    const { data, error } = await supabase
      .from("ptw_applications")
      .select("*, companies(name), ptw_signatures(*)")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg("목록 조회 오류: " + error.message);
      return;
    }
    setItems((data as PtwApplication[]) || []);
  }

  useEffect(() => {
    if (isAdmin) loadPtwList();
  }, [isAdmin]);

  function getCompanyName(item: PtwApplication) {
    if (item.company_type === "internal") {
      return item.companies?.name || "협력사";
    }
    return item.company_name || "외부업체";
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const label = status === "approved" ? "허가 승인" : "반려";
    if (!window.confirm(`해당 작업허가서를 '${label}' 처리하시겠습니까?`)) return;

    const { error } = await supabase
      .from("ptw_applications")
      .update({ status })
      .eq("id", id);

    if (error) {
      setMsg("상태 변경 실패: " + error.message);
      return;
    }
    setMsg(`${label} 처리가 완료되었습니다.`);
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem({ ...selectedItem, status });
    }
    loadPtwList();
  }

  async function openDetail(item: PtwApplication) {
    setSelectedItem(item);
    setTrainingPhotoUrl("");
    if (item.training_type === "photo" && item.training_photo_path) {
      const { data } = await supabase.storage
        .from("tbm-photos")
        .createSignedUrl(item.training_photo_path, 3600);
      if (data?.signedUrl) setTrainingPhotoUrl(data.signedUrl);
    }
  }

  async function downloadPermitExcel(item: PtwApplication) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("안전작업허가서");

    ws.columns = [
      { width: 14 },
      { width: 22 },
      { width: 16 },
      { width: 16 },
      { width: 14 },
      { width: 18 },
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    ws.mergeCells("A1:C2");
    ws.getCell("A1").value = "안 전 작 업 허 가 서";
    ws.getCell("A1").font = { size: 20, bold: true };
    ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };

    ws.getCell("D1").value = "담당";
    ws.getCell("E1").value = "확인";
    ws.getCell("F1").value = "공장장";
    ["D1", "E1", "F1"].forEach(cell => {
      ws.getCell(cell).alignment = { horizontal: "center", vertical: "middle" };
      ws.getCell(cell).font = { bold: true };
      ws.getCell(cell).border = thinBorder;
    });
    ws.getRow(2).height = 36;
    ["D2", "E2", "F2"].forEach(cell => {
      ws.getCell(cell).border = thinBorder;
      ws.getCell(cell).alignment = { horizontal: "center", vertical: "middle" };
    });
    if (item.status === "approved") {
      ws.getCell("D2").value = "승인완료";
    }

    ws.mergeCells("A3:F3");
    ws.getCell("A3").value = `(공사명 : ${item.project_name} )`;
    ws.getCell("A3").font = { bold: true };

    ws.getCell("A4").value = "업체명";
    ws.getCell("B4").value = getCompanyName(item);
    ws.getCell("C4").value = "현장관리감독자";
    ws.getCell("D4").value = item.site_manager;
    ws.getCell("E4").value = "TEL";
    ws.getCell("F4").value = item.contact_number || "";

    const types = item.work_types || [];
    const chk = (t: string) => (types.includes(t) ? "☑" : "☐") + t;

    ws.getCell("A5").value = "작업종류";
    ws.mergeCells("B5:F5");
    ws.getCell("B5").value = `${chk("일반작업")}   ${chk("화기작업")}   ${chk("페인트작업")}   ${chk("고소작업")}   ${chk("굴착작업")}   ${chk("전기작업")}`;

    ws.getCell("A6").value = "위험작업";
    ws.mergeCells("B6:F6");
    ws.getCell("B6").value = `${chk("제한공간(밀폐)작업")}   ${chk("중량물취급작업")}`;

    ws.mergeCells("A7:A8");
    ws.getCell("A7").value = "작업내용";
    ws.mergeCells("B7:D8");
    ws.getCell("B7").value = item.work_content;
    ws.getCell("B7").alignment = { vertical: "top", wrapText: true };

    ws.mergeCells("E7:F7");
    ws.getCell("E7").value = "안전보호장구";
    ws.getCell("E7").alignment = { horizontal: "center" };
    ws.mergeCells("E8:F8");
    ws.getCell("E8").value = item.safety_gear || "";
    ws.getCell("E8").alignment = { vertical: "top", wrapText: true };
    ws.getRow(8).height = 70;

    ws.getCell("A9").value = "작업일자";
    ws.mergeCells("B9:F9");
    ws.getCell("B9").value = `${item.work_date} (${item.starts_at?.slice(0, 5)} ~ ${item.ends_at?.slice(0, 5)})`;

    ws.getCell("A10").value = "작업인원";
    ws.mergeCells("B10:C10");
    ws.getCell("B10").value = `${item.worker_count} 명`;
    ws.getCell("D10").value = "담당자연락처";
    ws.mergeCells("E10:F10");
    ws.getCell("E10").value = item.contact_number || "";

    ws.getCell("A11").value = "작업장소";
    ws.mergeCells("B11:F11");
    ws.getCell("B11").value = item.work_location || "";

    ws.mergeCells("A12:F12");
    ws.getCell("A12").value = "상기와 같이 작업을 허가하오니 안전수칙을 준수하여 재해, 화재 및 환경오염 사고 발생하지 않도록 철저히 준수하시기 바랍니다.";
    ws.getRow(12).height = 30;
    ws.getCell("A12").alignment = { wrapText: true, vertical: "middle" };

    ws.mergeCells("A13:C13");
    ws.getCell("A13").value = `승인상태 : ${item.status === "approved" ? "허가완료" : item.status === "rejected" ? "반려" : "승인대기"}`;
    ws.mergeCells("D13:F13");
    ws.getCell("D13").value = `신청자 : ${item.site_manager} (서명완료)`;
    ws.getRow(13).height = 28;

    for (let r = 4; r <= 13; r++) {
      for (let c = 1; c <= 6; c++) {
        const cell = ws.getRow(r).getCell(c);
        cell.border = thinBorder;
        if (c === 1) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        }
      }
    }

    const sigSheet = wb.addWorksheet("서약 및 교육 서명명단");
    sigSheet.columns = [
      { header: "구분", key: "type", width: 15 },
      { header: "성명", key: "name", width: 20 },
      { header: "서명여부", key: "signed", width: 15 },
    ];
    (item.ptw_signatures || []).forEach(s => {
      sigSheet.addRow({ type: s.worker_type, name: s.worker_name, signed: "전자서명 완료" });
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `안전작업허가서_${getCompanyName(item)}_${item.work_date}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (checking) return <main className="shell"><div className="card">관리자 권한 확인 중...</div></main>;

  if (!isAdmin) {
    return (
      <main className="shell" style={{ maxWidth: 480, paddingTop: 70 }}>
        <div className="card">
          <div className="brand">DOSCO PTW SYSTEM</div>
          <h1>허가서 관리자 로그인</h1>
          <p className="muted">기존 TBM 관리자 계정으로 로그인해 주세요.</p>
          <div className="field">
            <label>이메일</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") login(); }} />
          </div>
          <button className="btn" style={{ width: "100%" }} onClick={login}>로그인</button>
          <Link href="/ptw" className="btn secondary" style={{ display: "block", width: "100%", marginTop: 10, textAlign: "center", textDecoration: "none" }}>
            허가서 메인으로 돌아가기
          </Link>
          {loginMsg && <p style={{ color: "#b33", fontSize: 13, marginTop: 10 }}>{loginMsg}</p>}
        </div>
      </main>
    );
  }

  const pendingCount = items.filter(i => i.status === "pending").length;
  const approvedCount = items.filter(i => i.status === "approved").length;

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <header className="topbar no-print">
        <div className="brand">DOSCO PTW SYSTEM<small>안전작업허가서 관리자 대시보드</small></div>
        <nav className="nav">
          <Link href="/">전체 홈</Link>
          <Link href="/ptw">허가서 메인</Link>
          <Link href="/ptw/status">승인 현황</Link>
          <button className="btn secondary" onClick={logout}>로그아웃</button>
        </nav>
      </header>

      <main className="shell no-print">
        <div className="pagehead">
          <div>
            <h1>안전작업허가서 승인 및 출력 관리</h1>
            <div className="muted">제출된 허가서를 검토·승인하고 양식 엑셀 또는 PDF로 출력합니다.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" onClick={loadPtwList}>새로고침</button>
            <button className="btn secondary" style={{ color: "#b91c1c", borderColor: "#fca5a5" }} onClick={logout}>로그아웃</button>
          </div>
        </div>

        <div className="grid section">
          <div className="card">
            <div className="muted">전체 제출 건수</div>
            <div className="metric">{items.length}</div>
          </div>
          <div className="card">
            <div className="muted">승인 대기</div>
            <div className="metric" style={{ color: "#d97706" }}>{pendingCount}</div>
          </div>
          <div className="card">
            <div className="muted">허가 완료</div>
            <div className="metric green">{approvedCount}</div>
          </div>
        </div>

        {msg && <p style={{ color: "#1d4ed8", fontWeight: "bold", marginBottom: 12 }}>{msg}</p>}

        <div className="card section">
          <h2>안전작업허가서 제출 기록</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>작업일자</th>
                  <th>업체명</th>
                  <th>공사명</th>
                  <th>작업종류</th>
                  <th>책임자</th>
                  <th>상태</th>
                  <th>승인 및 양식 출력</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>{item.work_date}</td>
                    <td><b>{getCompanyName(item)}</b></td>
                    <td>{item.project_name}</td>
                    <td>{(item.work_types || []).join(", ")}</td>
                    <td>{item.site_manager}</td>
                    <td>
                      {item.status === "approved" && <span className="pill ok">허가완료</span>}
                      {item.status === "pending" && <span className="pill wait">승인대기</span>}
                      {item.status === "rejected" && <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c" }}>반려</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn secondary" onClick={() => openDetail(item)}>상세/출력</button>
                        <button className="btn secondary" onClick={() => downloadPermitExcel(item)}>엑셀</button>
                        {item.status !== "approved" && (
                          <button className="btn" onClick={() => updateStatus(item.id, "approved")}>승인</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr>
                    <td colSpan={7} className="empty">제출된 안전작업허가서가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedItem && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, overflowY: "auto", padding: 20 }}>
          <div className="card" style={{ maxWidth: 800, margin: "0 auto", background: "#fff" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #ddd" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedItem.status !== "approved" && (
                  <button className="btn" onClick={() => updateStatus(selectedItem.id, "approved")}>허가 승인 처리</button>
                )}
                <button className="btn secondary" onClick={() => window.print()}>A4 인쇄 / PDF 저장</button>
                <button className="btn secondary" onClick={() => downloadPermitExcel(selectedItem)}>엑셀 양식 다운로드</button>
              </div>
              <button className="btn secondary" onClick={() => setSelectedItem(null)}>닫기</button>
            </div>

            <div id="print-area" style={{ padding: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td colSpan={4} rowSpan={2} style={{ border: "1px solid #000", textAlign: "center", fontSize: 22, fontWeight: "bold", padding: 12 }}>
                      안 전 작 업 허 가 서
                      <div style={{ fontSize: 13, fontWeight: "normal", marginTop: 6 }}>
                        (공사명 : {selectedItem.project_name})
                      </div>
                    </td>
                    <td style={{ border: "1px solid #000", textAlign: "center", width: 70, fontWeight: "bold" }}>담당</td>
                    <td style={{ border: "1px solid #000", textAlign: "center", width: 70, fontWeight: "bold" }}>확인</td>
                    <td style={{ border: "1px solid #000", textAlign: "center", width: 70, fontWeight: "bold" }}>공장장</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #000", height: 55, textAlign: "center", fontWeight: "bold", color: "#15803d" }}>
                      {selectedItem.status === "approved" ? "승인완료" : ""}
                    </td>
                    <td style={{ border: "1px solid #000", height: 55 }}></td>
                    <td style={{ border: "1px solid #000", height: 55 }}></td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8, width: 110 }}>업체명</th>
                    <td style={{ border: "1px solid #000", padding: 8 }}>{getCompanyName(selectedItem)}</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8, width: 120 }}>현장관리감독자</th>
                    <td style={{ border: "1px solid #000", padding: 8 }}>{selectedItem.site_manager}</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8 }}>TEL</th>
                    <td colSpan={2} style={{ border: "1px solid #000", padding: 8 }}>{selectedItem.contact_number}</td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8 }}>작업종류</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 8 }}>
                      {(selectedItem.work_types || []).join(" / ")}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8, height: 110 }}>작업내용</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 8, verticalAlign: "top", whiteSpace: "pre-wrap" }}>
                      {selectedItem.work_content}
                    </td>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 8, verticalAlign: "top" }}>
                      <div style={{ fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 4, marginBottom: 6, textAlign: "center" }}>안전보호장구</div>
                      {selectedItem.safety_gear}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8 }}>작업일자</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 8 }}>
                      {selectedItem.work_date} ({selectedItem.starts_at?.slice(0, 5)} ~ {selectedItem.ends_at?.slice(0, 5)})
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8 }}>작업인원</th>
                    <td colSpan={2} style={{ border: "1px solid #000", padding: 8 }}>{selectedItem.worker_count} 명</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 8 }}>작업장소</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 8 }}>{selectedItem.work_location}</td>
                  </tr>
                  <tr>
                    <td colSpan={7} style={{ border: "1px solid #000", padding: 10 }}>
                      상기와 같이 작업을 허가하오니 안전수칙을 준수하여 재해, 화재 및 환경오염 사고 발생하지 않도록 철저히 준수하시기 바랍니다.
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginTop: 16, border: "1px solid #000", padding: 10 }}>
                <div style={{ fontWeight: "bold", marginBottom: 6 }}>[안전교육일지 및 참여자 서약 서명]</div>
                {selectedItem.training_type === "form" ? (
                  <div style={{ fontSize: 13, marginBottom: 10, whiteSpace: "pre-wrap" }}>
                    <b>강사:</b> {selectedItem.training_instructor || "-"}<br />
                    <b>교육내용:</b><br />{selectedItem.training_content}
                  </div>
                ) : (
                  <div style={{ marginBottom: 10 }}>
                    {trainingPhotoUrl ? (
                      <img src={trainingPhotoUrl} alt="교육일지" style={{ maxHeight: 200, border: "1px solid #ccc" }} />
                    ) : (
                      <span className="muted">첨부된 교육일지 사진 없음</span>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
                  {(selectedItem.ptw_signatures || []).map(sig => (
                    <div key={sig.id} style={{ border: "1px solid #999", padding: 6, textAlign: "center", width: 110 }}>
                      <img src={sig.signature_data} alt="서명" style={{ width: "100%", height: 45, objectFit: "contain" }} />
                      <div style={{ fontSize: 12 }}>{sig.worker_name} ({sig.worker_type})</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}