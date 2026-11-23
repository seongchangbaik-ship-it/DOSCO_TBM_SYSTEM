"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {supabase,configured} from "@/lib/supabase";
type Company={id:string;name:string};type Team={id:string;name:string;company_id:string};type Week={id:string;week_label:string;topic:string};
export default function LeaderPage(){
 const [companies,setCompanies]=useState<Company[]>([]),[teams,setTeams]=useState<Team[]>([]),[weeks,setWeeks]=useState<Week[]>([]);
 const [company,setCompany]=useState(""),[team,setTeam]=useState(""),[week,setWeek]=useState(""),[leader,setLeader]=useState(""),[file,setFile]=useState<File|null>(null),[msg,setMsg]=useState("");
useEffect(() => {
    if (!configured) return;
    (async () => {
      const [c, t, w] = await Promise.all([
        supabase.from("companies").select("id,name").eq("active", true).order("name"),
        supabase.from("teams").select("id,name,company_id").eq("active", true).order("name"),
        supabase.from("tbm_weeks").select("id,week_label,topic").eq("is_published", true).order("starts_at", { ascending: false })
      ]);

      const companyOrder = ["동아스틸", "다인스틸", "나로스틸", "세현스틸", "에스로지스"];
      setCompanies(
        (c.data || []).sort(
          (a, b) => companyOrder.indexOf(a.name) - companyOrder.indexOf(b.name)
        )
      );
      setTeams(t.data || []);
      setWeeks(w.data || []);
      if (w.data?.[0]) setWeek(w.data[0].id);
    })();
  }, []);

  const filtered = teams.filter(t => t.company_id === company);
  const selectedCompanyName = companies.find(c => c.id === company)?.name;
  const teamOrder: Record<string, string[]> = {
    "동아스틸": ["전기파트", "품질파트", "기타부서"],
    "다인스틸": ["P5", "P9", "P10"],
    "나로스틸": ["C1", "P1", "P7", "P8"],
    "세현스틸": ["SL2", "SL5", "SCP1", "SCP2", "1공무", "2공무", "1품질", "2품질"],
    "에스로지스": ["1출하", "2출하"]
  };
  const orderedTeams = [...filtered].sort((a, b) => {
    const order = teamOrder[selectedCompanyName || ""] || [];
    return order.indexOf(a.name) - order.indexOf(b.name);
  }); async function compressImage(rawFile: File): Promise<Blob | File> {
    if (!rawFile.type.startsWith("image/")) return rawFile;
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(rawFile);
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
          resolve(rawFile);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < rawFile.size) resolve(blob);
            else resolve(rawFile);
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(rawFile);
      };
      img.src = objectUrl;
    });
  }

  async function upload() {
    if (!company || !team || !week || !leader.trim() || !file) {
      setMsg("모든 항목과 사진을 입력해 주세요.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMsg("사진은 20MB 이하로 올려 주세요.");
      return;
    }
    setMsg("사진 용량을 최적화하여 업로드 중입니다...");
    const compressed = await compressImage(file);
    const isJpeg = compressed !== file;
    const ext = isJpeg ? "jpg" : (file.name.split(".").pop() || "jpg");
    const path = `${week}/${team}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("tbm-photos").upload(path, compressed, {
      upsert: false,
      contentType: isJpeg ? "image/jpeg" : file.type,
    });
    if (up.error) {
      setMsg("사진 업로드 실패: " + up.error.message);
      return;
    }
    const { error } = await supabase.from("tbm_team_submissions").insert({
      week_id: week,
      company_id: company,
      team_id: team,
      leader_name: leader.trim(),
      photo_path: path,
      submitted_at: new Date().toISOString(),
    });
    if (error) {
      setMsg("제출 기록 저장 실패: " + error.message);
      return;
    }
    setMsg("조별 TBM 사진이 제출되었습니다.");
  }
 return <main className="mobile">
 <div style={{marginBottom:10}}>
  <Link href="/" className="btn secondary">
   ← 홈으로
  </Link>
 </div>
 <div className="mobilehero"><div style={{fontSize:12,opacity:.8}}>DONG-A STEEL · LEADER</div><h1>조별 TBM 사진 제출</h1><div style={{fontSize:13,opacity:.85}}>조장 또는 지정 담당자용</div></div><div className="card">
 {!configured&&<p className="muted">Supabase 연결 후 사용할 수 있습니다.</p>}
 <div className="field"><label>교육 회차</label><select value={week} onChange={e=>setWeek(e.target.value)}><option value="">회차 선택</option>{weeks.map(w=><option key={w.id} value={w.id}>{w.week_label} · {w.topic}</option>)}</select></div>
 <div className="field"><label>소속 회사</label><select value={company} onChange={e=>{setCompany(e.target.value);setTeam("")}}><option value="">회사 선택</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
<div className="field"><label>소속 조</label><select value={team} onChange={e=>setTeam(e.target.value)}><option value="">조 선택</option>{orderedTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div> <div className="field"><label>제출자(조장) 이름</label><input className="input" value={leader} onChange={e=>setLeader(e.target.value)} placeholder="이름 입력"/></div>
 <div className="field"><label>TBM 실시 사진</label><div className="upload"><input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0]||null)}/><p className="muted">{file?file.name:"현장에서 사진을 촬영하거나 선택해 주세요."}</p></div></div>
 <button className="btn" style={{width:"100%"}} onClick={upload}>사진 제출</button>{msg&&<p className="muted">{msg}</p>}
 </div><div className="footer">사진에는 교육 참여 현장이 확인되도록 촬영해 주세요.</div></main>
}
