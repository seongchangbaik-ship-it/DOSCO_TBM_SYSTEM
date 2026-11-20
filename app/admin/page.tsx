"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import {supabase,configured} from "@/lib/supabase";
type Week={id:string;title:string;topic:string;content:string;week_label:string;starts_at:string;ends_at:string;is_published:boolean;photo_paths?:string[]};
export default function Admin(){
 const [weeks,setWeeks]=useState<Week[]>([]),[acks,setAcks]=useState<any[]>([]),[photos,setPhotos]=useState<any[]>([]),[msg,setMsg]=useState("");
 const [checking,setChecking]=useState(true),[isAdmin,setIsAdmin]=useState(false),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[loginMsg,setLoginMsg]=useState("");
 const [resetSending,setResetSending]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [selectedFiles,setSelectedFiles]=useState<File[]>([]);
const [existingPhotos,setExistingPhotos]=useState<{path:string;url:string}[]>([]);
const [removedPhotoPaths,setRemovedPhotoPaths]=useState<string[]>([]);
const [selectedPreviewUrls,setSelectedPreviewUrls]=useState<string[]>([]);
 const [title,setTitle]=useState("주간 TBM 안전교육"),[topic,setTopic]=useState(""),[content,setContent]=useState(""),[label,setLabel]=useState("2026년 11월 3주차"),[start,setStart]=useState(new Date().toISOString().slice(0,10)),[end,setEnd]=useState(new Date(Date.now()+6*86400000).toISOString().slice(0,10));
function handlePhotoSelect(e: any) {
  const files = Array.from(e.target.files || []) as File[];

  if (existingPhotos.length + selectedFiles.length + files.length > 5) {
    setMsg("사진은 최대 5장까지 첨부할 수 있습니다.");
    e.target.value = "";
    return;
  }

  const validFiles = files.filter(file => {
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

  setSelectedFiles(prev => [...prev, ...validFiles]);
  setSelectedPreviewUrls(prev => [
    ...prev,
    ...validFiles.map(file => URL.createObjectURL(file))
  ]);
  e.target.value = "";
}

function removeSelectedPhoto(index: number) {
  URL.revokeObjectURL(selectedPreviewUrls[index]);
  setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  setSelectedPreviewUrls(prev => prev.filter((_, i) => i !== index));
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

  console.log("현재 로그인 UID:", session.user.id);

  const { data, error } = await supabase
    .from("tbm_admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  console.log("관리자 조회 결과:", data);
  console.log("관리자 조회 오류:", error);

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
} useEffect(()=>{if(!configured){setChecking(false);return}verifyAdmin();const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{if(!session){setIsAdmin(false);setChecking(false)}else setTimeout(()=>verifyAdmin(),0)});return()=>subscription.unsubscribe()},[]);
 async function login(){
  setLoginMsg("");
  if(!email.trim()||!password){
    setLoginMsg("이메일과 비밀번호를 입력해 주세요.");
    return;
  }
  const {error}=await supabase.auth.signInWithPassword({
    email:email.trim(),
    password
  });
  if(error){
    console.error("Supabase 로그인 오류:", error);
    setLoginMsg(
      "로그인 실패: " + error.message +
      (error.status ? " (상태코드: " + error.status + ")" : "")
    );
    return;
  }
  await verifyAdmin();
}

async function sendResetEmail(){
  setLoginMsg("");
  if(!email.trim()){
    setLoginMsg("먼저 관리자 이메일을 입력해 주세요.");
    return;
  }
  setResetSending(true);
  const redirectTo = `${window.location.origin}/auth/reset-password`;
  const {error}=await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {redirectTo}
  );
  if(error){
    setLoginMsg("메일 발송 실패: "+error.message);
  }else{
    setLoginMsg("비밀번호 재설정 메일을 발송했습니다. 최신 이메일을 확인해 주세요.");
  }
  setResetSending(false);
}
 async function logout(){await supabase.auth.signOut();setIsAdmin(false);setPassword("")}
async function load() {
  if (!configured || !isAdmin) return;

  const [w, a, p] = await Promise.all([
    supabase.from("tbm_weeks").select("*").order("starts_at", { ascending: false }),
    supabase.from("tbm_acknowledgements").select("*,companies(name),teams(name),tbm_weeks(week_label,topic)").order("acknowledged_at", { ascending: false }).limit(1000),
    supabase.from("tbm_team_submissions").select("*,companies(name),teams(name),tbm_weeks(week_label)").order("submitted_at", { ascending: false }).limit(500)
  ]);

  setWeeks(w.data || []);
  setAcks(a.data || []);

  const submissionPhotos = await Promise.all(
    (p.data || []).map(async (item) => {
      if (!item.photo_path) return { ...item, photo_url: "" };

      const { data, error } = await supabase.storage
        .from("tbm-photos")
        .createSignedUrl(item.photo_path, 3600);

      return {
        ...item,
        photo_url: error ? "" : data?.signedUrl || ""
      };
    })
  );

  setPhotos(submissionPhotos);
}
 useEffect(()=>{if(isAdmin)load()},[isAdmin]);

async function publish() {
  if (!title || !topic || !content) {
    setMsg("제목, 주제, 교육내용을 입력해 주세요.");
    return;
  }

  let uploadedPaths: string[] = [];

  // 새로 선택한 사진을 Supabase Storage에 업로드
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

  // 수정 중이면 기존 사진 경로 유지
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
    ({ error } = await supabase
      .from("tbm_weeks")
      .update(values)
      .eq("id", editingId));
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
    editingId
      ? "교육자료가 수정되었습니다."
      : "TBM 교육자료가 게시되었습니다."
  );

  selectedPreviewUrls.forEach(url => URL.revokeObjectURL(url));
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

  selectedPreviewUrls.forEach(url => URL.revokeObjectURL(url));
  setSelectedFiles([]);
  setSelectedPreviewUrls([]);

  const paths = w.photo_paths || [];
  const loadedPhotos: {path: string; url: string}[] = [];

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

  const { error } = await supabase
    .from("tbm_weeks")
    .delete()
    .eq("id", id);

  if (error) {
    setMsg("삭제 실패: " + error.message);
    return;
  }

  if (editingId === id) cancelEdit();

  setMsg("교육자료가 삭제되었습니다.");
  load();
}
 async function qr(){const url=`${window.location.origin}/tbm`;const data=await QRCode.toDataURL(url,{width:500,margin:2});const a=document.createElement("a");a.href=data;a.download="DOSCO_TBM_QR.png";a.click()}
 function excel(){const rows=acks.map(a=>({"교육 회차":a.tbm_weeks?.week_label,"회사":a.companies?.name,"조":a.teams?.name,"이름":a.worker_name,"확인 일시":new Date(a.acknowledged_at).toLocaleString("ko-KR")}));const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),"개인별 확인");const pr=photos.map(p=>({"교육 회차":p.tbm_weeks?.week_label,"회사":p.companies?.name,"조":p.teams?.name,"제출자":p.leader_name,"제출 일시":new Date(p.submitted_at).toLocaleString("ko-KR"),"사진 경로":p.photo_path}));XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(pr),"조별 사진");XLSX.writeFile(wb,"DOSCO_TBM_교육실적.xlsx")}
 const latest=weeks.find(w=>w.is_published);const count=acks.filter(a=>a.tbm_weeks?.week_label===latest?.week_label).length;
 if(!configured)return <main className="shell"><div className="card"><h1>Supabase 연결 필요</h1><p className="muted">프로젝트 루트의 .env.local 설정을 확인하고 개발 서버를 다시 시작해 주세요.</p></div></main>;
 if(checking)return <main className="shell"><div className="card">관리자 권한 확인 중...</div></main>;
