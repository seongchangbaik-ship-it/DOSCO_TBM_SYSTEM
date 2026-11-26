"use client";
import { useEffect, useRef, useState } from "react";
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

const PLEDGE_ITEMS = [
  "1. 도급공사 관련 작업허가신청서를 작성·제출하여 공장장의 승인을 득한 후 작업한다.",
  "2. 작업자에 필요한 안전보건교육을 실시 후 작업한다.",
  "3. 작업현장 내 작업 시 보호구(안전헬멧, 안전화) 착용하여 작업한다.",
  "4. 고소작업, 전기작업, 화기작업(용접, 절단 등)의 안전수칙 준수하여 작업한다.",
  "5. 작업 전에는 반드시 작업준비 상태를 점검 및 위험예지훈련(TBM)을 실시한다.",
  "6. 작업현장 내 모든 위험작업의 수행은 위험성평가를 실시한 후 작업한다.",
  "7. 사다리 작업 시 최상부에는 올라가서 작업하지 않는다.",
  "8. 작업현장에 대한 안전점검을 실시하고 안전점검표 작성·보관한다.",
  "9. 밀폐공간출입, 중량물 취급, 굴착작업은 안전수칙을 준수하여 작업한다.",
  "10. 중장비 사용 시 사용승인을 받고, 신호수 배치하여 작업한다.",
  "11. 작업현장 내 작업 시 안전장치나 안전시설물은 임의로 해체하지 않는다.",
  "12. 작업현장 정리정돈 철저, 흡연구역 이외의 흡연행위 금지한다.",
  "13. 작업 시 산업안전보건법, 중대재해처벌법 등 기타 관련법규를 준수하여 작업한다.",
  "14. 안전보건공단에서 Guide하는 안전수칙 준수한다.",
  "15. 귀사 안전·보건에 관한 요구사항 준수하여 이행한다.",
  "16. 상기 내용을 지키지 않을 경우 작업을 중지한다.",
];

