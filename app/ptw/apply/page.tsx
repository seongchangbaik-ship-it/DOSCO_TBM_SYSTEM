"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type VehicleRow = { name: string; count: string; safetyDevice: string; etc: string };
type FireItemRow = { name: string; count: string; safetyDevice: string; working: string; note: string };
type HeavyPersonnelRow = { role: string; name: string; contact: string; location: string; ppe: string; license: string };

function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function diffDaysYmd(startYmd: string, endYmd: string): number {
  const [y1, m1, d1] = startYmd.split("-").map(Number);
  const [y2, m2, d2] = endYmd.split("-").map(Number);
  if (!y1 || !y2) return 0;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

function PtwApplyForm() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId") || "";

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingStatus, setExistingStatus] = useState("pending");
  const [existingTrainingPhotoPath, setExistingTrainingPhotoPath] = useState<string | null>(null);
  const [existingFirePaths, setExistingFirePaths] = useState<string[]>([]);
  const [existingHeavyPaths, setExistingHeavyPaths] = useState<string[]>([]);
  const [deletedSigIds, setDeletedSigIds] = useState<string[]>([]);

  const todayYmd = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    companyType: "internal",
    companyId: "",
    companyName: "",
    projectName: "",
    siteManager: "",
    contact: "",
    location: "",
    workPeriodType: "single" as "single" | "period",
    date: todayYmd,
    endDate: todayYmd,
    startTime: "08:00",
    endTime: "17:00",
    workerCount: "",
    workContent: "",
    safetyGear: "안전모, 안전화, 안전대, 보안면",
    workTypes: [] as string[],
specialEnv: "",
    specialSafety: "",
    trainingPending: false,
    pledgePending: false,
trainingType: "form",
    trainingInstructor: "",
    trainingContent:
      "1. 작업장 주변 인화물질 제거\n2. 소화기 비치\n3. 안전관리자 입회, 작업지휘\n4. 보호구 착용\n5. 작업전 안전교육 실시\n6. 작업감독자 작업절차 순서 지정\n7. 마스크 착용\n8. 상차 작업 시 안전거리(5m) 확보\n9. 작업인원 외 접근 금지\n10. 작업구역 접근금지 표시 (주차콘)",
    trainingAttendees: "",
  });

  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);

  const [fireDetails, setFireDetails] = useState({
    fireWorkType: "용접 · 용단 작업",
    fireWatcher: "",
    procedure: "1. 작업 반경 10m 이내 가연물·인화물 제거 및 불티비산방지포 설치\n2. 소화기 및 화재감시자 배치 후 화기작업 실시\n3. 작업 종료 후 30분 이상 잔불 확인",
    supplementaryWorks: [] as string[],
  });
  const [fireItems, setFireItems] = useState<FireItemRow[]>([
    { name: "전기용접기 / 절단기", count: "1", safetyDevice: "전격방지기 / 역화방지기", working: "양호", note: "" }
  ]);
  const [fireFiles, setFireFiles] = useState<File[]>([]);

  const [heavyDetails, setHeavyDetails] = useState({
    signalMethod: "무전기 및 표준 수신호",
    speedLimit: "10km/h 이하",
    workSequence: "1. 작업 전 장비 점검 및 아웃트리거(지지대) 최대 인출 확인\n2. 작업구역 출입통제선(주차콘) 설치 및 유도자(신호수) 배치\n3. 줄걸이 상태 확인 후 지면 10cm 인양 정지(중심 확인)\n4. 지정 경로로 저속 운반 및 안착 후 줄걸이 해체",
    itemName: "",
    itemShape: "원형 파이프 / 철골 구조물",
    itemSpec: "",
    totalWeight: "",
    singleWeight: "",
    fixingMethod: "2줄 걸이 이상 와이어로프 및 샤클 체결",
    machineName: "이동식 크레인 / 지게차",
    machineNo: "",
    modelName: "",
    machineSpec: "",
    capacity: "",
    radius: "",
    operatorLicense: "유 (자격증 확인)",
    insurancePeriod: "",
    inspectionStatus: "합격 (안전검사 필)",
    slingingMethod: "2줄 걸이 (각도 60도 이내 유지)",
    transportDistance: "",
    slingingGear: "와이어로프, 섬유벨트슬링, 샤클",
    preWorkHazard: "장비 전도, 줄걸이 용구 파단, 작업구역 내 비인가자 출입",
    preWorkMeasure: "지반 침하 여부 확인 및 아웃트리거 설치, 와이어로프·샤클 손상 사전 점검, 신호수 배치 및 접근금지 조치",
    liftingHazard: "중량물 흔들림·낙하, 협착 및 충돌 위험",
    liftingMeasure: "급격한 선회·권상 금지, 보조로프(유도로프) 사용, 인양물 하부 출입 절대 금지",
    landingHazard: "안착 시 전도 및 손·발 협착",
    landingMeasure: "받침목(고임목) 사전 설치, 완전히 안착된 후 줄걸이 해체",
  });
