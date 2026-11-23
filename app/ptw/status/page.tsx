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
  training_type: string;
  training_instructor: string;
  training_content: string;
  training_photo_path: string | null;
  status: string;
  created_at: string;
  ptw_signatures?: PtwSignature[];
};

export default function PtwStatusPage() {
  const [items, setItems] = useState<PtwApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PtwApplication | null>(null);
  const [trainingPhotoUrl, setTrainingPhotoUrl] = useState<string>("");
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
              제출한 허가서의 승인 여부(승인대기·허가완료)를 확인하고 상세/출력 버튼으로 현장 비치용 허가서를 인쇄할 수 있습니다.
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
          <div className="card" style={{ maxWidth: 800, margin: "0 auto", background: "#fff" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #ddd" }}>
              <button className="btn" onClick={() => window.print()}>A4 인쇄 / PDF 저장</button>
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