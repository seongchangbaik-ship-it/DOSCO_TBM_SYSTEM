"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import ExcelJS from "exceljs";
import { supabase, configured } from "@/lib/supabase";

type Week = {
  id: string;
  title: string;
  topic: string;
  content: string;
  week_label: string;
  starts_at: string;
  ends_at: string;
  is_published: boolean;
  photo_paths?: string[];
};

const PROCESS_LIST = ["조관", "슬리터", "도장", "출하", "공무", "품질", "전사공통"];

export default function Admin() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [acks, setAcks] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [spotLogs, setSpotLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<{
    type: "regular" | "spot";
    data: any;
    photoUrl: string;
    eduPhotoUrls: string[];
  } | null>(null);

  const [processRules, setProcessRules] = useState<any[]>([]);
  const [selectedProcess, setSelectedProcess] = useState("조관");
  const [newRuleText, setNewRuleText] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleText, setEditingRuleText] = useState("");

  const [selectedWeekId, setSelectedWeekId] = useState<string>("all");
  const filteredAcks =
    selectedWeekId === "all" ? acks : acks.filter((a) => a.week_id === selectedWeekId);
  const filteredPhotos =
    selectedWeekId === "all" ? photos : photos.filter((p) => p.week_id === selectedWeekId);

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [resetSending, setResetSending] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ path: string; url: string }[]>([]);
  const [removedPhotoPaths, setRemovedPhotoPaths] = useState<string[]>([]);
  const [selectedPreviewUrls, setSelectedPreviewUrls] = useState<string[]>([]);

  const [title, setTitle] = useState("주간 TBM 안전교육");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [label, setLabel] = useState("2026년 11월 3주차");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10));

  function handlePhotoSelect(e: any) {
    const files = Array.from(e.target.files || []) as File[];

    if (existingPhotos.length + selectedFiles.length + files.length > 5) {
      setMsg("사진은 최대 5장까지 첨부할 수 있습니다.");
      e.target.value = "";
      return;
    }

    const validFiles = files.filter((file) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setMsg("JPG, PNG, WEBP 사진만 첨부할 수 있습니다.");
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMsg("사진 한 장의 용량은 5MB 이하여야 합니다.");
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setSelectedPreviewUrls((prev) => [
      ...prev,
      ...validFiles.map((file) => URL.createObjectURL(file)),
    ]);
    e.target.value = "";
  }

  function removeSelectedPhoto(index: number) {
    URL.revokeObjectURL(selectedPreviewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function verifyAdmin() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
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
      setLoginMsg(
        error
          ? "관리자 조회 오류: " + error.message
          : "관리자 등록 정보를 찾을 수 없습니다."
      );
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAdmin(false);
        setChecking(false);
      } else {
        setTimeout(() => verifyAdmin(), 0);
      }
    });
    return () => subscription.unsubscribe();
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
      setLoginMsg(
        "로그인 실패: " +
          error.message +
          (error.status ? " (상태코드: " + error.status + ")" : "")
      );
      return;
    }
    await verifyAdmin();
  }

  async function sendResetEmail() {
    setLoginMsg("");
    if (!email.trim()) {
      setLoginMsg("먼저 관리자 이메일을 입력해 주세요.");
      return;
    }
    setResetSending(true);
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) {
      setLoginMsg("메일 발송 실패: " + error.message);
    } else {
      setLoginMsg("비밀번호 재설정 메일을 발송했습니다. 최신 이메일을 확인해 주세요.");
    }
    setResetSending(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setPassword("");
  }

  async function load() {
    if (!configured || !isAdmin) return;

    const [w, a, p, s, r] = await Promise.all([
      supabase.from("tbm_weeks").select("*").order("starts_at", { ascending: false }),
      supabase
        .from("tbm_acknowledgements")
        .select("*,companies(name),teams(name),tbm_weeks(week_label,topic,content)")
        .order("acknowledged_at", { ascending: false })
        .limit(1000),
      supabase
        .from("tbm_team_submissions")
        .select("*,companies(name),teams(name),tbm_weeks(week_label,topic,content)")
        .order("submitted_at", { ascending: false })
        .limit(500),
      supabase
        .from("tbm_spot_logs")
        .select("*,companies(name),teams(name),tbm_spot_signatures(*)")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("tbm_process_rules")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    setWeeks(w.data || []);
    setAcks(a.data || []);
    setSpotLogs(s.data || []);
    setProcessRules(r.data || []);

    const submissionPhotos = await Promise.all(
      (p.data || []).map(async (item) => {
        if (!item.photo_path) return { ...item, photo_url: "" };

        const { data, error } = await supabase.storage
          .from("tbm-photos")
          .createSignedUrl(item.photo_path, 3600);

        return {
          ...item,
          photo_url: error ? "" : data?.signedUrl || "",
        };
      })
    );

    setPhotos(submissionPhotos);
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function addProcessRule() {
    const lines = newRuleText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      alert("추가할 안전수칙 내용을 입력해 주세요.");
      return;
    }
    const currentCount = processRules.filter((r) => r.process_name === selectedProcess).length;
    const inserts = lines.map((text, idx) => ({
      process_name: selectedProcess,
      rule_text: text,
      sort_order: currentCount + idx + 1,
    }));
    const { error } = await supabase.from("tbm_process_rules").insert(inserts);
    if (error) {
      alert("수칙 추가 실패: " + error.message);
      return;
    }
    setNewRuleText("");
    load();
  }

  async function saveEditRule(id: string) {
    if (!editingRuleText.trim()) return;
    const { error } = await supabase
      .from("tbm_process_rules")
      .update({ rule_text: editingRuleText.trim() })
      .eq("id", id);
    if (error) {
      alert("수정 실패: " + error.message);
      return;
    }
    setEditingRuleId(null);
    setEditingRuleText("");
    load();
  }

  async function deleteProcessRule(id: string) {
    if (!window.confirm("이 안전수칙을 삭제하시겠습니까?")) return;
    await supabase.from("tbm_process_rules").delete().eq("id", id);
    load();
  }

  async function openAdminTbmDetail(type: "regular" | "spot", data: any) {
    let url = "";
    const path = type === "regular" ? data.leaderSubmission?.photo_path : data.photo_path;
    if (type === "regular" && data.leaderSubmission?.photo_url) {
      url = data.leaderSubmission.photo_url;
    } else if (path) {
      const { data: signed } = await supabase.storage
        .from("tbm-photos")
        .createSignedUrl(path, 3600);
      url = signed?.signedUrl || "";
    }

    const eduPhotoUrls: string[] = [];
    if (type === "regular" && data.weekId) {
      const targetWeek = weeks.find((w) => w.id === data.weekId);
      const eduPaths = targetWeek?.photo_paths || [];
      for (const eduPath of eduPaths) {
        const { data: signedEdu, error: eduErr } = await supabase.storage
          .from("tbm-education-photos")
          .createSignedUrl(eduPath, 3600);
        if (!eduErr && signedEdu?.signedUrl) {
          eduPhotoUrls.push(signedEdu.signedUrl);
        }
      }
    }

    setDetailModal({ type, data, photoUrl: url, eduPhotoUrls });
  }

  async function deleteSpotLog(id: string) {
    if (!window.confirm("이 수시 작업 TBM 기록을 삭제하시겠습니까?")) return;
    await supabase.from("tbm_spot_signatures").delete().eq("spot_id", id);
    const { error } = await supabase.from("tbm_spot_logs").delete().eq("id", id);
    if (error) {
      setMsg("삭제 실패: " + error.message);
      return;
    }
    if (detailModal?.type === "spot" && detailModal.data?.id === id) {
      setDetailModal(null);
    }
    setMsg("수시 작업 TBM 기록이 삭제되었습니다.");
    load();
  }

  async function deleteRegularTeamRecord(item: any) {
    if (deletingKey) return;
    const confirmText =
      `[${item.weekLabel} / ${item.companyName} - ${item.teamName}] 정기 안전교육 기록을 삭제하시겠습니까?\n` +
      `조장 사진·일지 및 근로자 서명(${item.workers.length}명) 기록이 삭제됩니다.`;
    if (!window.confirm(confirmText)) return;

    setDeletingKey(item.key);
    setMsg("");

    try {
      if (item.leaderSubmission?.photo_path) {
        await supabase.storage.from("tbm-photos").remove([item.leaderSubmission.photo_path]);
      }

      if (item.leaderSubmission?.id) {
        const { error: subErr } = await supabase
          .from("tbm_team_submissions")
          .delete()
          .eq("id", item.leaderSubmission.id);
        if (subErr) {
          throw new Error("조장 사진·일지 삭제 실패: " + subErr.message);
        }
      }

      const { error: ackErr } = await supabase
        .from("tbm_acknowledgements")
        .delete()
        .eq("week_id", item.weekId)
        .eq("company_id", item.companyId)
        .eq("team_id", item.teamId);

      if (ackErr) {
        throw new Error("근로자 서명 삭제 실패: " + ackErr.message);
      }

      if (detailModal?.type === "regular" && detailModal.data?.key === item.key) {
        setDetailModal(null);
      }

      setMsg(`[${item.companyName} - ${item.teamName}] 정기 안전교육 조별 기록이 삭제되었습니다.`);
      await load();
    } catch (err: any) {
      setMsg("삭제 오류: " + (err?.message || "삭제 중 문제가 발생했습니다."));
    } finally {
      setDeletingKey(null);
    }
  }

  async function publish() {
    if (!title || !topic || !content) {
      setMsg("제목, 주제, 교육내용을 입력해 주세요.");
      return;
    }

    const uploadedPaths: string[] = [];

    for (const file of selectedFiles) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `education/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("tbm-education-photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setMsg("사진 업로드 실패: " + uploadError.message);
        return;
      }

      uploadedPaths.push(path);
    }

    let oldPaths: string[] = [];

    if (editingId) {
      const { data, error: fetchError } = await supabase
        .from("tbm_weeks")
        .select("photo_paths")
        .eq("id", editingId)
        .single();

      if (fetchError) {
        setMsg("기존 사진 조회 실패: " + fetchError.message);
        return;
      }

      oldPaths = (data.photo_paths || []).filter(
        (path: string) => !removedPhotoPaths.includes(path)
      );
    }

    const values = {
      title,
      topic,
      content,
      week_label: label,
      starts_at: start,
      ends_at: end,
      photo_paths: [...oldPaths, ...uploadedPaths],
    };

    let error;

    if (editingId) {
      ({ error } = await supabase.from("tbm_weeks").update(values).eq("id", editingId));
    } else {
      ({ error } = await supabase
        .from("tbm_weeks")
        .insert({ ...values, is_published: true }));
    }

    if (error) {
      setMsg("교육자료 저장 실패: " + error.message);
      return;
    }

    setMsg(
      editingId ? "교육자료가 수정되었습니다." : "TBM 교육자료가 게시되었습니다."
    );

    selectedPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setSelectedPreviewUrls([]);
    setExistingPhotos([]);
    setRemovedPhotoPaths([]);

    setEditingId(null);
    setTitle("주간 TBM 안전교육");
    setTopic("");
    setContent("");
    load();
  }

  async function startEdit(w: Week) {
    setEditingId(w.id);
    setTitle(w.title);
    setTopic(w.topic);
    setContent(w.content);
    setLabel(w.week_label);
    setStart(w.starts_at);
    setEnd(w.ends_at);

    setRemovedPhotoPaths([]);

    selectedPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setSelectedPreviewUrls([]);

    const paths = w.photo_paths || [];
    const loadedPhotos: { path: string; url: string }[] = [];

    for (const path of paths) {
      const { data, error } = await supabase.storage
        .from("tbm-education-photos")
        .createSignedUrl(path, 3600);

      if (!error && data?.signedUrl) {
        loadedPhotos.push({
          path,
          url: data.signedUrl,
        });
      }
    }

    setExistingPhotos(loadedPhotos);
    setMsg("수정할 내용을 변경한 뒤 저장해 주세요.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("주간 TBM 안전교육");
    setTopic("");
    setContent("");
    setMsg("수정을 취소했습니다.");
  }

  async function removeWeek(id: string) {
    if (!window.confirm("정말 이 교육자료를 삭제하시겠습니까?")) return;

    const { error } = await supabase.from("tbm_weeks").delete().eq("id", id);

    if (error) {
      setMsg("삭제 실패: " + error.message);
      return;
    }

    if (editingId === id) cancelEdit();

    setMsg("교육자료가 삭제되었습니다.");
    load();
  }

  async function qr() {
    const { data: companiesData } = await supabase
      .from("companies")
      .select("id, name")
      .eq("active", true)
      .order("name");
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, company_id")
      .eq("active", true)
      .order("name");

    if (!companiesData || !teamsData) {
      alert("회사 또는 조 정보를 불러오지 못했습니다.");
      return;
    }

    const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];
    companiesData.sort((a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name));

    const teamOrder: Record<string, string[]> = {
      동아스틸: ["전기파트", "품질파트", "기타부서"],
      다인스틸: ["P5", "P9", "P10"],
      나로스틸: ["C1", "P1", "P7", "P8"],
      세현스틸: ["SL2", "SL5", "SCP1", "SCP2", "1공무", "2공무", "1품질", "2품질"],
      에스로지스: ["1출하", "2출하"],
    };

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("라인별 TBM QR코드");
    ws.columns = [{ width: 25 }, { width: 35 }, { width: 25 }, { width: 35 }];

    let row = 1;
    let col = 1;

    for (const company of companiesData) {
      const order = teamOrder[company.name] || [];
      const companyTeams = teamsData
        .filter((t) => t.company_id === company.id)
        .sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

      for (const team of companyTeams) {
        const url = `${window.location.origin}/tbm?c=${company.id}&t=${team.id}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        const base64 = dataUrl.split(",")[1];
        const imageId = wb.addImage({ base64, extension: "png" });

        if (col > 3) {
          row += 10;
          col = 1;
        }

        ws.getCell(row, col).value = `${company.name} - ${team.name}`;
        ws.getCell(row, col).font = { bold: true, size: 14 };
        ws.getCell(row, col).alignment = { horizontal: "center" };

        ws.addImage(imageId, {
          tl: { col: col - 1, row: row },
          ext: { width: 160, height: 160 },
        });

        col += 2;
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "DOSCO_라인별_TBM_QR코드.xlsx";
    link.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  async function excel() {
    const wb = new ExcelJS.Workbook();
    const dateStr = new Date().toISOString().slice(0, 10);

    const ackSheet = wb.addWorksheet("개인별 서명 현황");
    ackSheet.columns = [
      { header: "교육 회차", key: "week", width: 16 },
      { header: "소속 회사", key: "company", width: 16 },
      { header: "소속 조", key: "team", width: 14 },
      { header: "이름", key: "name", width: 12 },
      { header: "작업자 선택 안전수칙", key: "rules", width: 45 },
      { header: "확인 일시", key: "date", width: 22 },
      { header: "작업자 서명", key: "sig", width: 22 },
    ];

    for (const a of acks) {
      const rulesText =
        Array.isArray(a.selected_rules) && a.selected_rules.length > 0
          ? a.selected_rules.join(" / ")
          : "-";
      const row = ackSheet.addRow({
        week: a.tbm_weeks?.week_label || "",
        company: a.companies?.name || "",
        team: a.teams?.name || "",
        name: a.worker_name || "",
        rules: rulesText,
        date: new Date(a.acknowledged_at).toLocaleString("ko-KR"),
        sig: "",
      });
      row.getCell(5).alignment = { wrapText: true, vertical: "middle" };

      if (a.signature_data) {
        row.height = 42;
        try {
          const base64 = a.signature_data.split(",")[1];
          const imageId = wb.addImage({ base64, extension: "png" });
          ackSheet.addImage(imageId, {
            tl: { col: 6, row: row.number - 1 },
            ext: { width: 90, height: 40 },
          });
        } catch {
          row.getCell(7).value = "서명오류";
        }
      } else {
        row.getCell(7).value = "서명없음";
      }
    }

    const photoSheet = wb.addWorksheet("조별 TBM 일지");
    photoSheet.columns = [
      { header: "교육 회차", key: "week", width: 16 },
      { header: "회사 / 조", key: "team", width: 22 },
      { header: "조장 (제출자)", key: "leader", width: 15 },
      { header: "제출 일시", key: "date", width: 22 },
      { header: "작업자 건강상태", key: "health", width: 18 },
      { header: "금일 핵심 위험요인", key: "hazard", width: 35 },
      { header: "현장 실시 사진", key: "image", width: 25 },
    ];

    for (const p of photos) {
      const row = photoSheet.addRow({
        week: p.tbm_weeks?.week_label || "",
        team: `${p.companies?.name || ""} - ${p.teams?.name || ""}`,
        leader: p.leader_name || "",
        date: new Date(p.submitted_at).toLocaleString("ko-KR"),
        health: p.health_status || "이상없음",
        hazard: p.daily_hazard || "해당없음",
        image: "",
      });

      row.height = 85;

      if (!p.photo_url) {
        row.getCell(7).value = "사진 없음";
        continue;
      }

      try {
        const res = await fetch(p.photo_url);
        const blob = await res.blob();
        const base64: string = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const imgId = wb.addImage({ base64: base64.split(",")[1], extension: "jpeg" });
        photoSheet.addImage(imgId, {
          tl: { col: 6, row: row.number - 1 },
          ext: { width: 130, height: 90 },
        });
      } catch {
        row.getCell(7).value = "사진 삽입 실패";
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DOSCO_TBM_교육실적_${dateStr}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const latest = weeks.find((w) => w.is_published);
  const count = acks.filter((a) => a.tbm_weeks?.week_label === latest?.week_label).length;

  if (!configured) {
    return (
      <main className="shell">
        <div className="card">
          <h1>Supabase 연결 필요</h1>
          <p className="muted">
            프로젝트 루트의 .env.local 설정을 확인하고 개발 서버를 다시 시작해 주세요.
          </p>
        </div>
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
      <main className="shell" style={{ maxWidth: 480, paddingTop: 70 }}>
        <div className="card">
          <div className="brand">DOSCO TBM SYSTEM</div>
          <h1>관리자 로그인</h1>
          <p className="muted">등록된 관리자 계정으로 로그인해 주세요.</p>

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

          <button
            className="btn secondary"
            style={{ width: "100%", marginTop: 10 }}
            onClick={sendResetEmail}
            disabled={resetSending}
          >
            {resetSending ? "메일 발송 중..." : "비밀번호 찾기"}
          </button>

          <Link
            href="/"
            className="btn secondary"
            style={{
              display: "block",
              width: "100%",
              marginTop: 10,
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            홈으로 돌아가기
          </Link>

          {loginMsg && <p style={{ color: "#b33", fontSize: 13, marginTop: 10 }}>{loginMsg}</p>}
        </div>
      </main>
    );
  }

  const mergedMap = new Map<string, any>();
  filteredPhotos.forEach((p: any) => {
    const key = `${p.week_id}_${p.company_id}_${p.team_id}`;
    mergedMap.set(key, {
      key,
      weekId: p.week_id,
      companyId: p.company_id,
      teamId: p.team_id,
      weekLabel: p.tbm_weeks?.week_label || "-",
      topic: p.tbm_weeks?.topic || "-",
      content: p.tbm_weeks?.content || "-",
      companyName: p.companies?.name || "-",
      teamName: p.teams?.name || "-",
      leaderSubmission: p,
      workers: [],
    });
  });
  filteredAcks.forEach((a: any) => {
    const key = `${a.week_id}_${a.company_id}_${a.team_id}`;
    if (mergedMap.has(key)) {
      mergedMap.get(key).workers.push(a);
    } else {
      mergedMap.set(key, {
        key,
        weekId: a.week_id,
        companyId: a.company_id,
        teamId: a.team_id,
        weekLabel: a.tbm_weeks?.week_label || "-",
        topic: a.tbm_weeks?.topic || "-",
        content: a.tbm_weeks?.content || "-",
        companyName: a.companies?.name || "-",
        teamName: a.teams?.name || "-",
        leaderSubmission: null,
        workers: [a],
      });
    }
  });
  const mergedRegular = Array.from(mergedMap.values());

  return (
    <>
      <style>{`
        .admin-print-card { box-sizing: border-box; max-width: 800px; width: 100%; overflow-x: hidden; }
        .admin-sheet-table { width: 100%; max-width: 100%; min-width: 0; border-collapse: collapse; border: 2px solid #000; font-size: 12px; table-layout: fixed; box-sizing: border-box; }
        .admin-sheet-table th, .admin-sheet-table td { border: 1px solid #000; padding: 6px; overflow-wrap: anywhere; word-break: break-word; min-width: 0; box-sizing: border-box; }
        .admin-sheet-label { background: #f9fafb; width: 110px; }
        .admin-print-sig-card { border: 1px solid #999; padding: 4px; text-align: center; width: 95px; max-width: 100%; box-sizing: border-box; }
        @media (max-width: 640px) {
          .admin-print-wrapper { padding: 6px !important; }
          .admin-print-card { padding: 8px !important; border-radius: 10px !important; width: 100% !important; }
          .admin-sheet-table { font-size: 9px; line-height: 1.3; }
          .admin-sheet-table th, .admin-sheet-table td { padding: 3px; }
          .admin-sheet-title { font-size: 12px !important; padding: 6px 4px !important; }
          .admin-sheet-label { width: 48px !important; font-size: 8.5px !important; }
          .admin-print-card img { max-width: 100% !important; height: auto !important; max-height: 140px !important; object-fit: contain; display: block; margin: 0 auto; }
          .admin-print-sig-card { width: calc((100% - 12px) / 3) !important; min-width: 0; padding: 2px; }
          .admin-print-sig-card img { height: 30px !important; }
          .admin-print-sig-card div { font-size: 9px !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          .no-print { display: none !important; }
          .admin-print-wrapper { position: static !important; inset: auto !important; background: none !important; padding: 0 !important; }
          .admin-print-card { box-shadow: none !important; border: none !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 10mm !important; overflow: visible !important; }
          .admin-sheet-table { font-size: 12px !important; table-layout: auto !important; }
          .admin-sheet-table th, .admin-sheet-table td { padding: 6px !important; }
          .admin-sheet-title { font-size: 18px !important; padding: 10px !important; }
          .admin-sheet-label { width: 110px !important; font-size: 12px !important; }
          .admin-print-sig-card { width: 95px !important; padding: 4px !important; }
        }
      `}</style>

      <header className="topbar no-print">
        <div className="brand">
          DOSCO TBM SYSTEM
          <small>관리자 대시보드</small>
        </div>
        <nav className="nav">
          <Link href="/tbm-main">← TBM 메뉴</Link>
          <Link href="/">홈</Link>
          <Link href="/tbm">근로자 화면</Link>
          <Link href="/leader">조장 화면</Link>
          <Link href="/tbm/status">실시 현황</Link>
          <button className="btn secondary" onClick={logout}>
            로그아웃
          </button>
        </nav>
      </header>

      <main className="shell no-print">
        <div className="pagehead">
          <div>
            <h1>관리자 대시보드</h1>
            <div className="muted">교육자료 게시 및 교육 실시 현황 관리</div>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={qr}>
              라인별 맞춤 QR 엑셀 다운로드
            </button>
            <button className="btn" onClick={excel}>
              교육실적 엑셀 다운로드 (서명/일지)
            </button>
          </div>
        </div>

        <div className="grid section">
          <div className="card">
            <div className="muted">게시된 교육 회차</div>
            <div className="metric">{weeks.length}</div>
          </div>
          <div className="card">
            <div className="muted">개인 확인 기록</div>
            <div className="metric green">{acks.length}</div>
          </div>
          <div className="card">
            <div className="muted">조별 사진 제출</div>
            <div className="metric">{photos.length}</div>
          </div>
          <div className="card">
            <div className="muted">최근 회차 확인 인원</div>
            <div className="metric">{count}</div>
          </div>
        </div>

        {/* 새 TBM 교육자료 등록 및 목록 */}
        <div className="section card">
          <h2>{editingId ? "TBM 교육자료 수정" : "새 TBM 교육자료 등록"}</h2>
          <div className="formgrid">
            <div className="field">
              <label>교육 회차</label>
              <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="field">
              <label>자료 제목</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>교육 시작일</label>
              <input
                className="input"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label>교육 종료일</label>
              <input
                className="input"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label>교육 주제</label>
            <input
              className="input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 겨울철 전기화재 예방"
            />
          </div>

          <div className="field">
            <label>교육 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"1. 주요 위험요인\n2. 안전수칙\n3. 작업 전 확인사항"}
            />
          </div>

          <div className="field">
            <label>교육 사진 첨부 (최대 5장 / 1장당 5MB 이하)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoSelect}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              {existingPhotos.map((photo, index) => (
                <div key={photo.path} style={{ position: "relative" }}>
                  <img
                    src={photo.url}
                    alt={`기존 사진 ${index + 1}`}
                    style={{ width: 120, height: 100, objectFit: "cover", borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => {
                      setRemovedPhotoPaths((prev) => [...prev, photo.path]);
                      setExistingPhotos((prev) => prev.filter((p) => p.path !== photo.path));
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}

              {selectedPreviewUrls.map((url, index) => (
                <div key={index} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt={`첨부 사진 ${index + 1}`}
                    style={{ width: 120, height: 100, objectFit: "cover", borderRadius: 8 }}
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => removeSelectedPhoto(index)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="btn" onClick={publish}>
            {editingId ? "수정 내용 저장" : "교육자료 게시"}
          </button>

          {editingId && (
            <button className="btn secondary" style={{ marginLeft: 8 }} onClick={cancelEdit}>
              수정 취소
            </button>
          )}

          <div className="section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2>최근 교육자료</h2>
              <button
                className="btn secondary"
                onClick={() => setSelectedWeekId("all")}
                style={{
                  background: selectedWeekId === "all" ? "#dbeafe" : undefined,
                  fontWeight: selectedWeekId === "all" ? "bold" : "normal",
                }}
              >
                전체 보기
              </button>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>교육 회차</th>
                    <th>주제</th>
                    <th>게시 상태</th>
                    <th>교육 기간</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <button
                          className="btn secondary"
                          style={{
                            background: selectedWeekId === w.id ? "#dbeafe" : undefined,
                            fontWeight: selectedWeekId === w.id ? "bold" : "normal",
                          }}
                          onClick={() => setSelectedWeekId(w.id)}
                        >
                          {w.week_label}
                        </button>
                      </td>
                      <td>{w.topic}</td>
                      <td>
                        <span className={`pill ${w.is_published ? "ok" : "wait"}`}>
                          {w.is_published ? "게시 중" : "미게시"}
                        </span>
                      </td>
                      <td>
                        {w.starts_at} ~ {w.ends_at}
                      </td>
                      <td>
                        <button className="btn secondary" onClick={() => startEdit(w)}>
                          수정
                        </button>
                        <button
                          className="btn secondary"
                          style={{ marginLeft: 6 }}
                          onClick={() => removeWeek(w.id)}
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!weeks.length && (
                    <tr>
                      <td colSpan={5} className="empty">
                        등록된 자료가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {msg && <p className="muted">{msg}</p>}
        </div>

{/* 1. 정기 안전교육 조별 통합 현황 */}
        <div className="section card">
          <h2>📘 정기 안전교육 조별 통합 현황 (조장 사진·일지 + 근로자 서명)</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>교육 회차</th>
                  <th>소속 회사</th>
                  <th>소속 조</th>
                  <th>조장 사진·일지</th>
                  <th>근로자 서명 인원</th>
                  <th>상세 / 일지출력</th>
                </tr>
              </thead>
              <tbody>
                {mergedRegular.map((m: any) => (
                  <tr key={m.key}>
                    <td>{m.weekLabel}</td>
                    <td>
                      <b>{m.companyName}</b>
                    </td>
                    <td>{m.teamName}</td>
                    <td>
                      {m.leaderSubmission ? (
                        <span className="pill ok">
                          제출완료 ({m.leaderSubmission.leader_name})
                        </span>
                      ) : (
                        <span className="pill wait">조장 미제출</span>
                      )}
                    </td>
                    <td>
                      <span className="pill" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
                        {m.workers.length}명 서명완료
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn secondary"
                          onClick={() => openAdminTbmDetail("regular", m)}
                        >
                          상세 / 일지출력
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{
                            color: "#ef4444",
                            background: "#fee2e2",
                            borderColor: "#fca5a5",
                          }}
                          disabled={deletingKey === m.key}
                          onClick={() => deleteRegularTeamRecord(m)}
                        >
                          {deletingKey === m.key ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!mergedRegular.length && (
                  <tr>
                    <td colSpan={6} className="empty">
                      정기 안전교육 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. 수시 작업 TBM 현황 */}
        <div className="section card">
          <h2>🛠️ 수시 작업 TBM 실시 현황 (R/C · 정비 · 돌발작업)</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>작업일자</th>
                  <th>작업구분</th>
                  <th>소속 / 조</th>
                  <th>작업명</th>
                  <th>책임자</th>
                  <th>서명인원</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {spotLogs.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.work_date}</td>
                    <td>
                      <span className="pill" style={{ background: "#ccfbf1", color: "#0f766e" }}>
                        {s.work_category}
                      </span>
                    </td>
                    <td>
                      <b>{s.companies?.name || "-"}</b> / {s.teams?.name || "-"}
                    </td>
                    <td>{s.work_title}</td>
                    <td>{s.leader_name}</td>
                    <td>
                      <span className="pill ok">
                        {(s.tbm_spot_signatures || []).length}명 서명
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn secondary"
                          onClick={() => openAdminTbmDetail("spot", s)}
                        >
                          상세/출력
                        </button>
                        <button
                          className="btn secondary"
                          style={{
                            color: "#ef4444",
                            background: "#fee2e2",
                            borderColor: "#fca5a5",
                          }}
                          onClick={() => deleteSpotLog(s.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!spotLogs.length && (
                  <tr>
                    <td colSpan={7} className="empty">
                      등록된 수시 작업 TBM이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. 공정별 안전수칙 풀 관리 (최하단 배치) */}
        <div className="section card">
          <div style={{ marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>⚙️ 공정별 중점 안전수칙 관리</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              근로자가 TBM 서명 시 자기 공정 목록에서 직접 2개 이상 선택합니다. (개수 제한 없이 추가 가능)
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {PROCESS_LIST.map((proc) => {
              const cnt = processRules.filter((r) => r.process_name === proc).length;
              const activeTab = selectedProcess === proc;
              return (
                <button
                  key={proc}
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    setSelectedProcess(proc);
                    setEditingRuleId(null);
                  }}
                  style={{
                    background: activeTab ? "#1e3a8a" : "#fff",
                    color: activeTab ? "#fff" : "#1e293b",
                    borderColor: activeTab ? "#1e3a8a" : "#cbd5e1",
                    fontWeight: "bold",
                  }}
                >
                  {proc} ({cnt})
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "flex-start" }}>
            <textarea
              value={newRuleText}
              onChange={(e) => setNewRuleText(e.target.value)}
              placeholder={`[${selectedProcess}] 공정에 추가할 안전수칙을 입력하세요.\n(엔터로 줄바꿈하면 여러 개를 한 번에 등록할 수 있습니다)`}
              style={{ flex: 1, height: 64 }}
            />
            <button
              type="button"
              className="btn"
              style={{ height: 64, whiteSpace: "nowrap" }}
              onClick={addProcessRule}
            >
              + 수칙 추가
            </button>
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
            }}
          >
            {processRules
              .filter((r) => r.process_name === selectedProcess)
              .map((rule, idx) => (
                <div
                  key={rule.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderBottom: "1px solid #f1f5f9",
                    background: idx % 2 === 0 ? "#fff" : "#f8fafc",
                  }}
                >
                  {editingRuleId === rule.id ? (
                    <>
                      <input
                        className="input"
                        value={editingRuleText}
                        onChange={(e) => setEditingRuleText(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => saveEditRule(rule.id)}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className="btn secondary"
                        style={{ padding: "5px 10px", fontSize: 12 }}
                        onClick={() => setEditingRuleId(null)}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 13.5, flex: 1 }}>
                        <b>{idx + 1}.</b> {rule.rule_text}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{ padding: "4px 9px", fontSize: 12 }}
                          onClick={() => {
                            setEditingRuleId(rule.id);
                            setEditingRuleText(rule.rule_text);
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{
                            padding: "4px 9px",
                            fontSize: 12,
                            color: "#dc2626",
                            borderColor: "#fca5a5",
                          }}
                          onClick={() => deleteProcessRule(rule.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            {processRules.filter((r) => r.process_name === selectedProcess).length === 0 && (
              <div className="empty" style={{ padding: 20 }}>
                등록된 안전수칙이 없습니다.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 관리자용 통합 TBM 일지 상세 및 A4 출력 모달 */}
      {detailModal && (
        <div
          className="admin-print-wrapper"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 999,
            overflowY: "auto",
            padding: 20,
          }}
        >
          <div
            className="card admin-print-card"
            style={{ maxWidth: 800, margin: "0 auto", background: "#fff" }}
          >
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: "1px solid #ddd",
              }}
            >
              <button className="btn" onClick={() => window.print()}>
                A4 인쇄 / PDF 저장
              </button>
              <button className="btn secondary" onClick={() => setDetailModal(null)}>
                닫기
              </button>
            </div>

            {detailModal.type === "spot" ? (
              <table className="admin-sheet-table">
                <tbody>
                  <tr>
                    <th
                      colSpan={4}
                      className="admin-sheet-title"
                      style={{
                        padding: 10,
                        fontSize: 18,
                        background: "#f3f4f6",
                      }}
                    >
                      수 시 작 업 T B M 일 지 ({detailModal.data.work_category})
                    </th>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">작업일자</th>
                    <td>{detailModal.data.work_date}</td>
                    <th className="admin-sheet-label">소속 / 조</th>
                    <td>
                      {detailModal.data.companies?.name} / {detailModal.data.teams?.name}
                    </td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">작업명</th>
                    <td>{detailModal.data.work_title}</td>
                    <th className="admin-sheet-label">작업책임자</th>
                    <td>{detailModal.data.leader_name}</td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">건강·보호구</th>
                    <td colSpan={3}>{detailModal.data.health_status || "-"}</td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">유해·위험요인</th>
                    <td
                      colSpan={3}
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {detailModal.data.hazard_factors || "-"}
                    </td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">안전대책</th>
                    <td
                      colSpan={3}
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {detailModal.data.safety_measures || "-"}
                    </td>
                  </tr>
                  {detailModal.photoUrl && (
                    <tr>
                      <th className="admin-sheet-label">현장 실시 사진</th>
                      <td colSpan={3} style={{ padding: 8, textAlign: "center" }}>
                        <img
                          src={detailModal.photoUrl}
                          alt="현장 사진"
                          style={{ maxHeight: 220, border: "1px solid #ccc" }}
                        />
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th className="admin-sheet-label">
                      참여자 서명
                      <br />({(detailModal.data.tbm_spot_signatures || []).length}명)
                    </th>
                    <td colSpan={3} style={{ padding: 8 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {(detailModal.data.tbm_spot_signatures || []).map((sig: any) => (
                          <div key={sig.id} className="admin-print-sig-card">
                            <img
                              src={sig.signature_data}
                              alt="서명"
                              style={{ width: "100%", height: 40, objectFit: "contain" }}
                            />
                            <div style={{ fontSize: 11.5, fontWeight: "bold" }}>
                              {sig.worker_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="admin-sheet-table">
                <tbody>
                  <tr>
                    <th
                      colSpan={4}
                      className="admin-sheet-title"
                      style={{
                        padding: 10,
                        fontSize: 18,
                        background: "#f3f4f6",
                      }}
                    >
                      정 기 안 전 교 육 및 T B M 일 지
                    </th>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">교육 회차</th>
                    <td>{detailModal.data.weekLabel}</td>
                    <th className="admin-sheet-label">소속 / 조</th>
                    <td>
                      {detailModal.data.companyName} / {detailModal.data.teamName}
                    </td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">교육 주제</th>
                    <td colSpan={3}>{detailModal.data.topic}</td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">교육 내용</th>
                    <td
                      colSpan={3}
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.55,
                      }}
                    >
                      {detailModal.data.content || "-"}
                    </td>
                  </tr>
                  {detailModal.eduPhotoUrls && detailModal.eduPhotoUrls.length > 0 && (
                    <tr>
                      <th className="admin-sheet-label">교육자료 사진</th>
                      <td colSpan={3} style={{ padding: 8 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                          {detailModal.eduPhotoUrls.map((eduUrl, idx) => (
                            <img
                              key={idx}
                              src={eduUrl}
                              alt={`교육자료 사진 ${idx + 1}`}
                              style={{ maxHeight: 180, maxWidth: "48%", objectFit: "contain", border: "1px solid #ccc" }}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th className="admin-sheet-label">조장 확인</th>
                    <td>
                      {detailModal.data.leaderSubmission
                        ? `${detailModal.data.leaderSubmission.leader_name} (제출완료)`
                        : "미제출"}
                    </td>
                    <th className="admin-sheet-label">건강·보호구</th>
                    <td>{detailModal.data.leaderSubmission?.health_status || "-"}</td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">금주 핵심 위험</th>
                    <td colSpan={3}>{detailModal.data.leaderSubmission?.daily_hazard || "-"}</td>
                  </tr>
                  <tr>
                    <th className="admin-sheet-label">
                      개인별 선택
                      <br />
                      안전수칙
                    </th>
                    <td colSpan={3} style={{ lineHeight: 1.6 }}>
                      {detailModal.data.workers.length > 0 ? (
                        detailModal.data.workers.map((w: any) => (
                          <div key={w.id} style={{ marginBottom: 4 }}>
                            <b>{w.worker_name}</b> -{" "}
                            {Array.isArray(w.selected_rules) && w.selected_rules.length > 0
                              ? w.selected_rules.join(" / ")
                              : "선택 항목 없음"}
                          </div>
                        ))
                      ) : (
                        <span className="muted">등록된 개인별 확인 내역이 없습니다.</span>
                      )}
                    </td>
                  </tr>
                  {detailModal.photoUrl && (
                    <tr>
                      <th className="admin-sheet-label">TBM 실시 사진</th>
                      <td colSpan={3} style={{ padding: 8, textAlign: "center" }}>
                        <img
                          src={detailModal.photoUrl}
                          alt="조별 사진"
                          style={{ maxHeight: 220, border: "1px solid #ccc" }}
                        />
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th className="admin-sheet-label">
                      근로자 서명
                      <br />({detailModal.data.workers.length}명)
                    </th>
                    <td colSpan={3} style={{ padding: 8 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {detailModal.data.workers.map((w: any) => (
                          <div key={w.id} className="admin-print-sig-card">
                            {w.signature_data ? (
                              <img
                                src={w.signature_data}
                                alt="서명"
                                style={{ width: "100%", height: 40, objectFit: "contain" }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: 40,
                                  lineHeight: "40px",
                                  fontSize: 11,
                                  color: "#666",
                                }}
                              >
                                서명완료
                              </div>
                            )}
                            <div style={{ fontSize: 11.5, fontWeight: "bold" }}>
                              {w.worker_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </>
  );
}