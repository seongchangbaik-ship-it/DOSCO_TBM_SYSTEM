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
  fire_work_details?: Record<string, any>;
  heavy_lifting_details?: Record<string, any>;
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
  const [fireAttachUrls, setFireAttachUrls] = useState<string[]>([]);
  const [heavyDrawingUrls, setHeavyDrawingUrls] = useState<string[]>([]);
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

  async function getSignedFileUrl(path?: string | null) {
    if (!path) return "";
    const { data } = await supabase.storage.from("tbm-photos").createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }

  async function openDetail(item: PtwApplication) {
    setSelectedItem(item);
    setTrainingPhotoUrl("");
    setFireAttachUrls([]);
    setHeavyDrawingUrls([]);

    if (item.training_type === "photo" && item.training_photo_path) {
      setTrainingPhotoUrl(await getSignedFileUrl(item.training_photo_path));
    }

    const fPaths: string[] = item.fire_work_details?.attachmentPaths ||
      (item.fire_work_details?.attachmentPath ? [item.fire_work_details.attachmentPath] : []);
    if (fPaths.length > 0) {
      const urls = await Promise.all(fPaths.map(p => getSignedFileUrl(p)));
      setFireAttachUrls(urls.filter(Boolean));
    }

    const hPaths: string[] = item.heavy_lifting_details?.drawingPaths ||
      (item.heavy_lifting_details?.drawingPath ? [item.heavy_lifting_details.drawingPath] : []);
    if (hPaths.length > 0) {
      const urls = await Promise.all(hPaths.map(p => getSignedFileUrl(p)));
      setHeavyDrawingUrls(urls.filter(Boolean));
    }
  }

  async function downloadPermitExcel(item: PtwApplication) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("안전작업허가서");

    ws.columns = [
      { width: 15 },
      { width: 22 },
      { width: 16 },
      { width: 20 },
      { width: 14 },
      { width: 18 },
    ];

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    const common = item.fire_work_details?._common || {};
    const vehicles = common.vehicles || [];
    const fireItems = item.fire_work_details?.fireItems || [];

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
    ws.getCell("B5").value = `${chk("일반작업")}  ${chk("화기작업")}  ${chk("페인트작업")}  ${chk("고소작업")}  ${chk("굴착작업")}  ${chk("전기작업")}`;

    ws.getCell("A6").value = "위험작업";
    ws.mergeCells("B6:F6");
    ws.getCell("B6").value = `${chk("제한공간(밀폐)작업")}  ${chk("중량물취급작업")}  ${chk("방사능작업")}  ${chk("환경")}  ${chk("Utility 작업")}  ${chk("석면작업")}`;

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
    ws.getRow(8).height = 65;

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

    // 화기현황 요약 행
    ws.getCell("A12").value = "화기현황";
    ws.mergeCells("B12:F12");
    ws.getCell("B12").value = fireItems.length > 0
      ? fireItems.map((f: any) => `${f.name}(${f.count}대, 안전장치:${f.safetyDevice}, ${f.working})`).join(" / ")
      : "해당없음";

    // 차량 및 중장비 현황 요약 행
    ws.getCell("A13").value = "차량·중장비";
    ws.mergeCells("B13:F13");
    ws.getCell("B13").value = vehicles.length > 0
      ? vehicles.map((v: any) => `${v.name}(${v.count}대, 안전장치:${v.safetyDevice})`).join(" / ")
      : "해당없음";

    // 특별요구사항
    ws.getCell("A14").value = "특별요구(환경)";
    ws.mergeCells("B14:F14");
    ws.getCell("B14").value = common.specialEnv || "";

    ws.getCell("A15").value = "특별요구(안전)";
    ws.mergeCells("B15:F15");
    ws.getCell("B15").value = common.specialSafety || "";

    ws.mergeCells("A16:F16");
    ws.getCell("A16").value = "상기와 같이 작업을 허가하오니 안전수칙을 준수하여 재해, 화재 및 환경오염 사고 발생하지 않도록 철저히 준수하시기 바랍니다.";
    ws.getRow(16).height = 28;
    ws.getCell("A16").alignment = { wrapText: true, vertical: "middle" };

    ws.mergeCells("A17:C17");
    ws.getCell("A17").value = `승인상태 : ${item.status === "approved" ? "허가완료" : item.status === "rejected" ? "반려" : "승인대기"}`;
    ws.mergeCells("D17:F17");
    ws.getCell("D17").value = `신청자 : ${item.site_manager} (서명완료)`;
    ws.getRow(17).height = 26;

    for (let r = 4; r <= 17; r++) {
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

    // 화기작업 시트
    if (types.includes("화기작업") && item.fire_work_details) {
      const f = item.fire_work_details;
      const fSheet = wb.addWorksheet("화기취급작업 신청서");
      fSheet.columns = [{ width: 18 }, { width: 55 }];
      const fRows = [
        ["작업명칭", item.project_name],
        ["작업기간", `${item.work_date} ${item.starts_at?.slice(0, 5)} ~ ${item.ends_at?.slice(0, 5)}`],
        ["작업장소", item.work_location],
        ["작업 책임자", `${item.site_manager} (${item.contact_number || ""})`],
        ["화재감시자", f.fireWatcher || ""],
        ["작업종류", f.fireWorkType || ""],
        ["화기현황", fireItems.map((fi: any) => `${fi.name} / 수량:${fi.count} / 안전장치:${fi.safetyDevice} / 작동:${fi.working} / ${fi.note}`).join("\n")],
        ["작업절차", f.procedure || ""],
        ["보충작업 필요여부", (f.supplementaryWorks || []).join(", ") || "해당없음"],
      ];
      fRows.forEach(([k, v]) => {
        const row = fSheet.addRow([k, v]);
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
        row.eachCell(c => { c.border = thinBorder; c.alignment = { wrapText: true, vertical: "middle" }; });
      });
    }

    // 중량물작업 시트
    if (types.includes("중량물취급작업") && item.heavy_lifting_details) {
      const h = item.heavy_lifting_details;
      const hSheet = wb.addWorksheet("중량물 취급 작업계획서");
      hSheet.columns = [{ width: 22 }, { width: 55 }];
      const personnelText = (h.personnel || [])
        .map((p: any) => `[${p.role}] ${p.nameContact} / 위치:${p.location} / 보호구:${p.ppe} / 자격:${p.license}`)
        .join("\n");
      const hRows = [
        ["작업명", item.project_name],
        ["작업일시 / 장소", `${item.work_date} (${item.starts_at?.slice(0, 5)}~${item.ends_at?.slice(0, 5)}) / ${item.work_location}`],
        ["신호방법 / 제한속도", `${h.signalMethod || ""} / ${h.speedLimit || ""}`],
        ["직책별 작업인원", personnelText],
        ["작업순서", h.workSequence || ""],
        ["중량물 품명 / 형상", `${h.itemName || ""} / ${h.itemShape || ""}`],
        ["중량물 규격", h.itemSpec || ""],
        ["총중량 / 1회 운반중량", `${h.totalWeight || ""} / ${h.singleWeight || ""}`],
        ["고정방법", h.fixingMethod || ""],
        ["기계명 / 기계번호", `${h.machineName || ""} / ${h.machineNo || ""}`],
        ["모델명 / 규격", `${h.modelName || ""} / ${h.machineSpec || ""}`],
        ["작업능력 / 반경", `${h.capacity || ""} / ${h.radius || ""}`],
        ["조종(운전)자격", h.operatorLicense || ""],
        ["보험기간 / 검사여부", `${h.insurancePeriod || ""} / ${h.inspectionStatus || ""}`],
        ["줄걸이 방법 / 운반거리", `${h.slingingMethod || ""} / ${h.transportDistance || ""}`],
        ["줄걸이 용구(달기구)", h.slingingGear || ""],
        ["[작업 전] 위험요인 / 대책", `${h.preWorkHazard || ""} → ${h.preWorkMeasure || ""}`],
        ["[운반(인양)] 위험요인 / 대책", `${h.liftingHazard || ""} → ${h.liftingMeasure || ""}`],
        ["[인양물 안착] 위험요인 / 대책", `${h.landingHazard || ""} → ${h.landingMeasure || ""}`],
      ];
      hRows.forEach(([k, v]) => {
        const row = hSheet.addRow([k, v]);
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
        row.eachCell(c => { c.border = thinBorder; c.alignment = { wrapText: true, vertical: "middle" }; });
      });
    }

    // 참여자 서약 명단 시트
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

  const commonExtra = selectedItem?.fire_work_details?._common || {};
  const selectedVehicles: any[] = commonExtra.vehicles || [];
  const selectedFireItems: any[] = selectedItem?.fire_work_details?.fireItems || [];
  const selectedHeavyPersonnel: any[] = selectedItem?.heavy_lifting_details?.personnel || [];

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; box-shadow: none !important; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; margin-top: 24px; }
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
          <div className="card" style={{ maxWidth: 840, margin: "0 auto", background: "#fff" }}>
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
              {/* 1. 기본 안전작업허가서 */}
              <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td colSpan={4} rowSpan={2} style={{ border: "1px solid #000", textAlign: "center", fontSize: 22, fontWeight: "bold", padding: 10 }}>
                      안 전 작 업 허 가 서
                      <div style={{ fontSize: 13, fontWeight: "normal", marginTop: 4 }}>
                        (공사명 : {selectedItem.project_name})
                      </div>
                    </td>
                    <td style={{ border: "1px solid #000", textAlign: "center", width: 65, fontWeight: "bold" }}>담당</td>
                    <td style={{ border: "1px solid #000", textAlign: "center", width: 65, fontWeight: "bold" }}>확인</td>
                    <td style={{ border: "1px solid #000", textAlign: "center", width: 65, fontWeight: "bold" }}>공장장</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #000", height: 50, textAlign: "center", fontWeight: "bold", color: "#15803d" }}>
                      {selectedItem.status === "approved" ? "승인완료" : ""}
                    </td>
                    <td style={{ border: "1px solid #000", height: 50 }}></td>
                    <td style={{ border: "1px solid #000", height: 50 }}></td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, width: 105 }}>업체명</th>
                    <td style={{ border: "1px solid #000", padding: 6 }}>{getCompanyName(selectedItem)}</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, width: 110 }}>현장관리감독자</th>
                    <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.site_manager}</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>TEL</th>
                    <td colSpan={2} style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.contact_number}</td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업종류</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 6 }}>
                      {(selectedItem.work_types || []).join(" / ")}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, height: 85 }}>작업내용</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 6, verticalAlign: "top", whiteSpace: "pre-wrap" }}>
                      {selectedItem.work_content}
                    </td>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 6, verticalAlign: "top" }}>
                      <div style={{ fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 3, marginBottom: 4, textAlign: "center" }}>안전보호장구</div>
                      {selectedItem.safety_gear}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업일자</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 6 }}>
                      {selectedItem.work_date} ({selectedItem.starts_at?.slice(0, 5)} ~ {selectedItem.ends_at?.slice(0, 5)})
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업인원</th>
                    <td colSpan={2} style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.worker_count} 명</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업장소</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.work_location}</td>
                  </tr>
                  {/* 화기현황 표 */}
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>화기현황</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 0 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>화기명</th>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4, width: 50 }}>수량</th>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>안전장치명</th>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4, width: 65 }}>작동유무</th>
                            <th style={{ borderBottom: "1px solid #000", padding: 4 }}>비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFireItems.length > 0 ? selectedFireItems.map((fi, i) => (
                            <tr key={i}>
                              <td style={{ borderRight: "1px solid #000", padding: 4 }}>{fi.name}</td>
                              <td style={{ borderRight: "1px solid #000", padding: 4, textAlign: "center" }}>{fi.count}</td>
                              <td style={{ borderRight: "1px solid #000", padding: 4 }}>{fi.safetyDevice}</td>
                              <td style={{ borderRight: "1px solid #000", padding: 4, textAlign: "center" }}>{fi.working}</td>
                              <td style={{ padding: 4 }}>{fi.note}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={5} style={{ padding: 4, textAlign: "center", color: "#666" }}>해당없음</td></tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  {/* 차량 및 중장비 현황 표 */}
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>차량·중장비</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 0 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>장비명</th>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4, width: 50 }}>수량</th>
                            <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>안전장치명</th>
                            <th style={{ borderBottom: "1px solid #000", padding: 4 }}>기타장비/비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedVehicles.length > 0 ? selectedVehicles.map((v, i) => (
                            <tr key={i}>
                              <td style={{ borderRight: "1px solid #000", padding: 4 }}>{v.name}</td>
                              <td style={{ borderRight: "1px solid #000", padding: 4, textAlign: "center" }}>{v.count}</td>
                              <td style={{ borderRight: "1px solid #000", padding: 4 }}>{v.safetyDevice}</td>
                              <td style={{ padding: 4 }}>{v.etc}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={4} style={{ padding: 4, textAlign: "center", color: "#666" }}>해당없음</td></tr>
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>특별요구(환경)</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 6 }}>{commonExtra.specialEnv || "-"}</td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>특별요구(안전)</th>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: 6 }}>{commonExtra.specialSafety || "-"}</td>
                  </tr>
                  <tr>
                    <td colSpan={7} style={{ border: "1px solid #000", padding: 8 }}>
                      상기와 같이 작업을 허가하오니 안전수칙을 준수하여 재해, 화재 및 환경오염 사고 발생하지 않도록 철저히 준수하시기 바랍니다.
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 2. 화기취급작업 신청서 */}
              {(selectedItem.work_types || []).includes("화기작업") && selectedItem.fire_work_details && (
                <div className="page-break" style={{ marginTop: 20 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <th colSpan={4} style={{ border: "1px solid #000", background: "#374151", color: "#fff", padding: 8, fontSize: 15 }}>
                          화 기 취 급 작 업 신 청 서
                        </th>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, width: 120 }}>작업명칭</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.project_name}</td>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, width: 120 }}>화재감시자</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.fire_work_details.fireWatcher || "-"}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>화기 작업종류</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.fire_work_details.fireWorkType || "-"}</td>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>보충작업</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>
                          {(selectedItem.fire_work_details.supplementaryWorks || []).join(", ") || "해당없음"}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업절차</th>
                        <td colSpan={3} style={{ border: "1px solid #000", padding: 6, whiteSpace: "pre-wrap" }}>
                          {selectedItem.fire_work_details.procedure || "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {fireAttachUrls.length > 0 && (
                    <div style={{ marginTop: 8, border: "1px solid #000", padding: 8 }}>
                      <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 6 }}>[화기작업 첨부자료]</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {fireAttachUrls.map((url, idx) => (
                          <img key={idx} src={url} alt="화기 첨부" style={{ maxHeight: 200, border: "1px solid #ccc" }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. 중량물 취급 작업계획서 */}
              {(selectedItem.work_types || []).includes("중량물취급작업") && selectedItem.heavy_lifting_details && (
                <div className="page-break" style={{ marginTop: 20 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", fontSize: 12 }}>
                    <tbody>
                      <tr>
                        <th colSpan={4} style={{ border: "1px solid #000", background: "#1e3a8a", color: "#fff", padding: 8, fontSize: 15 }}>
                          중 량 물 취 급 작 업 계 획 서
                        </th>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, width: 125 }}>신호방법</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.signalMethod}</td>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6, width: 125 }}>제한속도</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.speedLimit}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>직책별 작업인원</th>
                        <td colSpan={3} style={{ border: "1px solid #000", padding: 0 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                            <thead>
                              <tr style={{ background: "#f9fafb" }}>
                                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>직책</th>
                                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>성명 및 연락처</th>
                                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>작업위치</th>
                                <th style={{ borderRight: "1px solid #000", borderBottom: "1px solid #000", padding: 4 }}>보호구</th>
                                <th style={{ borderBottom: "1px solid #000", padding: 4 }}>필요자격</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedHeavyPersonnel.map((p, i) => (
                                <tr key={i}>
                                  <td style={{ borderRight: "1px solid #000", padding: 4 }}>{p.role}</td>
                                  <td style={{ borderRight: "1px solid #000", padding: 4 }}>{p.nameContact}</td>
                                  <td style={{ borderRight: "1px solid #000", padding: 4 }}>{p.location}</td>
                                  <td style={{ borderRight: "1px solid #000", padding: 4 }}>{p.ppe}</td>
                                  <td style={{ padding: 4 }}>{p.license}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업순서</th>
                        <td colSpan={3} style={{ border: "1px solid #000", padding: 6, whiteSpace: "pre-wrap" }}>
                          {selectedItem.heavy_lifting_details.workSequence}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#e5e7eb", padding: 6 }}>중량물 품명/형상</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.itemName} ({selectedItem.heavy_lifting_details.itemShape})</td>
                        <th style={{ border: "1px solid #000", background: "#e5e7eb", padding: 6 }}>총중량 / 1회중량</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.totalWeight} / {selectedItem.heavy_lifting_details.singleWeight}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#e5e7eb", padding: 6 }}>중량물 규격</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.itemSpec}</td>
                        <th style={{ border: "1px solid #000", background: "#e5e7eb", padding: 6 }}>고정방법</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.fixingMethod}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>기계명 / 번호</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.machineName} ({selectedItem.heavy_lifting_details.machineNo})</td>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>모델 / 규격</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.modelName} / {selectedItem.heavy_lifting_details.machineSpec}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업능력 / 반경</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.capacity} / {selectedItem.heavy_lifting_details.radius}</td>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>조종자격 / 검사</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.operatorLicense} / {selectedItem.heavy_lifting_details.inspectionStatus}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>보험기간 / 운반거리</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.insurancePeriod} / {selectedItem.heavy_lifting_details.transportDistance}</td>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>줄걸이 방법/용구</th>
                        <td style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.heavy_lifting_details.slingingMethod} / {selectedItem.heavy_lifting_details.slingingGear}</td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업 전 예방대책</th>
                        <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>
                          <b>[위험요인]</b> {selectedItem.heavy_lifting_details.preWorkHazard} / <b>[대책]</b> {selectedItem.heavy_lifting_details.preWorkMeasure}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>운반(인양) 대책</th>
                        <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>
                          <b>[위험요인]</b> {selectedItem.heavy_lifting_details.liftingHazard} / <b>[대책]</b> {selectedItem.heavy_lifting_details.liftingMeasure}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>안착작업 대책</th>
                        <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>
                          <b>[위험요인]</b> {selectedItem.heavy_lifting_details.landingHazard} / <b>[대책]</b> {selectedItem.heavy_lifting_details.landingMeasure}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {heavyDrawingUrls.length > 0 && (
                    <div style={{ marginTop: 8, border: "1px solid #000", padding: 8 }}>
                      <div style={{ fontWeight: "bold", fontSize: 12, marginBottom: 6 }}>[운반경로(작업도면) 및 기타 붙임자료]</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {heavyDrawingUrls.map((url, idx) => (
                          <img key={idx} src={url} alt="작업도면" style={{ maxHeight: 220, border: "1px solid #ccc" }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. 교육일지 및 서약 서명란 */}
              <div style={{ marginTop: 16, border: "1px solid #000", padding: 10 }}>
                <div style={{ fontWeight: "bold", marginBottom: 6 }}>[안전교육일지 및 참여자 서약 서명]</div>
                {selectedItem.training_type === "form" ? (
                  <div style={{ fontSize: 12, marginBottom: 10, whiteSpace: "pre-wrap" }}>
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