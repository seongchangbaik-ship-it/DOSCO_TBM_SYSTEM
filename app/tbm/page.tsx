
"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { supabase,configured } from "@/lib/supabase";

type Company={id:string;name:string};
type Team={id:string;name:string;company_id:string};
type Week={
  id:string;
  title:string;
  topic:string;
  content:string;
  week_label:string;
  starts_at:string;
  ends_at:string;
  is_published:boolean;
  photo_paths?:string[];
};

export default function TBMPage(){
 const [companies,setCompanies]=useState<Company[]>([]);
 const [teams,setTeams]=useState<Team[]>([]);
 const [company,setCompany]=useState("");
 const [team,setTeam]=useState("");
 const [name,setName]=useState("");
 const [week,setWeek]=useState<Week|null>(null);
 const [photoUrls,setPhotoUrls]=useState<string[]>([]);
 const [ack,setAck]=useState([false,false,false]);
 const [done,setDone]=useState(false);
 const [msg,setMsg]=useState("");

 useEffect(()=>{
  if(!configured){
    setMsg("Supabase 연결 전입니다. 관리자에게 시스템 설정을 요청하세요.");
    return;
  }

  (async()=>{
    const [c,t,w]=await Promise.all([
      supabase.from("companies").select("id,name").eq("active",true).order("name"),
      supabase.from("teams").select("id,name,company_id").eq("active",true).order("name"),
      supabase.from("tbm_weeks").select("*").eq("is_published",true).order("starts_at",{ascending:false}).limit(1).maybeSingle()
    ]);

const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];

setCompanies(
  (c.data || []).sort(
    (a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name)
  )
);
    setTeams(t.data||[]);

    if(w.data){
      const currentWeek=w.data as Week;
      setWeek(currentWeek);

      const paths=currentWeek.photo_paths||[];
      const urls:string[]=[];

      for(const path of paths){
        const {data,error}=await supabase.storage
          .from("tbm-education-photos")
          .createSignedUrl(path,3600);

        if(!error&&data?.signedUrl){
          urls.push(data.signedUrl);
        }
      }

      setPhotoUrls(urls);
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

 async function submit(){
  setMsg("");

  if(!company||!team||!name.trim()||!ack.every(Boolean)){
    setMsg("회사, 조, 이름을 입력하고 모든 교육 확인 항목을 체크해 주세요.");
    return;
  }

  if(!week){
    setMsg("현재 게시된 TBM 교육자료가 없습니다.");
    return;
  }

  const {error}=await supabase.from("tbm_acknowledgements").insert({
    week_id:week.id,
    company_id:company,
    team_id:team,
    worker_name:name.trim(),
    acknowledged_at:new Date().toISOString()
  });

if(error){
  console.error("교육 확인 제출 오류:", error);
  setMsg("제출 오류: " + error.message + " (코드: " + error.code + ")");
  return;
}
  setDone(true);
 }

 return (
  <main className="mobile">
    <div className="mobilehero">
      <div style={{fontSize:12,opacity:.8}}>DONG-A STEEL · SAFETY</div>
      <h1>DOSCO TBM</h1>
      <div style={{fontSize:13,opacity:.85}}>작업 전 안전보건교육 확인</div>
    </div>

    <div className="card">
      <div className="row between">
        <b>이번 주 TBM 교육자료</b>
        <span className="pill ok">근로자 페이지</span>
      </div>

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
        <h3 style={{marginTop:0}}>교육 참여자 정보</h3>

        <div className="field">
          <label>소속 회사</label>
          <select value={company} onChange={e=>{setCompany(e.target.value);setTeam("")}}>
            <option value="">회사 선택</option>
            {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>소속 조</label>
          <select value={team} onChange={e=>setTeam(e.target.value)}>
            <option value="">조 선택</option>
           {orderedTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>이름</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="본인 이름 입력"/>
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
