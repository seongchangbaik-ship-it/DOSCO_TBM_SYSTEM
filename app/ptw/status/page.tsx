"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  rejection_reason?: string | null;
  created_at: string;
  ptw_signatures?: PtwSignature[];
};

export default function PtwStatusPage() {
  const [items, setItems] = useState<PtwApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PtwApplication | null>(null);
  const [trainingPhotoUrl, setTrainingPhotoUrl] = useState<string>("");
  const [fireAttachUrls, setFireAttachUrls] = useState<string[]>([]);
  const [heavyDrawingUrls, setHeavyDrawingUrls] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  async function loadPtwList() {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ptw_applications")
      .select("*, companies(name), ptw_signatures(*)")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg("목록 조회 오류: " + error.message);
    } else {
      setItems((data as PtwApplication[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPtwList();
  }, []);

  function getCompanyName(item: PtwApplication) {
    if (item.company_type === "internal") {
      return item.companies?.name || "협력사";
    }
    return item.company_name || "외부업체";
  }

  function formatWorkDate(item: PtwApplication) {
    const common = item.fire_work_details?._common || {};
    if (common.workPeriodType === "period" && common.endDate && common.endDate !== item.work_date) {
      return `${item.work_date} ~ ${common.endDate}`;
    }
    return item.work_date;
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
        <div className="brand">
          DOSCO PTW SYSTEM
          <small>안전작업허가서 승인 현황</small>
        </div>
        <nav className="nav">
          <Link href="/">전체 홈</Link>
          <Link href="/ptw">허가서 메인</Link>
          <Link href="/ptw/apply">허가서 작성</Link>
        </nav>
      </header>

      <main className="shell no-print">
        <div className="pagehead">
          <div>
            <h1>안전작업허가서 승인 현황</h1>
            <div className="muted">
              제출한 허가서의 승인 여부(승인대기·허가완료·반려 사유)를 확인하고 상세/출력 버튼으로 현장 비치용 허가서를 인쇄할 수 있습니다.
            </div>
          </div>
          <button className="btn secondary" onClick={loadPtwList}>새로고침</button>
        </div>

        {msg && <p style={{ color: "#b33", marginBottom: 12 }}>{msg}</p>}

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
                  <th>출력</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="empty">불러오는 중...</td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map(item => (
                    <tr key={item.id}>
                      <td>{formatWorkDate(item)}</td>
                      <td><b>{getCompanyName(item)}</b></td>
                      <td>{item.project_name}</td>
                      <td>{(item.work_types || []).join(", ")}</td>
                      <td>{item.site_manager}</td>
                      <td>
                        {item.status === "approved" && <span className="pill ok">허가완료</span>}
                        {item.status === "pending" && <span className="pill wait">승인대기</span>}
                        {item.status === "rejected" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c" }}>반려</span>
                            {item.rejection_reason && (
                              <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 500 }}>
                                사유: {item.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <button className="btn secondary" onClick={() => openDetail(item)}>상세/출력</button>
                      </td>
                    </tr>
                  ))
                ) : (
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
              <button className="btn" onClick={() => window.print()}>A4 인쇄 / PDF 저장</button>
              <button className="btn secondary" onClick={() => setSelectedItem(null)}>닫기</button>
            </div>

            {selectedItem.status === "rejected" && (
              <div className="no-print" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                <b>[반려 처리됨]</b> 사유: {selectedItem.rejection_reason || "사유 미입력"}
              </div>
            )}

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
                      {formatWorkDate(selectedItem)} ({selectedItem.starts_at?.slice(0, 5)} ~ {selectedItem.ends_at?.slice(0, 5)})
                    </td>
                  </tr>
                  <tr>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업인원</th>
                    <td colSpan={2} style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.worker_count} 명</td>
                    <th style={{ border: "1px solid #000", background: "#f3f4f6", padding: 6 }}>작업장소</th>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: 6 }}>{selectedItem.work_location}</td>
                  </tr>
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