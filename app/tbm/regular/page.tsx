"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, configured } from "@/lib/supabase";

type WeekItem = {
  id: string;
  title: string;
  topic: string;
  content: string;
  week_label: string;
  starts_at: string;
  ends_at: string;
  photo_paths?: string[];
};

const PAGE_SIZE = 5;

export default function RegularTBMPage() {
  const [weeks, setWeeks] = useState<WeekItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMaterial, setSelectedMaterial] = useState<WeekItem | null>(null);
  const [materialPhotos, setMaterialPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function openMaterial(item: WeekItem) {
    if (selectedMaterial?.id === item.id) {
      setSelectedMaterial(null);
      setMaterialPhotos([]);
      return;
    }

    setSelectedMaterial(item);
    setMaterialPhotos([]);
    const paths = item.photo_paths || [];
    if (!configured || paths.length === 0) return;

    const urls: string[] = [];
    for (const p of paths) {
      const { data, error } = await supabase.storage
        .from("tbm-education-photos")
        .createSignedUrl(p, 3600);
      if (!error && data?.signedUrl) urls.push(data.signedUrl);
    }
    setMaterialPhotos(urls);
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tbm_weeks")
        .select("id,title,topic,content,week_label,starts_at,ends_at,photo_paths")
        .eq("is_published", true)
        .order("starts_at", { ascending: false });

      setWeeks((data as WeekItem[]) || []);
      setCurrentPage(1);
      setLoading(false);
    })();
  }, []);

  const totalPages = Math.max(1, Math.ceil(weeks.length / PAGE_SIZE));
  const pagedWeeks = weeks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <style>{`
        .edu-board-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
.edu-board-table th {
          text-align: left;
          padding: 9px 6px;
          border-bottom: 1.5px solid #cbd5e1;
          color: #334155;
          font-weight: 700;
          background: #f8fafc;
          white-space: nowrap;
          font-size: 13px;
        }
        .edu-board-table td {
          padding: 10px 6px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
        }
        .edu-board-row:hover {
          background: #f8fafc;
        }
        .edu-action-group {
          display: flex;
          flex-direction: row;
          gap: 6px;
          align-items: center;
        }
        .edu-sq-btn {
          width: 58px;
          height: 58px;
          padding: 4px;
          font-size: 12.5px;
          font-weight: 700;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        @media (min-width: 640px) {
          .edu-board-table th,
          .edu-board-table td {
            padding: 12px;
            font-size: 14px;
          }
          .edu-action-group {
            gap: 8px;
          }
          .edu-sq-btn {
            width: 64px;
            height: 64px;
            font-size: 13px;
          }
        }
      `}</style>

      <header className="topbar no-print">
        <div className="brand">
          DOSCO TBM SYSTEM
          <small>정기 TBM 누적 교육자료 현황판</small>
        </div>
        <nav className="nav">
          <Link href="/tbm-main">TBM 메뉴</Link>
          <Link href="/leader">조장용</Link>
          <Link href="/tbm">근로자용</Link>
          <Link href="/tbm/status">실시 현황</Link>
        </nav>
      </header>

      <main className="shell">
        <div className="pagehead">
          <div>
            <h1>정기 TBM</h1>
            <div className="muted">
              최신 교육자료가 상단에 표시되며, 한 페이지에 최대 5건씩 조회되고 각 행의 조장용·근로자용 버튼으로 바로 실시등록할 수 있습니다.
            </div>
          </div>
          <div className="row">
            <Link href="/tbm-main" className="btn secondary">
              ← TBM 메뉴
            </Link>
          </div>
        </div>

        <div className="card section">
          <div className="row between" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>누적 교육자료 현황판</h2>
            <span className="pill ok">총 {weeks.length}건</span>
          </div>

          {loading ? (
            <p className="muted">교육자료를 불러오는 중...</p>
          ) : weeks.length === 0 ? (
            <p className="muted">등록된 교육자료가 없습니다.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
<table className="edu-board-table">
                <thead>
                  <tr>
                    <th>실시등록</th>
                    <th>교육일자</th>
                    <th>교육명</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedWeeks.map((w, idx) => {
                    const isLatestOverall = currentPage === 1 && idx === 0;
                    const displayTitle = w.title || w.topic;
                    return (
                      <tr key={w.id} className="edu-board-row">
                        <td>
                          <div className="edu-action-group">
                            <Link
                              href={`/leader?w=${encodeURIComponent(w.id)}`}
                              className="btn secondary edu-sq-btn"
                            >
                              조장용
                            </Link>
                            <Link
                              href={`/tbm?w=${encodeURIComponent(w.id)}`}
                              className="btn edu-sq-btn"
                            >
                              근로자용
                            </Link>
                          </div>
                        </td>
                        <td
                          style={{
                            fontWeight: isLatestOverall ? 700 : 500,
                            fontSize: 12.5,
                            lineHeight: 1.35,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isLatestOverall ? (
                            <>
                              <span style={{ display: "block", color: "#1d4ed8", fontSize: 11.5 }}>
                                [최신]
                              </span>
                              <span>{w.week_label}</span>
                            </>
                          ) : (
                            w.week_label
                          )}
                        </td>
                        <td style={{ minWidth: 0 }}>
                          <button
                            type="button"
                            onClick={() => openMaterial(w)}
                            style={{
                              background: "transparent",
                              border: "none",
                              padding: 0,
                              textAlign: "left",
                              cursor: "pointer",
                              color: "#0f172a",
                              fontWeight: 600,
                              fontSize: 13.5,
                              lineHeight: 1.4,
                              wordBreak: "keep-all",
                            }}
                          >
                            {displayTitle}
                            {w.topic && w.title && w.title !== w.topic ? (
                              <span
                                className="muted"
                                style={{
                                  display: "block",
                                  fontWeight: 400,
                                  marginTop: 2,
                                  fontSize: 12,
                                }}
                              >
                                ({w.topic})
                              </span>
                            ) : null}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "6px 12px", fontSize: 12.5 }}
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    이전
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={
                          pageNum === currentPage ? "btn" : "btn secondary"
                        }
                        style={{
                          padding: "6px 11px",
                          fontSize: 12.5,
                          minWidth: 36,
                        }}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "6px 12px", fontSize: 12.5 }}
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          )}

          {selectedMaterial && (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
              }}
            >
              <div className="row between" style={{ marginBottom: 8 }}>
                <b style={{ fontSize: 15.5, color: "#0f172a" }}>
                  {selectedMaterial.week_label} —{" "}
                  {selectedMaterial.title || selectedMaterial.topic}
                </b>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => {
                    setSelectedMaterial(null);
                    setMaterialPhotos([]);
                  }}
                >
                  닫기
                </button>
              </div>
              {selectedMaterial.topic && (
                <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                  주제: {selectedMaterial.topic}
                </div>
              )}
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                {selectedMaterial.content}
              </div>
              {materialPhotos.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  {materialPhotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer">
                      <img
                        src={url}
                        alt={`교육자료 사진 ${i + 1}`}
                        style={{
                          width: "100%",
                          height: 150,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}