if(!isAdmin)return (
  <main className="shell" style={{maxWidth:480,paddingTop:70}}>
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
          onChange={e=>setEmail(e.target.value)}
          placeholder="관리자 이메일"
        />
      </div>

      <div className="field">
        <label>비밀번호</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder="비밀번호"
          onKeyDown={e=>{if(e.key==="Enter")login()}}
        />
      </div>

      <button className="btn" style={{width:"100%"}} onClick={login}>
        로그인
      </button>

<button
  className="btn secondary"
  style={{width:"100%",marginTop:10}}
  onClick={sendResetEmail}
  disabled={resetSending}
>
  {resetSending ? "메일 발송 중..." : "비밀번호 찾기"}
</button>

      {loginMsg&&<p style={{color:"#b33",fontSize:13}}>{loginMsg}</p>}
    </div>
  </main>
);

 return <><header className="topbar"><div className="brand">DOSCO TBM SYSTEM<small>관리자 대시보드</small></div><nav className="nav"><Link href="/">홈</Link><Link href="/tbm">근로자 화면</Link><Link href="/leader">조장 화면</Link><button className="btn secondary" onClick={logout}>로그아웃</button></nav></header><main className="shell"><div className="pagehead"><div><h1>관리자 대시보드</h1><div className="muted">교육자료 게시 및 교육 실시 현황 관리</div></div><div className="row"><button className="btn secondary" onClick={qr}>고정 QR 다운로드</button><button className="btn" onClick={excel}>엑셀 다운로드</button></div></div>
 {!configured&&<div className="notice">Supabase 환경변수가 아직 설정되지 않았습니다. 아래 README의 클라우드 연결 절차를 완료하면 실제 저장 기능이 작동합니다.</div>}
 <div className="grid section"><div className="card"><div className="muted">게시된 교육 회차</div><div className="metric">{weeks.length}</div></div><div className="card"><div className="muted">개인 확인 기록</div><div className="metric green">{acks.length}</div></div><div className="card"><div className="muted">조별 사진 제출</div><div className="metric">{photos.length}</div></div><div className="card"><div className="muted">최근 회차 확인 인원</div><div className="metric">{count}</div></div></div>
 <div className="section card"><h2>새 TBM 교육자료 등록</h2><div className="formgrid"><div className="field"><label>교육 회차</label><input className="input" value={label} onChange={e=>setLabel(e.target.value)}/></div><div className="field"><label>자료 제목</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)}/></div><div className="field"><label>교육 시작일</label><input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)}/></div><div className="field"><label>교육 종료일</label><input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div></div><div className="field"><label>교육 주제</label><input className="input" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="예: 겨울철 전기화재 예방"/></div><div className="field"><label>교육 내용</label><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder={"1. 주요 위험요인\n2. 안전수칙\n3. 작업 전 확인사항"}/></div><div className="field">
  <label>교육 사진 첨부 (최대 5장 / 1장당 5MB 이하)</label>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    multiple
    onChange={handlePhotoSelect}
  />