const [heavyPersonnel, setHeavyPersonnel] = useState<HeavyPersonnelRow[]>([
    { role: "작업지휘자", name: "", contact: "", location: "작업현장 전반", ppe: "지급완료", license: "-" },
    { role: "유도자(신호수)", name: "", contact: "", location: "인양구간 전방", ppe: "지급완료", license: "-" },
    { role: "조종(운전)자", name: "", contact: "", location: "장비 운전석", ppe: "지급완료", license: "기중기/지게차" },
    { role: "작업자", name: "", contact: "", location: "줄걸이 및 안착위치", ppe: "지급완료", license: "-" },
  ]);
  const [heavyFiles, setHeavyFiles] = useState<File[]>([]);

  // 신규 추가 위험작업 세부 상태
  const [extraDetails, setExtraDetails] = useState({
    highHeight: "", highEquip: "비계 / 고소작업대(렌탈) / 이동식 사다리", highMeasure: "안전대·안전고리 체결 설비 확보, 하부 출입통제 및 감시인 배치",
    elecTarget: "", elecVolt: "저압 / 고압", elecMeasure: "메인 차단기 OFF·잠금장치(LOTO)·표지판 부착, 검전기 무전압 확인, 절연보호구 착용",
    confineWatcher: "", confineGas: "산소 20.9%, 유해가스 없음 (환기팬 가동)", confineLeak: "연결 배관 차단 및 맹판(블라인드) 설치 완료", confinePpe: "송기마스크, 복합가스측정기, 구명줄, 무전기", confineEmg: "비상연락망(119 및 안전관리자) 확보 및 긴급 구조 대기",
    envMaterial: "도료·신나 / 폐유 / 폐수·약품 / 분진", envMeasure: "MSDS 비치, 방독마스크·내화학장갑 착용, 누출 방지 조치(흡착포) 및 지정 용기 보관",
    utilLine: "유압·공압 / 냉각수·스팀 / 질소·산소·LNG 배관", utilMeasure: "메인 밸브 차단(LOTO), 배관 내 잔압·잔류유체 완전 제거(드레인·퍼지), 오조작 방지 표찰 부착",
  });

  const [trainingPhoto, setTrainingPhoto] = useState<File | null>(null);
  const [signatures, setSignatures] = useState<{ id?: string; name: string; type: string; data: string }[]>([]);

  const [showSignModal, setShowSignModal] = useState(false);
  const [signName, setSignName] = useState("");
  const [signType, setSignType] = useState("근로자");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const GENERAL_WORK_TYPES = ["일반작업", "화기작업", "고소작업", "전기작업"];
  const HAZARD_WORK_TYPES = ["밀폐작업", "중량물취급작업", "환경", "유틸리티작업"];
  const FIRE_SUPPLEMENTARY_TYPES = [
    "밀폐공간출입", "정전작업", "굴착작업", "방사선 사용", "고소작업", "중장비 작업"
  ];

  useEffect(() => {
    if (!configured) return;
    supabase.from("companies").select("id,name").eq("active", true).order("name")
      .then(({ data }) => {
        if (data) setCompanies(data);
      });

    if (editId) {
      supabase
        .from("ptw_applications")
        .select("*, ptw_signatures(*)")
        .eq("id", editId)
        .maybeSingle()
.then(({ data }) => {
          if (!data) return;
          const common = data.fire_work_details?._common || {};
          setExistingStatus(data.status || "pending");
          if (common.extraDetails) {
            setExtraDetails(prev => ({ ...prev, ...common.extraDetails }));
          }
          setForm(prev => ({
            ...prev,
            companyType: data.company_type || "internal",
            companyId: data.company_id || "",
            companyName: data.company_name || "",
            projectName: data.project_name || "",
            siteManager: data.site_manager || "",
            contact: data.contact_number || "",
            location: data.work_location || "",
            workPeriodType: common.workPeriodType || "single",
            date: data.work_date || todayYmd,
            endDate: common.endDate || data.work_date || todayYmd,
            startTime: data.starts_at?.slice(0, 5) || "08:00",
            endTime: data.ends_at?.slice(0, 5) || "17:00",
            workerCount: data.worker_count ? String(data.worker_count) : "",
            workContent: data.work_content || "",
            safetyGear: data.safety_gear || "안전모, 안전화, 안전대, 보안면",
            workTypes: data.work_types || [],
            specialEnv: common.specialEnv || "",
            specialSafety: common.specialSafety || "",
            trainingPending: Boolean(common.trainingPending),
            pledgePending: Boolean(common.pledgePending),
trainingType: data.training_type || "form",
            trainingInstructor: data.training_instructor || "",
            trainingContent: data.training_content || prev.trainingContent,
            trainingAttendees: common.trainingAttendees || "",
          }));

          setVehicles(common.vehicles || []);

          if (data.fire_work_details) {
            const f = data.fire_work_details;
            setFireDetails(prev => ({
              ...prev,
              fireWorkType: f.fireWorkType || prev.fireWorkType,
              fireWatcher: f.fireWatcher || "",
              procedure: f.procedure || prev.procedure,
              supplementaryWorks: f.supplementaryWorks || [],
            }));
            if (f.fireItems && f.fireItems.length > 0) setFireItems(f.fireItems);
            const fPaths: string[] = f.attachmentPaths || (f.attachmentPath ? [f.attachmentPath] : []);
            setExistingFirePaths(fPaths);
          }

if (data.heavy_lifting_details && Object.keys(data.heavy_lifting_details).length > 0) {
            const h = data.heavy_lifting_details;
            setHeavyDetails(prev => ({ ...prev, ...h }));
            if (h.personnel && h.personnel.length > 0) {
              setHeavyPersonnel(
                h.personnel.map((p: any) => ({
                  role: p.role || "작업자",
                  name: p.name ?? p.nameContact ?? "",
                  contact: p.contact || "",
                  location: p.location || "",
                  ppe: p.ppe || "지급완료",
                  license: p.license || "-",
                }))
              );
            }
            const hPaths: string[] = h.drawingPaths || (h.drawingPath ? [h.drawingPath] : []);
            setExistingHeavyPaths(hPaths);
          }

          setExistingTrainingPhotoPath(data.training_photo_path || null);
          setSignatures(
            (data.ptw_signatures || []).map((s: any) => ({
              id: s.id,
              name: s.worker_name,
              type: s.worker_type,
              data: s.signature_data,
            }))
          );
        });
    }
  }, [editId]);

  const maxPeriodEndDate = addDaysToYmd(form.date, 6);
  const selectedPeriodDays = form.workPeriodType === "period"
    ? Math.max(1, diffDaysYmd(form.date, form.endDate || form.date) + 1)
    : 1;

  const handleStartDateChange = (newStart: string) => {
    if (!newStart) return;
    if (form.workPeriodType === "single") {
      setForm({ ...form, date: newStart, endDate: newStart });
      return;
    }
    const maxEnd = addDaysToYmd(newStart, 6);
    let nextEnd = form.endDate || newStart;
    if (nextEnd < newStart) nextEnd = newStart;
    if (nextEnd > maxEnd) nextEnd = maxEnd;
    setForm({ ...form, date: newStart, endDate: nextEnd });
  };

  const handleEndDateChange = (newEnd: string) => {
    if (!newEnd) return;
    const maxEnd = addDaysToYmd(form.date, 6);
    if (newEnd < form.date) {
      setForm({ ...form, endDate: form.date });
      return;
    }
    if (newEnd > maxEnd) {
      alert("기간작업은 시작일로부터 최대 일주일(7일)까지만 설정할 수 있습니다.");
      setForm({ ...form, endDate: maxEnd });
      return;
    }
    setForm({ ...form, endDate: newEnd });
  };

  const toggleWorkType = (type: string, checked: boolean) => {
    if (checked) setForm({ ...form, workTypes: [...form.workTypes, type] });
    else setForm({ ...form, workTypes: form.workTypes.filter(t => t !== type) });
  };

  const getCoords = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
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

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
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
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    if (!signName.trim()) return alert("이름을 입력하세요.");
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatures([...signatures, { name: signName.trim(), type: signType, data: dataUrl }]);
    setShowSignModal(false);
    setSignName("");
  };

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
        if (!ctx) {
          resolve(file);
          return;
        }
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
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  }

  async function uploadMultipleFiles(files: File[], folder: string) {
    const paths: string[] = [];
    for (const file of files) {
      const compressed = await compressImage(file);
      const isJpeg = compressed !== file;
      const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const ext = isJpeg ? "jpg" : (file.name.split(".").pop() || "jpg");
      const path = `${folder}/${crypto.randomUUID()}-${baseName}.${ext}`;
      const { error } = await supabase.storage.from("tbm-photos").upload(path, compressed, {
        contentType: isJpeg ? "image/jpeg" : file.type,
      });
      if (!error) paths.push(path);
    }
    return paths;
  }

