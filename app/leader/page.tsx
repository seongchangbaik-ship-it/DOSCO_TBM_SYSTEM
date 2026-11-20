"use client";
import {useEffect,useState} from "react";
import {supabase,configured} from "@/lib/supabase";
type Company={id:string;name:string};type Team={id:string;name:string;company_id:string};type Week={id:string;week_label:string;topic:string};
export default function LeaderPage(){
 const [companies,setCompanies]=useState<Company[]>([]),[teams,setTeams]=useState<Team[]>([]),[weeks,setWeeks]=useState<Week[]>([]);
 const [company,setCompany]=useState(""),[team,setTeam]=useState(""),[week,setWeek]=useState(""),[leader,setLeader]=useState(""),[file,setFile]=useState<File|null>(null),[msg,setMsg]=useState("");
 useEffect(()=>{if(!configured)return;(async()=>{const [c,t,w]=await Promise.all([supabase.from("companies").select("id,name").eq("active",true).order("name"),supabase.from("teams").select("id,name,company_id").eq("active",true).order("name"),supabase.from("tbm_weeks").select("id,week_label,topic").eq("is_published",true).order("starts_at",{ascending:false})]);setCompanies(c.data||[]);setTeams(t.data||[]);setWeeks(w.data||[]);if(w.data?.[0])setWeek(w.data[0].id)})();},[]);
 async function upload(){if(!company||!team||!week||!leader.trim()||!file){setMsg("모든 항목과 사진을 입력해 주세요.");return}if(file.size>8*1024*1024){setMsg("사진은 8MB 이하로 올려 주세요.");return}
 const ext=file.name.split(".").pop()||"jpg",path=`${week}/${team}/${Date.now()}.${ext}`;
 const up=await supabase.storage.from("tbm-photos").upload(path,file,{upsert:false,contentType:file.type});
 if(up.error){setMsg("사진 업로드 실패: "+up.error.message);return}
 const {error}=await supabase.from("tbm_team_submissions").insert({week_id:week,company_id:company,team_id:team,leader_name:leader.trim(),photo_path:path,submitted_at:new Date().toISOString()});
 if(error){setMsg("제출 기록 저장 실패: "+error.message);return}setMsg("조별 TBM 사진이 제출되었습니다.");
 }
 return <main className="mobile"><div className="mobilehero"><div style={{fontSize:12,opacity:.8}}>DONG-A STEEL · LEADER</div><h1>조별 TBM 사진 제출</h1><div style={{fontSize:13,opacity:.85}}>조장 또는 지정 담당자용</div></div><div className="card">
 {!configured&&<p className="muted">Supabase 연결 후 사용할 수 있습니다.</p>}
 <div className="field"><label>교육 회차</label><select value={week} onChange={e=>setWeek(e.target.value)}><option value="">회차 선택</option>{weeks.map(w=><option key={w.id} value={w.id}>{w.week_label} · {w.topic}</option>)}</select></div>
 <div className="field"><label>소속 회사</label><select value={company} onChange={e=>{setCompany(e.target.value);setTeam("")}}><option value="">회사 선택</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
 <div className="field"><label>소속 조</label><select value={team} onChange={e=>setTeam(e.target.value)}><option value="">조 선택</option>{teams.filter(t=>t.company_id===company).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
 <div className="field"><label>제출자(조장) 이름</label><input className="input" value={leader} onChange={e=>setLeader(e.target.value)} placeholder="이름 입력"/></div>
 <div className="field"><label>TBM 실시 사진</label><div className="upload"><input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/><p className="muted">{file?file.name:"현장에서 사진을 촬영하거나 선택해 주세요."}</p></div></div>
 <button className="btn" style={{width:"100%"}} onClick={upload}>사진 제출</button>{msg&&<p className="muted">{msg}</p>}
 </div><div className="footer">사진에는 교육 참여 현장이 확인되도록 촬영해 주세요.</div></main>
}