<div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
  {existingPhotos.map((photo,index)=>(
    <div key={photo.path} style={{position:"relative"}}>
      <img
        src={photo.url}
        alt={`기존 사진 ${index+1}`}
        style={{width:120,height:100,objectFit:"cover",borderRadius:8}}
      />
      <button
        type="button"
        className="btn secondary"
        onClick={()=>{
          setRemovedPhotoPaths(prev=>[...prev,photo.path]);
          setExistingPhotos(prev=>prev.filter(p=>p.path!==photo.path));
        }}
      >
        삭제
      </button>
    </div>
  ))}

  {selectedPreviewUrls.map((url,index)=>(
    <div key={index} style={{position:"relative"}}>
      <img
        src={url}
        alt={`첨부 사진 ${index+1}`}
        style={{width:120,height:100,objectFit:"cover",borderRadius:8}}
      />
      <button
        type="button"
        className="btn secondary"
        onClick={()=>removeSelectedPhoto(index)}
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
  <button className="btn secondary" onClick={cancelEdit}>
    수정 취소
  </button>
)}

<div className="section">
  <h2>최근 교육자료</h2>
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
        {weeks.map(w => (
          <tr key={w.id}>
            <td>{w.week_label}</td>
            <td>{w.topic}</td>
            <td>
              <span className={`pill ${w.is_published ? "ok" : "wait"}`}>
                {w.is_published ? "게시 중" : "미게시"}
              </span>
            </td>
            <td>{w.starts_at} ~ {w.ends_at}</td>
            <td>
              <button
                className="btn secondary"
                onClick={() => startEdit(w)}
              >
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
</div>{msg&&<p className="muted">{msg}</p>}</div>
 <div className="section"><h2>개인별 교육 확인 기록</h2><div className="tablewrap"><table><thead><tr><th>교육 회차</th><th>회사</th><th>조</th><th>이름</th><th>확인 일시</th></tr></thead><tbody>{acks.slice(0,30).map(a=><tr key={a.id}><td>{a.tbm_weeks?.week_label}</td><td>{a.companies?.name}</td><td>{a.teams?.name}</td><td>{a.worker_name}</td><td>{new Date(a.acknowledged_at).toLocaleString("ko-KR")}</td></tr>)}{!acks.length&&<tr><td colSpan={5} className="empty">교육 확인 기록이 없습니다.</td></tr>}</tbody></table></div></div>
<div className="section">
  <h2>조별 TBM 사진 제출 기록</h2>
  <div className="tablewrap">
    <table>
      <thead>
        <tr>
          <th>교육 회차</th>
          <th>회사</th>
          <th>조</th>
          <th>제출자</th>
          <th>제출 일시</th>
          <th>제출 사진</th>
        </tr>
      </thead>
      <tbody>
        {photos.map(p => (
          <tr key={p.id}>
            <td>{p.tbm_weeks?.week_label}</td>
            <td>{p.companies?.name}</td>
            <td>{p.teams?.name}</td>
            <td>{p.leader_name}</td>
            <td>{new Date(p.submitted_at).toLocaleString("ko-KR")}</td>
            <td>
              {p.photo_url ? (
                <a href={p.photo_url} target="_blank" rel="noreferrer">
                  <img
                    src={p.photo_url}
                    alt="조별 TBM 제출 사진"
                    style={{
                      width: 100,
                      height: 75,
                      objectFit: "cover",
                      borderRadius: 8,
                      cursor: "pointer"
                    }}
                  />
                </a>
              ) : (
                "사진을 불러올 수 없습니다."
              )}
            </td>
          </tr>
        ))}
        {!photos.length && (
          <tr>
            <td colSpan={6} className="empty">
              사진 제출 기록이 없습니다.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
</main></>
}