async function submitPtw() {
    if (editId && existingStatus === "approved") {
      return setMsg("이미 허가완료된 안전작업허가서는 수정할 수 없습니다.");
    }
    if (form.companyType === "internal" && !form.companyId) return setMsg("협력사를 선택하세요.");
    if (form.companyType === "external" && !form.companyName.trim()) return setMsg("외부업체명을 입력하세요.");
    if (!form.projectName.trim() || !form.siteManager.trim() || !form.workContent.trim()) {
      return setMsg("필수 항목(공사명, 현장관리감독자, 작업내용)을 입력하세요.");
    }
    if (form.workPeriodType === "period") {
      const days = diffDaysYmd(form.date, form.endDate);
      if (days < 0 || days > 6) {
        return setMsg("기간작업은 시작일로부터 최대 일주일(7일) 이내로만 설정 가능합니다.");
      }
    }
if (form.workTypes.length === 0) return setMsg("작업 종류를 1개 이상 선택하세요.");
    if (!form.pledgePending && signatures.length === 0) {
      return setMsg("서약 및 서명을 입력하거나, 당일 실시 시 '당일 실시 예정'을 체크해 주세요.");
    }

    setIsSubmitting(true);
    setMsg("허가서와 첨부자료를 전송하고 있습니다...");

let photoPath: string | null = form.trainingPending ? null : existingTrainingPhotoPath;
    if (!form.trainingPending && form.trainingType === "photo" && trainingPhoto) {
      const uploaded = await uploadMultipleFiles([trainingPhoto], "ptw-training");
      photoPath = uploaded[0] || photoPath;
    }

    const fireAttachPaths = form.workTypes.includes("화기작업")
      ? await uploadMultipleFiles(fireFiles, "ptw-fire")
      : [];
    const mergedFirePaths = [...existingFirePaths, ...fireAttachPaths];

    const heavyDrawPaths = form.workTypes.includes("중량물취급작업")
      ? await uploadMultipleFiles(heavyFiles, "ptw-heavy")
      : [];
    const mergedHeavyPaths = [...existingHeavyPaths, ...heavyDrawPaths];

const firePayload = {
      ...(form.workTypes.includes("화기작업") ? {
        ...fireDetails,
        fireItems,
        attachmentPaths: mergedFirePaths,
        attachmentPath: mergedFirePaths[0] || "",
      } : {}),
      _common: {
        workPeriodType: form.workPeriodType,
        endDate: form.workPeriodType === "period" ? form.endDate : form.date,
        vehicles,
        specialEnv: form.specialEnv,
        specialSafety: form.specialSafety,
trainingPending: form.trainingPending,
        pledgePending: form.pledgePending,
        trainingAttendees: form.trainingPending ? "" : form.trainingAttendees,
        extraDetails,
      },
    };

    const heavyPayload = form.workTypes.includes("중량물취급작업")
      ? {
          ...heavyDetails,
          personnel: heavyPersonnel,
          drawingPaths: mergedHeavyPaths,
          drawingPath: mergedHeavyPaths[0] || "",
        }
      : {};

    const payload: Record<string, any> = {
      company_type: form.companyType,
      company_id: form.companyType === "internal" ? form.companyId : null,
      company_name: form.companyType === "external" ? form.companyName : null,
      project_name: form.projectName,
      site_manager: form.siteManager,
      contact_number: form.contact,
      work_location: form.location,
      work_date: form.date,
      starts_at: form.startTime,
      ends_at: form.endTime,
      worker_count: parseInt(form.workerCount) || signatures.length || 1,
      work_content: form.workContent,
      safety_gear: form.safetyGear,
      work_types: form.workTypes,
      fire_work_details: firePayload,
      heavy_lifting_details: heavyPayload,
      training_type: form.trainingType,
      training_instructor: form.trainingPending ? "" : form.trainingInstructor,
      training_content: form.trainingPending ? "" : form.trainingContent,
      training_photo_path: photoPath,
    };

    let targetPtwId = editId;

    if (editId) {
      if (existingStatus === "rejected") {
        payload.status = "pending";
        payload.rejection_reason = null;
      }
      const { error: updateError } = await supabase
        .from("ptw_applications")
        .update(payload)
        .eq("id", editId);

      if (updateError) {
        setMsg("수정 오류: " + updateError.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { data: ptwData, error: ptwError } = await supabase
        .from("ptw_applications")
        .insert(payload)
        .select("id")
        .single();

      if (ptwError || !ptwData) {
        setMsg("오류 발생: " + (ptwError?.message || "저장 실패"));
        setIsSubmitting(false);
        return;
      }
      targetPtwId = ptwData.id;
    }

    if (deletedSigIds.length > 0) {
      await supabase.from("ptw_signatures").delete().in("id", deletedSigIds);
    }

    const newSigs = signatures.filter(s => !s.id);
    if (!form.pledgePending && newSigs.length > 0) {
      const sigInserts = newSigs.map(sig => ({
        ptw_id: targetPtwId,
        worker_type: sig.type,
        worker_name: sig.name,
        signature_data: sig.data,
      }));
      await supabase.from("ptw_signatures").insert(sigInserts);
    }

    setSubmitted(true);
    setIsSubmitting(false);
  }

  if (submitted) {
    return (
      <main className="shell" style={{ maxWidth: 600, paddingTop: 40, textAlign: "center" }}>
        <div className="card">
          <div className="pill ok" style={{ display: "inline-block", marginBottom: 16 }}>
            {editId ? "수정 완료" : "신청 완료"}
          </div>
          <h2>{editId ? "안전작업허가서가 수정되었습니다." : "안전작업허가서가 제출되었습니다."}</h2>
          <p className="muted">승인 현황 메뉴에서 변경된 내용을 확인하고 양식을 출력하실 수 있습니다.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20 }}>
            <Link href="/ptw/status" className="btn">승인 현황 바로가기</Link>
            <Link href="/ptw" className="btn secondary">허가서 메인으로</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div id="ptw-apply-root">
      <header className="topbar">
        <div className="brand">DOSCO PTW SYSTEM<small>안전작업허가서 신청</small></div>
        <nav className="nav">
          <Link href="/ptw">허가서 메인</Link>
          <Link href="/ptw/status">승인 현황</Link>
          <Link href="/">전체 홈</Link>
        </nav>
      </header>
      <main className="shell" style={{ maxWidth: 820 }}>

<div className="pagehead" style={{ marginBottom: 16 }}>
          <h1>{editId ? "안전작업허가서 수정 및 재제출" : "안전작업허가서 작성 및 요청"}</h1>
          <p className="muted">
            {editId
              ? "기존에 입력한 내용을 수정하거나 누락된 첨부파일·서명을 추가한 뒤 하단 수정 완료 버튼을 눌러주세요."
              : "화기작업·중량물취급작업을 선택하면 해당 신청서 및 작업계획서 입력란이 자동으로 펼쳐집니다."}
          </p>
        </div>

        {/* 1. 기본 정보 */}
        <div className="card section">
          <h3>1. 기본 정보 (안전작업허가서)</h3>

          <div className="formgrid">
            <div className="field">
              <label>업체 구분</label>
              <select value={form.companyType} onChange={e => setForm({ ...form, companyType: e.target.value })}>
                <option value="internal">기존 협력사</option>
                <option value="external">외부업체 (직접입력)</option>
              </select>
            </div>

            <div className="field">
              <label>업체명</label>
              {form.companyType === "internal" ? (
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">협력사 선택</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input className="input" placeholder="외부업체명 입력" value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              )}
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>공사명 (또는 작업명)</label>
              <input className="input" placeholder="예: 2공장 크레인 레일 보수작업" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} />
            </div>

            <div className="field">
              <label>현장관리감독자 (작업책임자)</label>
              <input className="input" value={form.siteManager} onChange={e => setForm({ ...form, siteManager: e.target.value })} />
            </div>
            <div className="field">
              <label>담당자 연락처 (TEL)</label>
              <input className="input" type="tel" placeholder="010-0000-0000" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            </div>
          </div>

          <div className="formgrid" style={{ marginTop: 14 }}>
            <div className="field">
              <label>작업 장소 (설비명/라인)</label>
              <input className="input" placeholder="예: 1공장 P5 라인" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="field">
              <label>작업 인원 (명)</label>
              <input type="number" className="input" placeholder="예: 3" value={form.workerCount} onChange={e => setForm({ ...form, workerCount: e.target.value })} />
            </div>
          </div>

          {/* 작업 기간 구분 및 작업 일자 */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <label style={{ fontWeight: "bold", margin: 0 }}>작업 기간 구분</label>
              <label className="checkrow" style={{ margin: 0, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="workPeriodType"
                  checked={form.workPeriodType === "single"}
                  onChange={() => setForm({ ...form, workPeriodType: "single", endDate: form.date })}
                />
                <span>당일작업</span>
              </label>
              <label className="checkrow" style={{ margin: 0, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="workPeriodType"
                  checked={form.workPeriodType === "period"}
                  onChange={() => {
                    const maxEnd = addDaysToYmd(form.date, 6);
                    let nextEnd = form.endDate && form.endDate >= form.date ? form.endDate : form.date;
                    if (nextEnd > maxEnd) nextEnd = maxEnd;
                    setForm({ ...form, workPeriodType: "period", endDate: nextEnd });
                  }}
                />
                <span>기간작업</span>
              </label>
            </div>

            <div className="formgrid">
              <div className="field">
                <label>{form.workPeriodType === "single" ? "작업 일자" : "작업 기간 (시작일 ~ 종료일)"}</label>
                {form.workPeriodType === "single" ? (
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={e => handleStartDateChange(e.target.value)}
                  />
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="date"
                        className="input"
                        value={form.date}
                        onChange={e => handleStartDateChange(e.target.value)}
                      />
                      <span style={{ fontWeight: "bold" }}>~</span>
                      <input
                        type="date"
                        className="input"
                        value={form.endDate}
                        min={form.date}
                        max={maxPeriodEndDate}
                        onChange={e => handleEndDateChange(e.target.value)}
                      />
                    </div>
                    <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 600, marginTop: 6 }}>
                      ※ 기간작업일 경우 최대 일주일까지만 설정 가능합니다. (선택: {selectedPeriodDays}일)
                    </div>
                  </div>
                )}
              </div>

              <div className="field" style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>시작 시간</label>
                  <input type="time" className="input" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>종료 시간</label>
                  <input type="time" className="input" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>안전보호장구</label>
            <input className="input" value={form.safetyGear} onChange={e => setForm({ ...form, safetyGear: e.target.value })} />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>상세 작업 내용</label>
            <textarea value={form.workContent} onChange={e => setForm({ ...form, workContent: e.target.value })} style={{ height: 80 }} />
          </div>

          {/* 차량 및 중장비 현황 */}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontWeight: "bold", margin: 0 }}>차량 및 중장비 현황 (해당 시 추가)</label>
              <button
                type="button"
                className="btn secondary"
                style={{ padding: "6px 12px", fontSize: 13 }}
                onClick={() => setVehicles([...vehicles, { name: "", count: "1", safetyDevice: "", etc: "" }])}
              >
                + 장비 추가
              </button>
            </div>
            {vehicles.map((v, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 2fr 1.5fr auto", gap: 6, marginBottom: 8 }}>
                <input className="input" placeholder="장비명 (예: 지게차)" value={v.name} onChange={e => {
                  const next = [...vehicles]; next[idx].name = e.target.value; setVehicles(next);
                }} />
                <input className="input" placeholder="수량" value={v.count} onChange={e => {
                  const next = [...vehicles]; next[idx].count = e.target.value; setVehicles(next);
                }} />
                <input className="input" placeholder="안전장치명" value={v.safetyDevice} onChange={e => {
                  const next = [...vehicles]; next[idx].safetyDevice = e.target.value; setVehicles(next);
                }} />
                <input className="input" placeholder="기타장비/비고" value={v.etc} onChange={e => {
                  const next = [...vehicles]; next[idx].etc = e.target.value; setVehicles(next);
                }} />
                <button type="button" className="btn secondary" style={{ padding: "0 10px" }} onClick={() => setVehicles(vehicles.filter((_, i) => i !== idx))}>삭제</button>
              </div>
            ))}
          </div>

          {/* 특별요구사항 */}
          <div className="formgrid" style={{ marginTop: 12 }}>
            <div className="field">
              <label>특별요구사항 (환경)</label>
              <input className="input" placeholder="폐기물·분진·폐수 등 환경 주의사항 (없으면 공란)" value={form.specialEnv} onChange={e => setForm({ ...form, specialEnv: e.target.value })} />
            </div>
            <div className="field">
              <label>특별요구사항 (안전)</label>
              <input className="input" placeholder="추가 안전 요구사항 (없으면 공란)" value={form.specialSafety} onChange={e => setForm({ ...form, specialSafety: e.target.value })} />
            </div>
          </div>
        </div>

        {/* 2. 작업 종류 선택 */}
        <div className="card section">
          <h3>2. 작업 종류 및 위험작업 선택 (다중 선택 가능)</h3>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 10, marginBottom: 6 }}>[작업종류]</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {GENERAL_WORK_TYPES.map(type => (
              <label key={type} className="checkrow" style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, margin: 0, background: form.workTypes.includes(type) ? "#eff6ff" : "#fff" }}>
                <input type="checkbox" checked={form.workTypes.includes(type)} onChange={e => toggleWorkType(type, e.target.checked)} />
                <span><b>{type}</b></span>
              </label>
            ))}
          </div>

          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 14, marginBottom: 6 }}>[위험작업 구분]</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10 }}>
            {HAZARD_WORK_TYPES.map(type => (
              <label key={type} className="checkrow" style={{ padding: "8px 10px", border: "1px solid #ddd", borderRadius: 8, margin: 0, background: form.workTypes.includes(type) ? "#eff6ff" : "#fff" }}>
                <input type="checkbox" checked={form.workTypes.includes(type)} onChange={e => toggleWorkType(type, e.target.checked)} />
                <span><b>{type}</b></span>
              </label>
            ))}
          </div>
        </div>

        {/* 화기작업 선택 시 자동 확장 양식 */}
        {form.workTypes.includes("화기작업") && (
          <div className="card section" style={{ border: "2px solid #eab308", background: "#fefce8" }}>
            <h3 style={{ color: "#a16207", marginTop: 0 }}>🔥 화기취급작업 신청서 및 화기현황</h3>
            <p className="muted" style={{ marginBottom: 14 }}>작업명칭·기간·장소·책임자는 상단 기본 정보와 자동 연동됩니다.</p>

            <div className="formgrid">
              <div className="field">
                <label>화기 작업종류</label>
                <input className="input" placeholder="예: 전기용접, 산소절단, 그라인더" value={fireDetails.fireWorkType} onChange={e => setFireDetails({ ...fireDetails, fireWorkType: e.target.value })} />
              </div>
              <div className="field">
                <label>화재감시자 성명</label>
                <input className="input" placeholder="화재감시자 이름 입력" value={fireDetails.fireWatcher} onChange={e => setFireDetails({ ...fireDetails, fireWatcher: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontWeight: "bold", margin: 0 }}>화기현황 (사용 화기 및 안전장치)</label>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => setFireItems([...fireItems, { name: "", count: "1", safetyDevice: "", working: "양호", note: "" }])}
                >
                  + 화기 추가
                </button>
              </div>
              {fireItems.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 2fr 1fr 1.2fr auto", gap: 6, marginBottom: 6 }}>
                  <input className="input" placeholder="화기명" value={item.name} onChange={e => {
                    const next = [...fireItems]; next[idx].name = e.target.value; setFireItems(next);
                  }} />
                  <input className="input" placeholder="수량" value={item.count} onChange={e => {
                    const next = [...fireItems]; next[idx].count = e.target.value; setFireItems(next);
                  }} />
                  <input className="input" placeholder="안전장치명" value={item.safetyDevice} onChange={e => {
                    const next = [...fireItems]; next[idx].safetyDevice = e.target.value; setFireItems(next);
                  }} />
                  <select className="input" value={item.working} onChange={e => {
                    const next = [...fireItems]; next[idx].working = e.target.value; setFireItems(next);
                  }}>
                    <option value="양호">작동:양호</option>
                    <option value="불량">작동:불량</option>
                  </select>
                  <input className="input" placeholder="비고" value={item.note} onChange={e => {
                    const next = [...fireItems]; next[idx].note = e.target.value; setFireItems(next);
                  }} />
                  <button type="button" className="btn secondary" style={{ padding: "0 8px" }} onClick={() => setFireItems(fireItems.filter((_, i) => i !== idx))}>삭제</button>
                </div>
              ))}
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>작업절차 및 안전조치 내용</label>
              <textarea style={{ height: 85 }} value={fireDetails.procedure} onChange={e => setFireDetails({ ...fireDetails, procedure: e.target.value })} />
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>보충작업 필요여부 (해당 시 체크)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginTop: 6 }}>
                {FIRE_SUPPLEMENTARY_TYPES.map(sub => (
                  <label key={sub} className="checkrow" style={{ fontSize: 13, margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={fireDetails.supplementaryWorks.includes(sub)}
                      onChange={e => {
                        if (e.target.checked) setFireDetails({ ...fireDetails, supplementaryWorks: [...fireDetails.supplementaryWorks, sub] });
                        else setFireDetails({ ...fireDetails, supplementaryWorks: fireDetails.supplementaryWorks.filter(s => s !== sub) });
                      }}
                    />
                    <span>{sub}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>첨부자료 (작업자 명단, 장비목록, 도면 등 여러 장 선택 가능)</label>
              <input type="file" accept="image/*" multiple onChange={e => setFireFiles(Array.from(e.target.files || []))} />
              {fireFiles.length > 0 && <div style={{ fontSize: 12, color: "#15803d", marginTop: 4 }}>선택된 파일: {fireFiles.length}개</div>}
            </div>
          </div>
        )}

        {/* 중량물취급작업 선택 시 자동 확장 양식 */}
        {form.workTypes.includes("중량물취급작업") && (
          <div className="card section" style={{ border: "2px solid #2563eb", background: "#eff6ff" }}>
            <h3 style={{ color: "#1d4ed8", marginTop: 0 }}>🏗️ 중량물 취급 작업계획서</h3>
            <p className="muted" style={{ marginBottom: 14 }}>작업명·일시·장소·책임자는 상단 기본 정보와 자동 연동됩니다.</p>

            <h4 style={{ marginBottom: 8, borderBottom: "1px solid #bfdbfe", paddingBottom: 4 }}>① 작업개요 및 직책별 배치 인원</h4>
            <div className="formgrid">
              <div className="field">
                <label>신호방법</label>
                <input className="input" value={heavyDetails.signalMethod} onChange={e => setHeavyDetails({ ...heavyDetails, signalMethod: e.target.value })} />
              </div>
              <div className="field">
                <label>제한속도</label>
                <input className="input" value={heavyDetails.speedLimit} onChange={e => setHeavyDetails({ ...heavyDetails, speedLimit: e.target.value })} />
              </div>
            </div>

<div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontWeight: "bold", margin: 0 }}>직책별 작업인원 배치</label>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: "5px 10px", fontSize: 12 }}
                  onClick={() => setHeavyPersonnel([...heavyPersonnel, { role: "작업자", name: "", contact: "", location: "", ppe: "지급완료", license: "-" }])}
                >
                  + 인원 추가
                </button>
              </div>
              <div style={{ overflowX: "auto", paddingBottom: 4 }}>
                <div style={{ minWidth: 660 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.3fr 1fr 1.4fr 1.4fr 1.1fr 1.1fr 48px",
                      gap: 6,
                      padding: "6px 4px",
                      background: "#dbeafe",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#1e3a8a",
                      textAlign: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div>직책</div>
                    <div>성명</div>
                    <div>연락처</div>
                    <div>작업구간</div>
                    <div>보호구 지급유무</div>
                    <div>비고 (필요자격)</div>
                    <div>관리</div>
                  </div>
                  {heavyPersonnel.map((p, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1.4fr 1.4fr 1.1fr 1.1fr 48px", gap: 6, marginBottom: 6 }}>
                      <select className="input" value={p.role} onChange={e => {
                        const next = [...heavyPersonnel]; next[idx].role = e.target.value; setHeavyPersonnel(next);
                      }}>
                        <option value="작업지휘자">작업지휘자</option>
                        <option value="유도자(신호수)">유도자(신호수)</option>
                        <option value="조종(운전)자">조종(운전)자</option>
                        <option value="작업자">작업자</option>
                      </select>
                      <input className="input" placeholder="성명" value={p.name} onChange={e => {
                        const next = [...heavyPersonnel]; next[idx].name = e.target.value; setHeavyPersonnel(next);
                      }} />
                      <input className="input" type="tel" placeholder="010-0000-0000" value={p.contact} onChange={e => {
                        const next = [...heavyPersonnel]; next[idx].contact = e.target.value; setHeavyPersonnel(next);
                      }} />
                      <input className="input" placeholder="예: 인양구간 전방" value={p.location} onChange={e => {
                        const next = [...heavyPersonnel]; next[idx].location = e.target.value; setHeavyPersonnel(next);
                      }} />
                      <select className="input" value={p.ppe} onChange={e => {
                        const next = [...heavyPersonnel]; next[idx].ppe = e.target.value; setHeavyPersonnel(next);
                      }}>
                        <option value="지급완료">지급완료</option>
                        <option value="미지급">미지급</option>
                        <option value="해당없음">해당없음</option>
                      </select>
                      <input className="input" placeholder="비고/자격" value={p.license} onChange={e => {
                        const next = [...heavyPersonnel]; next[idx].license = e.target.value; setHeavyPersonnel(next);
                      }} />
                      <button type="button" className="btn secondary" style={{ padding: "0 6px", fontSize: 12 }} onClick={() => setHeavyPersonnel(heavyPersonnel.filter((_, i) => i !== idx))}>삭제</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label>다. 작업순서</label>
              <textarea style={{ height: 90 }} value={heavyDetails.workSequence} onChange={e => setHeavyDetails({ ...heavyDetails, workSequence: e.target.value })} />
            </div>

            <h4 style={{ marginTop: 20, marginBottom: 8, borderBottom: "1px solid #bfdbfe", paddingBottom: 4 }}>② 중량물 제원</h4>
            <div className="formgrid">
              <div className="field">
                <label>품명</label>
                <input className="input" placeholder="예: 조관기 롤 스탠드" value={heavyDetails.itemName} onChange={e => setHeavyDetails({ ...heavyDetails, itemName: e.target.value })} />
              </div>
              <div className="field">
                <label>중량물 형상</label>
                <input className="input" value={heavyDetails.itemShape} onChange={e => setHeavyDetails({ ...heavyDetails, itemShape: e.target.value })} />
              </div>
              <div className="field">
                <label>중량물 규격</label>
                <input className="input" placeholder="예: 2,000 × 1,500 × 1,200 mm" value={heavyDetails.itemSpec} onChange={e => setHeavyDetails({ ...heavyDetails, itemSpec: e.target.value })} />
              </div>
              <div className="field">
                <label>중량 / 1회 운반중량</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="총중량 (예: 5톤)" value={heavyDetails.totalWeight} onChange={e => setHeavyDetails({ ...heavyDetails, totalWeight: e.target.value })} />
                  <input className="input" placeholder="1회 (예: 2.5톤)" value={heavyDetails.singleWeight} onChange={e => setHeavyDetails({ ...heavyDetails, singleWeight: e.target.value })} />
                </div>
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>고정방법</label>
                <input className="input" value={heavyDetails.fixingMethod} onChange={e => setHeavyDetails({ ...heavyDetails, fixingMethod: e.target.value })} />
              </div>
            </div>

            <h4 style={{ marginTop: 20, marginBottom: 8, borderBottom: "1px solid #bfdbfe", paddingBottom: 4 }}>③ 기계(장비) 제원</h4>
            <div className="formgrid">
              <div className="field">
                <label>기계명(장비)</label>
                <input className="input" placeholder="예: 25톤 이동식 크레인" value={heavyDetails.machineName} onChange={e => setHeavyDetails({ ...heavyDetails, machineName: e.target.value })} />
              </div>
              <div className="field">
                <label>기계번호 (차량번호)</label>
                <input className="input" placeholder="예: 06가 1234" value={heavyDetails.machineNo} onChange={e => setHeavyDetails({ ...heavyDetails, machineNo: e.target.value })} />
              </div>
              <div className="field">
                <label>모델명 / 기계규격</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="모델명" value={heavyDetails.modelName} onChange={e => setHeavyDetails({ ...heavyDetails, modelName: e.target.value })} />
                  <input className="input" placeholder="규격(톤수)" value={heavyDetails.machineSpec} onChange={e => setHeavyDetails({ ...heavyDetails, machineSpec: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>작업능력 / 작업가능 반경</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="작업능력" value={heavyDetails.capacity} onChange={e => setHeavyDetails({ ...heavyDetails, capacity: e.target.value })} />
                  <input className="input" placeholder="반경(예: 10m)" value={heavyDetails.radius} onChange={e => setHeavyDetails({ ...heavyDetails, radius: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>조종(운전)자격</label>
                <input className="input" value={heavyDetails.operatorLicense} onChange={e => setHeavyDetails({ ...heavyDetails, operatorLicense: e.target.value })} />
              </div>
              <div className="field">
                <label>보험기간 / 검사여부</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="보험기간" value={heavyDetails.insurancePeriod} onChange={e => setHeavyDetails({ ...heavyDetails, insurancePeriod: e.target.value })} />
                  <input className="input" placeholder="검사여부" value={heavyDetails.inspectionStatus} onChange={e => setHeavyDetails({ ...heavyDetails, inspectionStatus: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>줄걸이 방법 / 운반거리</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="input" placeholder="줄걸이 방법" value={heavyDetails.slingingMethod} onChange={e => setHeavyDetails({ ...heavyDetails, slingingMethod: e.target.value })} />
                  <input className="input" placeholder="거리(예: 15m)" value={heavyDetails.transportDistance} onChange={e => setHeavyDetails({ ...heavyDetails, transportDistance: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>줄걸이 용구 (달기구)</label>
                <input className="input" value={heavyDetails.slingingGear} onChange={e => setHeavyDetails({ ...heavyDetails, slingingGear: e.target.value })} />
              </div>
            </div>

            <h4 style={{ marginTop: 20, marginBottom: 8, borderBottom: "1px solid #bfdbfe", paddingBottom: 4 }}>④ 재해예방대책 (유해·위험요인 및 예방대책)</h4>
            <div className="formgrid">
              <div className="field">
                <label>[작업 전] 유해·위험요인</label>
                <input className="input" value={heavyDetails.preWorkHazard} onChange={e => setHeavyDetails({ ...heavyDetails, preWorkHazard: e.target.value })} />
              </div>
              <div className="field">
                <label>[작업 전] 재해예방대책</label>
                <input className="input" value={heavyDetails.preWorkMeasure} onChange={e => setHeavyDetails({ ...heavyDetails, preWorkMeasure: e.target.value })} />
              </div>
              <div className="field">
                <label>[운반(인양)] 유해·위험요인</label>
                <input className="input" value={heavyDetails.liftingHazard} onChange={e => setHeavyDetails({ ...heavyDetails, liftingHazard: e.target.value })} />
              </div>
              <div className="field">
                <label>[운반(인양)] 재해예방대책</label>
                <input className="input" value={heavyDetails.liftingMeasure} onChange={e => setHeavyDetails({ ...heavyDetails, liftingMeasure: e.target.value })} />
              </div>
              <div className="field">
                <label>[인양물 안착] 유해·위험요인</label>
                <input className="input" value={heavyDetails.landingHazard} onChange={e => setHeavyDetails({ ...heavyDetails, landingHazard: e.target.value })} />
              </div>
              <div className="field">
                <label>[인양물 안착] 재해예방대책</label>
                <input className="input" value={heavyDetails.landingMeasure} onChange={e => setHeavyDetails({ ...heavyDetails, landingMeasure: e.target.value })} />
              </div>
            </div>

            <h4 style={{ marginTop: 20, marginBottom: 8, borderBottom: "1px solid #bfdbfe", paddingBottom: 4 }}>⑤ 운반경로(작업도면) 및 기타 붙임자료</h4>
            <div className="field">
              <label>작업도면 / 장비 제원표 / 자격증·보험증 사진 첨부 (여러 장 선택 가능)</label>
              <input type="file" accept="image/*" multiple onChange={e => setHeavyFiles(Array.from(e.target.files || []))} />
              {heavyFiles.length > 0 && <div style={{ fontSize: 12, color: "#1d4ed8", marginTop: 4 }}>선택된 파일: {heavyFiles.length}개</div>}
</div>
          </div>
        )}

        {/* 고소작업 추가 양식 */}
        {form.workTypes.includes("고소작업") && (
          <div className="card section" style={{ border: "2px solid #0ea5e9", background: "#f0f9ff" }}>
            <h3 style={{ color: "#0369a1", marginTop: 0 }}>🪜 고소작업 계획</h3>
            <div className="formgrid">
              <div className="field">
                <label>작업 높이 (m)</label>
                <input className="input" placeholder="예: 5m" value={extraDetails.highHeight} onChange={e => setExtraDetails({...extraDetails, highHeight: e.target.value})} />
              </div>
              <div className="field">
                <label>사용 장비</label>
                <input className="input" value={extraDetails.highEquip} onChange={e => setExtraDetails({...extraDetails, highEquip: e.target.value})} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>안전조치 점검</label>
                <input className="input" value={extraDetails.highMeasure} onChange={e => setExtraDetails({...extraDetails, highMeasure: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* 전기작업 추가 양식 */}
        {form.workTypes.includes("전기작업") && (
          <div className="card section" style={{ border: "2px solid #8b5cf6", background: "#f5f3ff" }}>
            <h3 style={{ color: "#6d28d9", marginTop: 0 }}>⚡ 전기작업 계획</h3>
            <div className="formgrid">
              <div className="field">
                <label>대상 설비명</label>
                <input className="input" placeholder="예: 메인 변압기, 분전반" value={extraDetails.elecTarget} onChange={e => setExtraDetails({...extraDetails, elecTarget: e.target.value})} />
              </div>
              <div className="field">
                <label>전압 구분</label>
                <input className="input" value={extraDetails.elecVolt} onChange={e => setExtraDetails({...extraDetails, elecVolt: e.target.value})} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>안전조치 점검</label>
                <input className="input" value={extraDetails.elecMeasure} onChange={e => setExtraDetails({...extraDetails, elecMeasure: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* 밀폐작업 추가 양식 */}
        {form.workTypes.includes("밀폐작업") && (
          <div className="card section" style={{ border: "2px solid #f97316", background: "#fff7ed" }}>
            <h3 style={{ color: "#c2410c", marginTop: 0 }}>🕳️ 밀폐공간 출입작업 계획</h3>
            <div className="formgrid">
              <div className="field">
                <label>외부 감시인 (성명/연락처)</label>
                <input className="input" placeholder="감시인 정보 입력" value={extraDetails.confineWatcher} onChange={e => setExtraDetails({...extraDetails, confineWatcher: e.target.value})} />
              </div>
              <div className="field">
                <label>비상연락체계</label>
                <input className="input" value={extraDetails.confineEmg} onChange={e => setExtraDetails({...extraDetails, confineEmg: e.target.value})} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>산소·유해가스 측정 결과 및 후속조치</label>
                <input className="input" value={extraDetails.confineGas} onChange={e => setExtraDetails({...extraDetails, confineGas: e.target.value})} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>가스 누출·유입 가능성 검토 및 조치</label>
                <input className="input" value={extraDetails.confineLeak} onChange={e => setExtraDetails({...extraDetails, confineLeak: e.target.value})} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>밀폐전용 보호구 및 장비</label>
                <input className="input" value={extraDetails.confinePpe} onChange={e => setExtraDetails({...extraDetails, confinePpe: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* 환경 추가 양식 */}
        {form.workTypes.includes("환경") && (
          <div className="card section" style={{ border: "2px solid #10b981", background: "#ecfdf5" }}>
            <h3 style={{ color: "#047857", marginTop: 0 }}>🌱 환경(화학/폐기물) 취급 계획</h3>
            <div className="formgrid">
              <div className="field">
                <label>취급 물질·폐기물 종류</label>
                <input className="input" value={extraDetails.envMaterial} onChange={e => setExtraDetails({...extraDetails, envMaterial: e.target.value})} />
              </div>
              <div className="field">
                <label>안전조치 점검</label>
                <input className="input" value={extraDetails.envMeasure} onChange={e => setExtraDetails({...extraDetails, envMeasure: e.target.value})} />
              </div>
            </div>
          </div>
        )}

        {/* 유틸리티작업 추가 양식 */}
        {form.workTypes.includes("유틸리티작업") && (
          <div className="card section" style={{ border: "2px solid #64748b", background: "#f8fafc" }}>
            <h3 style={{ color: "#334155", marginTop: 0 }}>⚙️ 유틸리티(배관/밸브) 작업 계획</h3>
            <div className="formgrid">
              <div className="field">
                <label>대상 라인 종류</label>
                <input className="input" value={extraDetails.utilLine} onChange={e => setExtraDetails({...extraDetails, utilLine: e.target.value})} />
              </div>
              <div className="field">
                <label>안전조치 점검</label>
                <input className="input" value={extraDetails.utilMeasure} onChange={e => setExtraDetails({...extraDetails, utilMeasure: e.target.value})} />
              </div>
            </div>
          </div>
        )}

{/* 3. 안전교육일지 첨부 */}
        <div className="card section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>3. 안전교육일지 첨부</h3>
            <label
              className="checkrow"
              style={{
                margin: 0,
                padding: "6px 12px",
                borderRadius: 8,
                border: form.trainingPending ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                background: form.trainingPending ? "#fef2f2" : "#f8fafc",
                color: form.trainingPending ? "#b91c1c" : "#1e293b",
                fontWeight: "bold",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={form.trainingPending}
                onChange={e => setForm({ ...form, trainingPending: e.target.checked })}
              />
              <span>당일 실시 예정</span>
            </label>
          </div>
          <p style={{ fontSize: 12.5, color: "#dc2626", margin: "0 0 14px 0", fontWeight: 500 }}>
            * 당일 실시 예정인 경우 체크 후 제출하시고, 작업 당일 TBM 실시 후 [승인 현황]에서 추가 제출해 주세요.
          </p>

          {form.trainingPending ? (
            <div style={{ background: "#fef2f2", border: "1px dashed #fca5a5", color: "#991b1b", padding: "14px 16px", borderRadius: 8, fontSize: 13 }}>
              <b>[당일 실시 예정 선택됨]</b> 허가서 먼저 제출 후, 작업 당일 <b>[승인 현황]</b> 페이지의 빨간색 <b>[교육일지 추가제출]</b> 버튼에서 등록할 수 있습니다.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <label className="checkrow"><input type="radio" checked={form.trainingType === "form"} onChange={() => setForm({ ...form, trainingType: "form" })} /> 화면 직접 작성</label>
                <label className="checkrow"><input type="radio" checked={form.trainingType === "photo"} onChange={() => setForm({ ...form, trainingType: "photo" })} /> 종이일지 사진 촬영</label>
              </div>

{form.trainingType === "form" ? (
                <div className="formgrid">
                  <div className="field">
                    <label>교육 강사 (현장관리감독자)</label>
                    <input className="input" value={form.trainingInstructor} onChange={e => setForm({ ...form, trainingInstructor: e.target.value })} />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>안전 교육 내용</label>
                    <textarea value={form.trainingContent} onChange={e => setForm({ ...form, trainingContent: e.target.value })} style={{ height: 210 }} />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>안전교육 참석자</label>
                    <input
                      className="input"
                      placeholder="예: 홍길동, 김철수, 이영희 (교육에 참석한 작업자 성명을 모두 기재해 주세요)"
                      value={form.trainingAttendees}
                      onChange={e => setForm({ ...form, trainingAttendees: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label>안전교육일지 사진 첨부</label>
                  <input type="file" accept="image/*" capture="environment" onChange={e => setTrainingPhoto(e.target.files?.[0] || null)} />
                </div>
              )}
            </>
          )}
        </div>

        {/* 4. 안전관리 준수 서약 및 서명 */}
        <div className="card section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <h3 style={{ margin: 0 }}>4. 안전관리 준수 서약 및 서명</h3>
            <label
              className="checkrow"
              style={{
                margin: 0,
                padding: "6px 12px",
                borderRadius: 8,
                border: form.pledgePending ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
                background: form.pledgePending ? "#fef2f2" : "#f8fafc",
                color: form.pledgePending ? "#b91c1c" : "#1e293b",
                fontWeight: "bold",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={form.pledgePending}
                onChange={e => setForm({ ...form, pledgePending: e.target.checked })}
              />
              <span>당일 실시 예정</span>
            </label>
          </div>
          <p style={{ fontSize: 12.5, color: "#dc2626", margin: "0 0 14px 0", fontWeight: 500 }}>
            * 당일 실시 예정인 경우 체크 후 제출하시고, 작업 당일 TBM 실시 후 [승인 현황]에서 추가 제출해 주세요.
          </p>

          {form.pledgePending && (
            <div style={{ background: "#fef2f2", border: "1px dashed #fca5a5", color: "#991b1b", padding: "12px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
              <b>[당일 실시 예정 선택됨]</b> 허가서 먼저 제출 후, 작업 당일 <b>[승인 현황]</b>의 빨간색 <b>[서약·서명 추가제출]</b> 버튼에서 <b>이 기기 연속 서명</b> 또는 <b>카톡방 링크 공유(각자 폰 서명)</b>로 진행할 수 있습니다.
            </div>
          )}
          <div style={{ background: "#f8f9fa", padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, maxHeight: 160, overflowY: "auto", marginBottom: 16, border: "1px solid #ddd" }}>
            <b>상기 본인은 귀 작업장에서 작업하는 기간 중 본인의 관리책임 및 지휘·감독 근로자의 불안전행동 또는 귀사에서 요구하는 준수사항 위반으로 발생되는 제반사고에 대하여 본인이 일체의 책임을 지겠으며, 아울러 안전사고 예방을 위해 아래사항을 성실히 이행할 것을 서약합니다.</b><br />
            01. 도급공사 관련 작업허가신청서를 작성·제출하여 공장장의 승인을 득한 후 작업한다.<br />
            02. 작업자에 필요한 안전보건교육을 실시 후 작업한다.<br />
            03. 작업현장 내 작업 시 보호구(안전헬멧, 안전화) 착용하여 작업한다.<br />
            04. 고소작업, 전기작업, 화기작업(용접, 절단 등)의 안전수칙 준수하여 작업한다.<br />
            05. 작업 전에는 반드시 작업준비 상태를 점검 및 위험예지훈련(TBM)을 실시한다.<br />
            06. 작업현장 내 모든 위험작업의 수행은 위험성평가를 실시한 후 작업한다.<br />
            07. 사다리 작업 시 최상부에는 올라가서 작업하지 않는다.<br />
            08. 작업현장에 대한 안전점검을 실시하고 안전점검표 작성·보관한다.<br />
            09. 밀폐공간출입, 중량물 취급, 굴착작업은 안전수칙을 준수하여 작업한다.<br />
            10. 중장비 사용 시 사용승인을 받고, 신호수 배치하여 작업한다.<br />
            11. 작업현장 내 작업 시 안전장치나 안전시설물은 임의로 해체하지 않는다.<br />
            12. 작업현장 정리정돈 철저, 흡연구역 이외의 흡연행위 금지한다.<br />
            13. 작업 시 산업안전보건법, 중대재해처벌법 등 기타 관련법규를 준수하여 작업한다.<br />
            14. 안전보건공단에서 Guide하는 안전수칙 준수한다.<br />
            15. 귀사 안전·보건에 관한 요구사항 준수하여 이행한다.<br />
            16. 상기 내용을 지키지 않을 경우 작업을 중지한다.
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {signatures.map((sig, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 8,
                  textAlign: "center",
                  width: 120,
                  background: "#fff",
                }}
              >
                <button
                  type="button"
title="서명 삭제"
                  onClick={() => {
                    if (sig.id) setDeletedSigIds([...deletedSigIds, sig.id]);
                    setSignatures(signatures.filter((_, i) => i !== idx));
                  }}
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    border: "1px solid #dc2626",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "bold",
                    lineHeight: "20px",
                    textAlign: "center",
                    padding: 0,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                >
                  ✕
                </button>
                <img src={sig.data} alt="서명" style={{ width: "100%", height: 60, objectFit: "contain", background: "#f1f1f1", borderRadius: 4 }} />
                <div style={{ marginTop: 4, fontSize: 12 }}><b>{sig.name}</b> ({sig.type})</div>
              </div>
            ))}

            <button type="button" className="btn secondary" style={{ width: 120, height: 95 }} onClick={() => setShowSignModal(true)}>
              + 서명 추가
            </button>
          </div>
        </div>

{editId && existingStatus === "approved" ? (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: 16, borderRadius: 8, textAlign: "center", fontWeight: "bold", marginBottom: 60 }}>
            이미 허가완료된 안전작업허가서는 수정할 수 없습니다.
          </div>
        ) : (
          <button type="button" className="btn" style={{ width: "100%", padding: 16, fontSize: 16, marginBottom: 60 }} onClick={submitPtw} disabled={isSubmitting}>
            {isSubmitting ? "전송 중..." : editId ? "안전작업허가서 수정 완료" : "안전작업허가서 제출 (승인 요청)"}
          </button>
        )}

        {msg && <p style={{ color: "#b33", textAlign: "center", marginBottom: 40 }}>{msg}</p>}

        {showSignModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div className="card" style={{ width: "100%", maxWidth: 400 }}>
              <h3>작업자 전자 서명</h3>

              <div className="field" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <select className="input" value={signType} onChange={e => setSignType(e.target.value)} style={{ width: 100 }}>
                  <option value="대표자">대표자</option>
                  <option value="근로자">근로자</option>
                </select>
                <input className="input" placeholder="이름 입력" value={signName} onChange={e => setSignName(e.target.value)} style={{ flex: 1 }} />
              </div>

              <div style={{ border: "2px dashed #ccc", borderRadius: 8, background: "#fafafa", marginBottom: 16 }}>
                <canvas
                  ref={canvasRef} width={360} height={150}
                  style={{ width: "100%", height: 150, touchAction: "none" }}
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px 8px" }}>
                  <span style={{ fontSize: 12, color: "#888" }}>이곳에 손가락으로 서명하세요</span>
                  <button type="button" className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={clearCanvas}>지우기</button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn secondary" style={{ flex: 1 }} onClick={() => setShowSignModal(false)}>취소</button>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={saveSignature}>서명 완료</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PtwApplyPage() {
  return (
    <Suspense fallback={<main className="shell"><div className="card">허가서 양식 불러오는 중...</div></main>}>
      <PtwApplyForm />
    </Suspense>
  );
}