export default function PtwStatusPage() {
  const [items, setItems] = useState<PtwApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<PtwApplication | null>(null);
  const [trainingPhotoUrl, setTrainingPhotoUrl] = useState<string>("");
  const [fireAttachUrls, setFireAttachUrls] = useState<string[]>([]);
  const [heavyDrawingUrls, setHeavyDrawingUrls] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  // 3. 교육일지 추가제출 모달 상태
  const [trainingModalItem, setTrainingModalItem] = useState<PtwApplication | null>(null);
  const [tType, setTType] = useState<"form" | "photo">("form");
  const [tInstructor, setTInstructor] = useState("");
  const [tContent, setTContent] = useState(
    "1. 작업장 주변 인화물질 제거\n2. 소화기 비치\n3. 안전관리자 입회, 작업지휘\n4. 보호구 착용\n5. 작업전 안전교육 실시\n6. 작업감독자 작업절차 순서 지정\n7. 마스크 착용\n8. 상차 작업 시 안전거리(5m) 확보\n9. 작업인원 외 접근 금지\n10. 작업구역 접근금지 표시 (주차콘)"
  );
  const [tAttendees, setTAttendees] = useState<string[]>([""]);
  const [tPhoto, setTPhoto] = useState<File | null>(null);
  const [tSaving, setTSaving] = useState(false);

  // 4. 서약·서명 추가제출 모달 상태
  const [pledgeModalItem, setPledgeModalItem] = useState<PtwApplication | null>(null);
  const [pSignType, setPSignType] = useState("근로자");
  const [pSignName, setPSignName] = useState("");
  const [pHasDrawn, setPHasDrawn] = useState(false);
  const [pSaving, setPSaving] = useState(false);
  const [pCopyMsg, setPCopyMsg] = useState("");
  const pCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pIsDrawing, setPIsDrawing] = useState(false);

  async function compressImage(file: File): Promise<Blob | File> {
    if (!file.type.startsWith("image/")) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxSide = 1280;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) resolve(blob);
            else resolve(file);
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  }

  function openTrainingModal(item: PtwApplication) {
    setTrainingModalItem(item);
    setTType("form");
    setTInstructor(item.site_manager || "");
    setTAttendees([""]);
    setTPhoto(null);
  }

  async function submitLateTraining() {
    if (!trainingModalItem) return;
    if (tType === "form" && (!tInstructor.trim() || !tContent.trim())) {
      alert("교육 강사와 교육 내용을 입력해 주세요.");
      return;
    }
    if (tType === "photo" && !tPhoto) {
      alert("안전교육일지 사진을 선택해 주세요.");
      return;
    }
    setTSaving(true);
    let photoPath: string | null = trainingModalItem.training_photo_path || null;
    if (tType === "photo" && tPhoto) {
      const compressed = await compressImage(tPhoto);
      const isJpeg = compressed !== tPhoto;
      const ext = isJpeg ? "jpg" : (tPhoto.name.split(".").pop() || "jpg");
      const path = `ptw-training/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("tbm-photos").upload(path, compressed, {
        contentType: isJpeg ? "image/jpeg" : tPhoto.type,
      });
      if (upErr) {
        alert("사진 업로드 실패: " + upErr.message);
        setTSaving(false);
        return;
      }
      photoPath = path;
    }

    const prevDetails = trainingModalItem.fire_work_details || {};
    const prevCommon = prevDetails._common || {};
    const nextDetails = {
      ...prevDetails,
      _common: {
        ...prevCommon,
        trainingPending: false,
        trainingAttendees: tType === "form"
          ? tAttendees.map(s => s.trim()).filter(Boolean).join(", ")
          : "",
      },
    };

    const { error } = await supabase
      .from("ptw_applications")
      .update({
        training_type: tType,
        training_instructor: tType === "form" ? tInstructor.trim() : "",
        training_content: tType === "form" ? tContent : "",
        training_photo_path: photoPath,
        fire_work_details: nextDetails,
      })
      .eq("id", trainingModalItem.id);

    setTSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setTrainingModalItem(null);
    loadPtwList();
  }

  function openPledgeModal(item: PtwApplication) {
    setPledgeModalItem(item);
    setPSignType("근로자");
    setPSignName("");
    setPHasDrawn(false);
    setPCopyMsg("");
  }

  async function refreshPledgeModalItem() {
    if (!pledgeModalItem) return;
    const { data } = await supabase
      .from("ptw_applications")
      .select("*, companies(name), ptw_signatures(*)")
      .eq("id", pledgeModalItem.id)
      .maybeSingle();
    if (data) setPledgeModalItem(data as PtwApplication);
    loadPtwList();
  }

  const getPCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
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

  const startPDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = pCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getPCoords(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(x, y);
    setPIsDrawing(true);
    setPHasDrawn(true);
  };

  const drawP = (e: React.MouseEvent | React.TouchEvent) => {
    if (!pIsDrawing || !pCanvasRef.current) return;
    const canvas = pCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopPDrawing = () => setPIsDrawing(false);

  const clearPCanvas = () => {
    const canvas = pCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPHasDrawn(false);
  };

  async function addDeviceSignature() {
    if (!pledgeModalItem) return;
    if (!pSignName.trim()) {
      alert("서명할 작업자 성명을 입력해 주세요.");
      return;
    }
    if (!pHasDrawn || !pCanvasRef.current) {
      alert("서명란에 서명을 해 주세요.");
      return;
    }
    setPSaving(true);
    const dataUrl = pCanvasRef.current.toDataURL("image/png");
    const { error } = await supabase.from("ptw_signatures").insert({
      ptw_id: pledgeModalItem.id,
      worker_type: pSignType,
      worker_name: pSignName.trim(),
      signature_data: dataUrl,
    });
    setPSaving(false);
    if (error) {
      alert("서명 추가 오류: " + error.message);
      return;
    }
    setPSignName("");
    setPSignType("근로자");
    clearPCanvas();
    await refreshPledgeModalItem();
  }

  async function copyWorkerSignLink() {
    if (!pledgeModalItem) return;
    const shareUrl = `${window.location.origin}/ptw/sign?id=${pledgeModalItem.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setPCopyMsg("서명 링크가 복사되었습니다! 현장 카톡방에 붙여넣어 근로자들에게 공유해 주세요.");
    } catch {
      window.prompt("아래 링크를 복사하여 카톡방에 공유해 주세요:", shareUrl);
    }
  }

  async function finalizePledgeSignatures() {
    if (!pledgeModalItem) return;
    const sigCount = (pledgeModalItem.ptw_signatures || []).length;
    if (sigCount === 0) {
      alert("최소 1명 이상 서명이 등록되어야 최종 제출할 수 있습니다.");
      return;
    }
    setPSaving(true);
    const prevDetails = pledgeModalItem.fire_work_details || {};
    const prevCommon = prevDetails._common || {};
    const nextDetails = {
      ...prevDetails,
      _common: { ...prevCommon, pledgePending: false },
    };

    const { error } = await supabase
      .from("ptw_applications")
      .update({
        fire_work_details: nextDetails,
        worker_count: Math.max(pledgeModalItem.worker_count || 0, sigCount),
      })
      .eq("id", pledgeModalItem.id);

    setPSaving(false);
    if (error) {
      alert("완료 처리 오류: " + error.message);
      return;
    }
    setPledgeModalItem(null);
    loadPtwList();
  }

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
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const { data } = await supabase.storage.from("tbm-photos").createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
    const { data: pub } = supabase.storage.from("tbm-photos").getPublicUrl(path);
    return pub?.publicUrl || "";
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
        .ptw-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
        }
        .ptw-table-scroll table {
          min-width: 680px;
          width: 100%;
        }
        .ptw-table-scroll th,
        .ptw-table-scroll td {
          white-space: nowrap;
          word-break: keep-all;
        }
        .ptw-status-modal-card {
          box-sizing: border-box;
          max-width: 840px;
          width: 100%;
          overflow-x: hidden;
        }
        .ptw-status-sheet {
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .ptw-status-sheet table {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          border-collapse: collapse;
          border: 2px solid #000;
          font-size: 11.5px;
          table-layout: fixed;
          box-sizing: border-box;
        }
        .ptw-status-sheet table table {
          border: none;
          font-size: 10.5px;
        }
        .ptw-status-sheet th,
        .ptw-status-sheet td {
          border: 1px solid #000;
          padding: 5px 6px;
          overflow-wrap: anywhere;
          word-break: break-word;
          min-width: 0;
          box-sizing: border-box;
        }
        .ptw-status-sig-card {
          border: 1px solid #999;
          padding: 6px;
          text-align: center;
          width: 110px;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media screen and (max-width: 768px) {
          .print-modal-wrapper {
            padding: 6px !important;
          }
          .ptw-status-modal-card {
            padding: 8px !important;
            border-radius: 10px !important;
            width: 100% !important;
          }
          .ptw-status-sheet {
            padding: 2px !important;
          }
          .ptw-status-sheet table {
            font-size: 8.5px;
            line-height: 1.3;
          }
          .ptw-status-sheet table table {
            font-size: 8px;
          }
          .ptw-status-sheet th,
          .ptw-status-sheet td {
            padding: 2.5px 3px;
          }
          .ptw-status-sheet img {
            max-width: 100% !important;
            height: auto !important;
            max-height: 140px !important;
            object-fit: contain;
            display: block;
            margin: 0 auto;
          }
          .ptw-status-sig-card {
            width: calc((100% - 12px) / 3) !important;
            min-width: 0;
            padding: 3px;
          }
          .ptw-status-sig-card img {
            height: 32px !important;
          }
          .ptw-status-sig-card div {
            font-size: 8.5px !important;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-modal-wrapper {
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            background: none !important;
            padding: 0 !important;
            display: block !important;
            height: auto !important;
          }
          .ptw-status-modal-card {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .ptw-status-sheet {
            position: static !important;
            width: 100% !important;
            padding: 10mm !important;
            box-sizing: border-box !important;
            overflow: visible !important;
          }
          .ptw-status-sheet table {
            font-size: 11.5px !important;
            table-layout: auto !important;
          }
          .ptw-status-sheet table table {
            font-size: 10.5px !important;
          }
          .ptw-status-sheet th,
          .ptw-status-sheet td {
            padding: 5px 6px !important;
          }
          .ptw-status-sig-card {
            width: 110px !important;
            padding: 6px !important;
          }
          .page-break {
            break-before: page !important;
            page-break-before: always !important;
            margin-top: 0 !important;
            padding-top: 10mm !important;
          }
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
          <div className="tablewrap ptw-table-scroll">
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
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button className="btn secondary" onClick={() => openDetail(item)}>상세/출력</button>
                          {item.status !== "approved" && (
                            <Link href={`/ptw/apply?editId=${item.id}`} className="btn secondary">수정</Link>
                          )}
                          {item.fire_work_details?._common?.trainingPending && (
                            <button
                              className="btn"
                              style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                              onClick={() => openTrainingModal(item)}
                            >
                              교육일지 추가제출
                            </button>
                          )}
                          {item.fire_work_details?._common?.pledgePending && (
                            <button
                              className="btn"
                              style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                              onClick={() => openPledgeModal(item)}
                            >
                              서약·서명 추가제출
                            </button>
                          )}
                        </div>
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
        <div
          className="print-modal-wrapper"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, overflowY: "auto", padding: 20 }}
        >
          <div className="card ptw-status-modal-card" style={{ maxWidth: 840, margin: "0 auto", background: "#fff" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #ddd" }}>
              <button className="btn" onClick={() => window.print()}>A4 인쇄 / PDF 저장</button>
              <button className="btn secondary" onClick={() => setSelectedItem(null)}>닫기</button>
            </div>

            {selectedItem.status === "rejected" && (
              <div className="no-print" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                <b>[반려 처리됨]</b> 사유: {selectedItem.rejection_reason || "사유 미입력"}
              </div>
            )}

            <div id="print-area" className="ptw-status-sheet" style={{ padding: 6 }}>
              {/* ================= [1 PAGE] 안전작업허가서 + 화기취급작업 신청서 ================= */}
              <div>
                <table>
                  <tbody>
                    <tr>
                      <td colSpan={4} rowSpan={2} style={{ textAlign: "center", fontSize: 18, fontWeight: "bold", padding: 8 }}>
                        안 전 작 업 허 가 서
                        <div style={{ fontSize: 11, fontWeight: "normal", marginTop: 3 }}>
                          (공사명 : {selectedItem.project_name})
                        </div>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: "bold", padding: 4 }}>담당</td>
                      <td style={{ textAlign: "center", fontWeight: "bold", padding: 4 }}>확인</td>
                      <td style={{ textAlign: "center", fontWeight: "bold", padding: 4 }}>공장장</td>
                    </tr>
                    <tr>
                      <td style={{ height: 42, textAlign: "center", fontWeight: "bold", color: "#15803d" }}>
                        {selectedItem.status === "approved" ? "접수완료" : ""}
                      </td>
                      <td style={{ height: 42, textAlign: "center", fontWeight: "bold", color: "#15803d" }}>
                        {selectedItem.status === "approved" ? "검토완료" : ""}
                      </td>
                      <td style={{ height: 42, textAlign: "center", fontWeight: "bold", color: "#15803d" }}>
                        {selectedItem.status === "approved" ? "결재완료" : ""}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>업체명</th>
                      <td>{getCompanyName(selectedItem)}</td>
                      <th style={{ background: "#f3f4f6" }}>현장관리감독자</th>
                      <td>{selectedItem.site_manager}</td>
                      <th style={{ background: "#f3f4f6" }}>TEL</th>
                      <td colSpan={2}>{selectedItem.contact_number}</td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>작업종류</th>
                      <td colSpan={6}>
                        {(selectedItem.work_types || []).join(" / ")}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>작업내용</th>
                      <td colSpan={3} style={{ verticalAlign: "top", whiteSpace: "pre-wrap" }}>
                        {selectedItem.work_content}
                      </td>
                      <td colSpan={3} style={{ verticalAlign: "top" }}>
                        <div style={{ fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: 2, marginBottom: 4, textAlign: "center" }}>안전보호장구</div>
                        {selectedItem.safety_gear}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>작업일자</th>
                      <td colSpan={6}>
                        {formatWorkDate(selectedItem)} ({selectedItem.starts_at?.slice(0, 5)} ~ {selectedItem.ends_at?.slice(0, 5)})
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>작업인원</th>
                      <td colSpan={2}>{selectedItem.worker_count} 명</td>
                      <th style={{ background: "#f3f4f6" }}>작업장소</th>
                      <td colSpan={3}>{selectedItem.work_location}</td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>화기현황</th>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <table>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              <th>화기명</th>
                              <th>수량</th>
                              <th>안전장치명</th>
                              <th>작동유무</th>
                              <th>비고</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedFireItems.length > 0 ? selectedFireItems.map((fi, i) => (
                              <tr key={i}>
                                <td>{fi.name}</td>
                                <td style={{ textAlign: "center" }}>{fi.count}</td>
                                <td>{fi.safetyDevice}</td>
                                <td style={{ textAlign: "center" }}>{fi.working}</td>
                                <td>{fi.note}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={5} style={{ textAlign: "center", color: "#666" }}>해당없음</td></tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>차량·중장비</th>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <table>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              <th>장비명</th>
                              <th>수량</th>
                              <th>안전장치명</th>
                              <th>기타장비/비고</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedVehicles.length > 0 ? selectedVehicles.map((v, i) => (
                              <tr key={i}>
                                <td>{v.name}</td>
                                <td style={{ textAlign: "center" }}>{v.count}</td>
                                <td>{v.safetyDevice}</td>
                                <td>{v.etc}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={4} style={{ textAlign: "center", color: "#666" }}>해당없음</td></tr>
                            )}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    {/* --- 추가 위험작업 출력 양식 --- */}
                    {(selectedItem.work_types || []).includes("고소작업") && (
                      <>
                        <tr>
                          <th colSpan={7} style={{ background: "#f0f9ff", fontWeight: "bold", textAlign: "left" }}>■ 고소작업 계획</th>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업높이/장비</th>
                          <td colSpan={6}>
                            [높이] {commonExtra.extraDetails?.highHeight || "-"}m &nbsp;/&nbsp; [사용 장비] {commonExtra.extraDetails?.highEquip || "-"}
                          </td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업 절차</th>
                          <td colSpan={6} style={{ whiteSpace: "pre-wrap" }}>{commonExtra.extraDetails?.highProcedure || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>안전조치 점검</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.highMeasure || "-"}</td>
                        </tr>
                      </>
                    )}

                    {(selectedItem.work_types || []).includes("전기작업") && (
                      <>
                        <tr>
                          <th colSpan={7} style={{ background: "#f5f3ff", fontWeight: "bold", textAlign: "left" }}>■ 전기작업 계획</th>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>대상설비/전압</th>
                          <td colSpan={6}>
                            [대상 설비] {commonExtra.extraDetails?.elecTarget || "-"} &nbsp;/&nbsp; [전압] {commonExtra.extraDetails?.elecVolt || "-"}
                          </td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업 절차</th>
                          <td colSpan={6} style={{ whiteSpace: "pre-wrap" }}>{commonExtra.extraDetails?.elecProcedure || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>안전조치 점검</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.elecMeasure || "-"}</td>
                        </tr>
                      </>
                    )}

                    {(selectedItem.work_types || []).includes("밀폐작업") && (
                      <>
                        <tr>
                          <th colSpan={7} style={{ background: "#fff7ed", fontWeight: "bold", textAlign: "left" }}>■ 밀폐공간 출입작업 계획</th>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>외부 감시인</th>
                          <td colSpan={2}>{commonExtra.extraDetails?.confineWatcher || "-"}</td>
                          <th style={{ background: "#f3f4f6" }}>비상연락체계</th>
                          <td colSpan={3}>{commonExtra.extraDetails?.confineEmg || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업위치</th>
                          <td colSpan={2}>{commonExtra.extraDetails?.confineLocation || "-"}</td>
                          <th style={{ background: "#f3f4f6" }}>작업 내용(상세)</th>
                          <td colSpan={3}>{commonExtra.extraDetails?.confineContent || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>가스측정/조치</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.confineGas || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>누출·유입 차단</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.confineLeak || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>전용 보호구</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.confinePpe || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업 절차</th>
                          <td colSpan={6} style={{ whiteSpace: "pre-wrap" }}>{commonExtra.extraDetails?.confineProcedure || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>안전조치 점검</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.confineMeasure || "-"}</td>
                        </tr>
                      </>
                    )}

                    {(selectedItem.work_types || []).includes("환경") && (
                      <>
                        <tr>
                          <th colSpan={7} style={{ background: "#ecfdf5", fontWeight: "bold", textAlign: "left" }}>■ 환경(화학/폐기물) 취급 계획</th>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>물질/폐기물</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.envMaterial || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>안전조치 점검</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.envMeasure || "-"}</td>
                        </tr>
                      </>
                    )}

                    {(selectedItem.work_types || []).includes("유틸리티작업") && (
                      <>
                        <tr>
                          <th colSpan={7} style={{ background: "#f8fafc", fontWeight: "bold", textAlign: "left" }}>■ 유틸리티(배관/밸브) 작업 계획</th>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>대상 라인 종류</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.utilLine || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업 절차</th>
                          <td colSpan={6} style={{ whiteSpace: "pre-wrap" }}>{commonExtra.extraDetails?.utilProcedure || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>안전조치 점검</th>
                          <td colSpan={6}>{commonExtra.extraDetails?.utilMeasure || "-"}</td>
                        </tr>
                      </>
                    )}

                    <tr>
                      <th style={{ background: "#f3f4f6" }}>특별요구(환경)</th>
                      <td colSpan={6}>{commonExtra.specialEnv || "-"}</td>
                    </tr>
                    <tr>
                      <th style={{ background: "#f3f4f6" }}>특별요구(안전)</th>
                      <td colSpan={6}>{commonExtra.specialSafety || "-"}</td>
                    </tr>
                    <tr>
                      <td colSpan={7}>
                        상기와 같이 작업을 허가하오니 안전수칙을 준수하여 재해, 화재 및 환경오염 사고 발생하지 않도록 철저히 준수하시기 바랍니다.
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 화기취급작업 신청서 (1페이지에 함께 배치) */}
                {(selectedItem.work_types || []).includes("화기작업") && selectedItem.fire_work_details && (
                  <div style={{ marginTop: 12 }}>
                    <table>
                      <tbody>
                        <tr>
                          <th colSpan={4} style={{ background: "#374151", color: "#fff", padding: 6, fontSize: 13 }}>
                            화 기 취 급 작 업 신 청 서
                          </th>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업명칭</th>
                          <td>{selectedItem.project_name}</td>
                          <th style={{ background: "#f3f4f6" }}>화재감시자</th>
                          <td>{selectedItem.fire_work_details.fireWatcher || "-"}</td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>화기 작업종류</th>
                          <td>{selectedItem.fire_work_details.fireWorkType || "-"}</td>
                          <th style={{ background: "#f3f4f6" }}>보충작업</th>
                          <td>
                            {(selectedItem.fire_work_details.supplementaryWorks || []).join(", ") || "해당없음"}
                          </td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>작업절차</th>
                          <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
                            {selectedItem.fire_work_details.procedure || "-"}
                          </td>
                        </tr>
                        <tr>
                          <th style={{ background: "#f3f4f6" }}>안전조치 내용</th>
                          <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
                            {selectedItem.fire_work_details.safetyMeasures || "-"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {fireAttachUrls.length > 0 && (
                      <div style={{ marginTop: 6, border: "1px solid #000", padding: 6 }}>
                        <div style={{ fontWeight: "bold", fontSize: 11, marginBottom: 4 }}>[화기작업 첨부자료]</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {fireAttachUrls.map((url, idx) => (
                            <img key={idx} src={url} alt="화기 첨부" style={{ maxHeight: 130, border: "1px solid #ccc" }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ================= [2 PAGE] 중량물 취급 작업계획서 (체크 시 새 페이지) ================= */}
              {(selectedItem.work_types || []).includes("중량물취급작업") && selectedItem.heavy_lifting_details && (
                <div className="page-break" style={{ marginTop: 20 }}>
                  <table>
                    <tbody>
                      <tr>
                        <th colSpan={4} style={{ background: "#1e3a8a", color: "#fff", padding: 7, fontSize: 14 }}>
                          중 량 물 취 급 작 업 계 획 서
                        </th>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>신호방법</th>
                        <td>{selectedItem.heavy_lifting_details.signalMethod}</td>
                        <th style={{ background: "#f3f4f6" }}>제한속도</th>
                        <td>{selectedItem.heavy_lifting_details.speedLimit}</td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>직책별 작업인원</th>
                        <td colSpan={3} style={{ padding: 0 }}>
                          <table>
                            <thead>
                              <tr style={{ background: "#f9fafb" }}>
                                <th>직책</th>
                                <th>성명</th>
                                <th>연락처</th>
                                <th>작업구간</th>
                                <th>보호구 지급유무</th>
                                <th>비고</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedHeavyPersonnel.map((p, i) => (
                                <tr key={i}>
                                  <td>{p.role}</td>
                                  <td>{p.name || p.nameContact || "-"}</td>
                                  <td>{p.contact || "-"}</td>
                                  <td>{p.location}</td>
                                  <td style={{ textAlign: "center" }}>{p.ppe}</td>
                                  <td>{p.license}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>작업순서</th>
                        <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
                          {selectedItem.heavy_lifting_details.workSequence}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ background: "#e5e7eb" }}>중량물 품명/형상</th>
                        <td>{selectedItem.heavy_lifting_details.itemName} ({selectedItem.heavy_lifting_details.itemShape})</td>
                        <th style={{ background: "#e5e7eb" }}>총중량 / 1회중량</th>
                        <td>{selectedItem.heavy_lifting_details.totalWeight} / {selectedItem.heavy_lifting_details.singleWeight}</td>
                      </tr>
                      <tr>
                        <th style={{ background: "#e5e7eb" }}>중량물 규격</th>
                        <td>{selectedItem.heavy_lifting_details.itemSpec}</td>
                        <th style={{ background: "#e5e7eb" }}>고정방법</th>
                        <td>{selectedItem.heavy_lifting_details.fixingMethod}</td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>기계명 / 번호</th>
                        <td>{selectedItem.heavy_lifting_details.machineName} ({selectedItem.heavy_lifting_details.machineNo})</td>
                        <th style={{ background: "#f3f4f6" }}>모델 / 규격</th>
                        <td>{selectedItem.heavy_lifting_details.modelName} / {selectedItem.heavy_lifting_details.machineSpec}</td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>작업능력 / 반경</th>
                        <td>{selectedItem.heavy_lifting_details.capacity} / {selectedItem.heavy_lifting_details.radius}</td>
                        <th style={{ background: "#f3f4f6" }}>조종자격 / 검사</th>
                        <td>{selectedItem.heavy_lifting_details.operatorLicense} / {selectedItem.heavy_lifting_details.inspectionStatus}</td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>보험기간 / 운반거리</th>
                        <td>{selectedItem.heavy_lifting_details.insurancePeriod} / {selectedItem.heavy_lifting_details.transportDistance}</td>
                        <th style={{ background: "#f3f4f6" }}>줄걸이 방법/용구</th>
                        <td>{selectedItem.heavy_lifting_details.slingingMethod} / {selectedItem.heavy_lifting_details.slingingGear}</td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>작업 전 예방대책</th>
                        <td colSpan={3}>
                          <b>[위험요인]</b> {selectedItem.heavy_lifting_details.preWorkHazard} / <b>[대책]</b> {selectedItem.heavy_lifting_details.preWorkMeasure}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>운반(인양) 대책</th>
                        <td colSpan={3}>
                          <b>[위험요인]</b> {selectedItem.heavy_lifting_details.liftingHazard} / <b>[대책]</b> {selectedItem.heavy_lifting_details.liftingMeasure}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ background: "#f3f4f6" }}>안착작업 대책</th>
                        <td colSpan={3}>
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
                          <img key={idx} src={url} alt="작업도면" style={{ maxHeight: 200, border: "1px solid #ccc" }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= [3 PAGE] 안전교육일지 + 서약서 + 서명 (미제출 항목은 자동 제외) ================= */}
              {(!commonExtra.trainingPending || !commonExtra.pledgePending) && (
                <div className="page-break" style={{ marginTop: 20, border: "2px solid #000", padding: 10 }}>
                  <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 8, borderBottom: "1px solid #000", paddingBottom: 6 }}>
                    {!commonExtra.trainingPending && !commonExtra.pledgePending
                      ? "[안전교육일지 및 참여자 서약 서명]"
                      : !commonExtra.trainingPending
                        ? "[안전교육일지]"
                        : "[참여자 안전관리 준수 서약 및 서명]"}
                  </div>

                  {!commonExtra.trainingPending && (
                    selectedItem.training_type === "form" ? (
                      <div style={{ fontSize: 11.5, marginBottom: 12, whiteSpace: "pre-wrap", lineHeight: 1.55, overflowWrap: "anywhere" }}>
                        <b>강사:</b> {selectedItem.training_instructor || "-"}<br />
                        <b>교육내용:</b><br />{selectedItem.training_content}<br /><br />
                        <b>안전교육 참석자:</b> {commonExtra.trainingAttendees || "-"}
                      </div>
                    ) : (
                      <div style={{ marginBottom: 12 }}>
                        {trainingPhotoUrl ? (
                          <img src={trainingPhotoUrl} alt="교육일지" style={{ maxHeight: 220, border: "1px solid #ccc" }} />
                        ) : (
                          <span className="muted">첨부된 교육일지 사진 없음</span>
                        )}
                      </div>
                    )
                  )}

                  {!commonExtra.pledgePending && (
                    <>
                      <div style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000", background: "#f9fafb", padding: "8px 10px", marginBottom: 12, fontSize: 11, lineHeight: 1.5, overflowWrap: "anywhere" }}>
                        <div style={{ fontWeight: "bold", fontSize: 12.5, textAlign: "center", marginBottom: 6 }}>
                          [안전관리 준수 서약서]
                        </div>
                        <p style={{ margin: "0 0 6px 0", fontWeight: "bold" }}>
                          상기 본인은 귀 작업장에서 작업하는 기간 중 본인의 관리책임 및 지휘·감독 근로자의 불안전행동 또는 귀사에서 요구하는 준수사항 위반으로 발생되는 제반사고에 대하여 본인이 일체의 책임을 지겠으며, 아울러 안전사고 예방을 위해 아래사항을 성실히 이행할 것을 서약합니다.
                        </p>
                        <div>
                          {PLEDGE_ITEMS.map((line, i) => (
                            <div key={i}>{line}</div>
                          ))}
                        </div>
                        <div style={{ marginTop: 8, textAlign: "right", fontWeight: "bold" }}>
                          서명에 앞서 위 서약사항을 세심히 읽어보았음을 확인 합니다. &nbsp;&nbsp; 동아스틸(주) 귀하
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(selectedItem.ptw_signatures || []).map(sig => (
                          <div key={sig.id} className="ptw-status-sig-card">
                            <img src={sig.signature_data} alt="서명" style={{ width: "100%", height: 42, objectFit: "contain" }} />
                            <div style={{ fontSize: 11 }}>{sig.worker_name} ({sig.worker_type})</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. 안전교육일지 추가제출 모달 ================= */}
      {trainingModalItem && (
        <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, overflowY: "auto", padding: 16 }}>
          <div className="card" style={{ maxWidth: 640, margin: "20px auto", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: 0 }}>안전교육일지 추가제출</h3>
              <button className="btn secondary" onClick={() => setTrainingModalItem(null)}>닫기</button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              공사명: <b>{trainingModalItem.project_name}</b> ({getCompanyName(trainingModalItem)})
            </p>

            <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
              <label className="checkrow">
                <input type="radio" checked={tType === "form"} onChange={() => setTType("form")} />
                <span>화면 직접 작성</span>
              </label>
              <label className="checkrow">
                <input type="radio" checked={tType === "photo"} onChange={() => setTType("photo")} />
                <span>종이일지 사진 촬영</span>
              </label>
            </div>

            {tType === "form" ? (
              <div className="formgrid">
                <div className="field">
                  <label>교육 강사 (현장관리감독자)</label>
                  <input className="input" value={tInstructor} onChange={e => setTInstructor(e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label>안전 교육 내용</label>
                  <textarea value={tContent} onChange={e => setTContent(e.target.value)} style={{ height: 200 }} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <label style={{ margin: 0 }}>안전교육 참석자</label>
                    <span style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 500 }}>
                      ※ 교육에 참석한 작업자 성명을 모두 기재해 주세요.
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {tAttendees.map((person, idx) => (
                      <div key={idx} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                        <input
                          className="input"
                          style={{ width: 110, paddingRight: tAttendees.length > 1 ? 24 : 10 }}
                          placeholder="성명"
                          value={person}
                          onChange={e => {
                            const next = [...tAttendees];
                            next[idx] = e.target.value;
                            setTAttendees(next);
                          }}
                        />
                        {tAttendees.length > 1 && (
                          <button
                            type="button"
                            title="칸 삭제"
                            onClick={() => setTAttendees(tAttendees.filter((_, i) => i !== idx))}
                            style={{
                              position: "absolute",
                              right: 6,
                              border: "none",
                              background: "transparent",
                              color: "#ef4444",
                              fontWeight: "bold",
                              cursor: "pointer",
                              fontSize: 12,
                              padding: 0,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn secondary"
                      style={{ padding: "8px 12px", fontWeight: "bold", minWidth: 40 }}
                      onClick={() => setTAttendees([...tAttendees, ""])}
                      title="이름 칸 추가"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="field">
                <label>안전교육일지 사진 첨부</label>
                <input type="file" accept="image/*" onChange={e => setTPhoto(e.target.files?.[0] || null)} />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setTrainingModalItem(null)}>취소</button>
              <button type="button" className="btn" style={{ flex: 2 }} onClick={submitLateTraining} disabled={tSaving}>
                {tSaving ? "저장 중..." : "안전교육일지 제출 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. 안전관리 준수 서약 및 서명 추가제출 모달 ================= */}
      {pledgeModalItem && (
        <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, overflowY: "auto", padding: 16 }}>
          <div className="card" style={{ maxWidth: 680, margin: "10px auto", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: 0 }}>안전관리 준수 서약 및 서명 추가제출</h3>
              <button className="btn secondary" onClick={() => setPledgeModalItem(null)}>닫기</button>
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
              공사명: <b>{pledgeModalItem.project_name}</b> ({getCompanyName(pledgeModalItem)})
            </p>

            <div style={{ background: "#f8f9fa", padding: 12, borderRadius: 8, fontSize: 12.5, lineHeight: 1.55, maxHeight: 140, overflowY: "auto", marginBottom: 14, border: "1px solid #ddd" }}>
              <b>상기 본인은 귀 작업장에서 작업하는 기간 중 본인의 관리책임 및 지휘·감독 근로자의 불안전행동 또는 귀사에서 요구하는 준수사항 위반으로 발생되는 제반사고에 대하여 본인이 일체의 책임을 지겠으며, 아울러 안전사고 예방을 위해 아래사항을 성실히 이행할 것을 서약합니다.</b>
              <br />
              {PLEDGE_ITEMS.map((line, i) => <div key={i}>{line}</div>)}
            </div>

            {/* 방법 1: 각자 스마트폰으로 서명 (링크 공유) */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: "bold", fontSize: 13.5, color: "#1d4ed8", marginBottom: 6 }}>
                방법 ① 근로자 각자 스마트폰으로 서명 (링크 공유)
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" style={{ fontSize: 13 }} onClick={copyWorkerSignLink}>
                  서명 링크 복사 (카톡방 공유)
                </button>
                <button type="button" className="btn secondary" style={{ fontSize: 13 }} onClick={refreshPledgeModalItem}>
                  서명 현황 새로고침
                </button>
              </div>
              {pCopyMsg && <div style={{ fontSize: 12, color: "#15803d", fontWeight: 600, marginTop: 6 }}>{pCopyMsg}</div>}
            </div>

            {/* 방법 2: 이 기기에서 연속 서명 */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: "bold", fontSize: 13.5, marginBottom: 8 }}>
                방법 ② 이 기기에서 바로 연속 서명
              </div>
              <div className="field" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <select className="input" value={pSignType} onChange={e => setPSignType(e.target.value)} style={{ width: 100 }}>
                  <option value="대표자">대표자</option>
                  <option value="근로자">근로자</option>
                </select>
                <input
                  className="input"
                  placeholder="작업자 성명 입력"
                  value={pSignName}
                  onChange={e => setPSignName(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>

              <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fafafa", marginBottom: 10 }}>
                <canvas
                  ref={pCanvasRef}
                  width={360}
                  height={130}
                  style={{ width: "100%", height: 130, touchAction: "none", display: "block" }}
                  onMouseDown={startPDrawing}
                  onMouseMove={drawP}
                  onMouseUp={stopPDrawing}
                  onMouseLeave={stopPDrawing}
                  onTouchStart={startPDrawing}
                  onTouchMove={drawP}
                  onTouchEnd={stopPDrawing}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 10px", borderTop: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>손가락으로 서명 후 [이 작업자 서명 등록] 클릭</span>
                  <button type="button" className="btn secondary" style={{ padding: "3px 8px", fontSize: 12 }} onClick={clearPCanvas}>지우기</button>
                </div>
              </div>

              <button type="button" className="btn secondary" style={{ width: "100%" }} onClick={addDeviceSignature} disabled={pSaving}>
                + 이 작업자 서명 등록 (다음 사람 계속 서명 가능)
              </button>
            </div>

            {/* 현재 등록된 서명 목록 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 8 }}>
                현재 서명 완료 인원 ({(pledgeModalItem.ptw_signatures || []).length}명)
              </div>
              {(pledgeModalItem.ptw_signatures || []).length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(pledgeModalItem.ptw_signatures || []).map(sig => (
                    <div key={sig.id} style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: 6, textAlign: "center", width: 105 }}>
                      <img src={sig.signature_data} alt="서명" style={{ width: "100%", height: 42, objectFit: "contain" }} />
                      <div style={{ fontSize: 11.5 }}><b>{sig.worker_name}</b> ({sig.worker_type})</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 12.5 }}>아직 등록된 서명이 없습니다.</div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setPledgeModalItem(null)}>
                닫기 (나중에 계속 받기)
              </button>
              <button type="button" className="btn" style={{ flex: 2 }} onClick={finalizePledgeSignatures} disabled={pSaving}>
                {pSaving ? "처리 중..." : "서약·서명 최종 제출 완료"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
