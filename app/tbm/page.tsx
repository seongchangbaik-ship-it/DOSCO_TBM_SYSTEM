
"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type Company = { id: string; name: string };
type Team = { id: string; name: string; company_id: string };
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
type ProcessRule = {
  id: string;
  process_name: string;
  rule_text: string;
};

function getProcessByTeamName(teamName: string): string {
  if (["P5", "P9", "P10", "C1", "P1", "P7", "P8"].includes(teamName)) return "조관";
  if (["SL2", "SL5"].includes(teamName)) return "슬리터";
  if (["SCP1", "SCP2"].includes(teamName)) return "도장";
  if (["1출하", "2출하"].includes(teamName)) return "출하";
  if (["1공무", "2공무", "전기파트"].includes(teamName)) return "공무";
  if (["1품질", "2품질", "품질파트"].includes(teamName)) return "품질";
  return "전사공통";
}

function TBMForm() {
  const searchParams = useSearchParams();
  const qrCompanyId = searchParams.get("c") || "";
  const qrTeamId = searchParams.get("t") || "";

  const [companies, setCompanies] = useState<Company[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [processRules, setProcessRules] = useState<ProcessRule[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [team, setTeam] = useState("");
  const [qrApplied, setQrApplied] = useState(false);
  const [name, setName] = useState("");
  const [week, setWeek] = useState<Week | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [ack, setAck] = useState([false, false, false]);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

 useEffect(()=>{
  if(!configured){
    setMsg("Supabase 연결 전입니다. 관리자에게 시스템 설정을 요청하세요.");
    return;
  }

  (async()=>{
    const [c,t,w,r]=await Promise.all([
      supabase.from("companies").select("id,name").eq("active",true).order("name"),
      supabase.from("teams").select("id,name,company_id").eq("active",true).order("name"),
      supabase.from("tbm_weeks").select("*").eq("is_published",true).order("starts_at",{ascending:false}),
      supabase.from("tbm_process_rules").select("id,process_name,rule_text").eq("active",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true})
    ]);
    setProcessRules((r.data as ProcessRule[]) || []);

const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];

const sortedCompanies = (c.data || []).sort(
      (a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name)
    );
    const loadedTeams = t.data || [];
    setCompanies(sortedCompanies);
    setTeams(loadedTeams);

    if (qrCompanyId && sortedCompanies.some(item => item.id === qrCompanyId)) {
      setCompany(qrCompanyId);
      if (qrTeamId && loadedTeams.some(item => item.id === qrTeamId && item.company_id === qrCompanyId)) {
        setTeam(qrTeamId);
        setQrApplied(true);
      }
    } else if (qrTeamId) {
      const matchedTeam = loadedTeams.find(item => item.id === qrTeamId);
      if (matchedTeam) {
        setCompany(matchedTeam.company_id);
        setTeam(matchedTeam.id);
        setQrApplied(true);
      }
    }

if(w.data && w.data.length > 0){
      setWeeks(w.data as Week[]);
      const currentWeek=w.data[0] as Week;
      setWeek(currentWeek);

      const paths=currentWeek.photo_paths||[];
if(w.data && w.data.length > 0){
      setWeeks(w.data as Week[]);
      await selectWeekItem(w.data[0] as Week);
    }
  })();
 },[]);

const filtered=teams.filter(t=>t.company_id===company);

const selectedCompanyName=companies.find(c=>c.id===company)?.name;

const teamOrder:Record<string,string[]> = {
  "동아스틸":["전기파트","품질파트","기타부서"],
  "다인스틸":["P5","P9","P10"],
  "나로스틸":["C1","P1","P7","P8"],
  "세현스틸":["SL2","SL5","SCP1","SCP2","1공무","2공무","1품질","2품질"],
  "에스로지스":["1출하","2출하"]
};

const orderedTeams=[...filtered].sort((a,b)=>{
  const order=teamOrder[selectedCompanyName||""]||[];
  return order.indexOf(a.name)-order.indexOf(b.name);
});

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
    setHasDrawn(true);
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

  const stopDrawing = () => setIsDrawing(false);

const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  async function selectWeekItem(targetWeek: Week) {
    setWeek(targetWeek);
    setPhotoUrls([]);
    setDone(false);
    setMsg("");

    const paths = targetWeek.photo_paths || [];
    const urls: string[] = [];

    for (const path of paths) {
      const { data, error } = await supabase.storage
        .from("tbm-education-photos")
        .createSignedUrl(path, 3600);

      if (!error && data?.signedUrl) {
        urls.push(data.signedUrl);
      }
    }

    setPhotoUrls(urls);
  }

const selectedTeamObj = teams.find(t => t.id === team);
  const currentProcess = selectedTeamObj ? getProcessByTeamName(selectedTeamObj.name) : "";
  const applicableRules = currentProcess
    ? [
        ...processRules.filter(r => r.process_name === currentProcess),
        ...(currentProcess !== "전사공통"
          ? processRules.filter(r => r.process_name === "전사공통")
          : []),
      ]
    : [];

  function toggleRule(ruleText: string, checked: boolean) {
    if (checked) {
      setSelectedRules(prev => [...prev, ruleText]);
    } else {
      setSelectedRules(prev => prev.filter(item => item !== ruleText));
    }
  }

  async function submit() {
    setMsg("");

    if (!company || !team || !name.trim()) {
      setMsg("소속 회사, 조, 본인 이름을 입력해 주세요.");
      return;
    }

    const minRequired = Math.min(2, applicableRules.length);
    if (minRequired > 0 && selectedRules.length < minRequired) {
      setMsg(`[${currentProcess}] 공정 중점 안전수칙을 ${minRequired}개 이상 선택해 주세요.`);
      return;
    }

    if (!ack.every(Boolean)) {
      setMsg("하단 교육 확인 항목 3가지를 모두 체크해 주세요.");
      return;
    }

    if (!hasDrawn || !canvasRef.current) {
      setMsg("본인 서명란에 손가락으로 정자 서명을 해 주세요.");
      return;
    }

    if (!week) {
      setMsg("현재 게시된 TBM 교육자료가 없습니다.");
      return;
    }

    const signatureData = canvasRef.current.toDataURL("image/png");

    const { error } = await supabase.from("tbm_acknowledgements").insert({
      week_id: week.id,
      company_id: company,
      team_id: team,
      worker_name: name.trim(),
      selected_rules: selectedRules,
      signature_data: signatureData,
      acknowledged_at: new Date().toISOString(),
    });

    if (error) {
      console.error("교육 확인 제출 오류:", error);
      setMsg("제출 오류: " + error.message + " (코드: " + error.code + ")");
      return;
    }
    setDone(true);
  }

 return (
  <main className="mobile">
    <div style={{marginBottom:10}}>
  <Link href="/" className="btn secondary">
    ← 홈으로
  </Link>
</div>
    <div className="mobilehero">
      <div style={{fontSize:12,opacity:.8}}>DONG-A STEEL · SAFETY</div>
      <h1>DOSCO TBM</h1>
      <div style={{fontSize:13,opacity:.85}}>작업 전 안전보건교육 확인</div>
    </div>

<div className="card">
      <div className="row between">
        <b>TBM 교육자료</b>
        <span className="pill ok">근로자 페이지</span>
      </div>

      {weeks.length > 0 && (
        <div className="field" style={{ marginTop: 10, marginBottom: 4 }}>
          <label>교육 회차 선택 (최근 회차 기본 · 이전 회차 선택 가능)</label>
          <select
            value={week?.id || ""}
            onChange={(e) => {
              const found = weeks.find((item) => item.id === e.target.value);
              if (found) selectWeekItem(found);
            }}
          >
            {weeks.map((item, idx) => (
              <option key={item.id} value={item.id}>
                {idx === 0 ? `[최신] ${item.week_label}` : item.week_label} · {item.topic}
              </option>
            ))}
          </select>
        </div>
      )}

      {!configured?
        <p className="muted">{msg}</p>
      :week?<>
        <div className="muted" style={{marginTop:12}}>{week.week_label}</div>
        <div className="topic">{week.topic}</div>
        <h3>{week.title}</h3>

        <div style={{whiteSpace:"pre-wrap",lineHeight:1.8,fontSize:14}}>
          {week.content}
        </div>

        {photoUrls.length>0&&(
          <div style={{marginTop:20}}>
            <h3>교육 사진</h3>
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(2,minmax(0,1fr))",
              gap:10
            }}>
              {photoUrls.map((url,index)=>(
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{display:"block"}}
                >
                  <img
                    src={url}
                    alt={`교육 사진 ${index+1}`}
                    style={{
                      width:"100%",
                      height:160,
                      objectFit:"cover",
                      borderRadius:8
                    }}
                  />
                </a>
              ))}
            </div>
            <p className="muted" style={{fontSize:12}}>
              사진을 누르면 크게 볼 수 있습니다.
            </p>
          </div>
        )}
      </>:<p className="muted">현재 게시된 교육자료가 없습니다.</p>}
    </div>

    {!done?<>
<div className="card section">
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>교육 참여자 정보</h3>
          {qrApplied && (
            <span className="pill ok" style={{ fontSize: 11.5 }}>QR 자동선택 완료</span>
          )}
        </div>

<div className="field">
          <label>소속 회사</label>
          <select value={company} onChange={e => { setCompany(e.target.value); setTeam(""); setSelectedRules([]); setQrApplied(false); }}>
            <option value="">회사 선택</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>소속 조</label>
          <select value={team} onChange={e => { setTeam(e.target.value); setSelectedRules([]); setQrApplied(false); }}>
            <option value="">조 선택</option>
            {orderedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {team && applicableRules.length > 0 && (
          <div
            style={{
              background: "#eff6ff",
              border: "1.5px solid #93c5fd",
              borderRadius: 10,
              padding: 12,
              marginTop: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <b style={{ fontSize: 13.5, color: "#1e3a8a" }}>
                [{currentProcess} 공정] 중점 안전수칙 선택
              </b>
              <span
                className={`pill ${selectedRules.length >= Math.min(2, applicableRules.length) ? "ok" : "wait"}`}
                style={{ fontSize: 11.5 }}
              >
                {selectedRules.length}개 선택됨 (최소 {Math.min(2, applicableRules.length)}개)
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#1d4ed8", margin: "0 0 10px 0" }}>
              오늘 본인 작업에 해당하는 핵심 안전수칙을 직접 <b>{Math.min(2, applicableRules.length)}개 이상</b> 선택해 주세요.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {applicableRules.map(rule => {
                const checked = selectedRules.includes(rule.rule_text);
                return (
                  <label
                    key={rule.id}
                    className="checkrow"
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: checked ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                      background: checked ? "#dbeafe" : "#fff",
                      fontSize: 13,
                      lineHeight: 1.45,
                      alignItems: "flex-start",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => toggleRule(rule.rule_text, e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span>{rule.rule_text}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="field">
          <label>이름</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="본인 이름 입력" />
        </div>

        <div className="field">
          <label>본인 서명</label>
          <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fafafa" }}>
            <canvas
              ref={canvasRef}
              width={360}
              height={140}
              style={{ width: "100%", height: 140, touchAction: "none", display: "block" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderTop: "1px solid #e5e7eb" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>위 칸에 손가락으로 정자 서명해 주세요</span>
              <button type="button" className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={clearCanvas}>
                지우기
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card section">
        <h3 style={{marginTop:0}}>교육 확인</h3>

        {[
          "게시된 TBM 교육자료를 확인했습니다.",
          "주요 유해·위험요인과 안전수칙을 숙지했습니다.",
          "이번 TBM 교육에 참여했습니다."
        ].map((s,i)=>(
          <label className="checkrow" key={i}>
            <input
              type="checkbox"
              checked={ack[i]}
              onChange={e=>setAck(a=>a.map((v,j)=>j===i?e.target.checked:v))}
            />
            <span>{s}</span>
          </label>
        ))}

        <button className="btn" style={{width:"100%",marginTop:16}} onClick={submit}>
          교육 확인 제출
        </button>

        {msg&&<p style={{color:"#b33",fontSize:13}}>{msg}</p>}
      </div>
    </>:<div className="card section" style={{textAlign:"center"}}>
      <div className="pill ok">제출 완료</div>
      <h2>교육 확인이 등록되었습니다.</h2>
      <p className="muted">참여해 주셔서 감사합니다.</p>
    </div>}

    <div className="section card">
      <b>조장 전용 사진 제출</b>
      <p className="muted">조별 TBM 실시 사진은 조장 페이지에서 제출해 주세요.</p>
      <Link className="btn secondary" href="/leader">조장 페이지 이동</Link>
    </div>

<div className="footer">동아스틸(주) 안전보건 관리</div>
  </main>
 );
}

export default function TBMPage() {
  return (
    <Suspense fallback={<main className="mobile"><div className="card">TBM 교육자료를 불러오는 중...</div></main>}>
      <TBMForm />
    </Suspense>
  );
}
