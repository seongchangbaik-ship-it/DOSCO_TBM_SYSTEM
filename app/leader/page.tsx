{/* 사진 첨부 밑: 개별진행 체크 -> 근로자 이름 -> 서명 순서 */}
        <div
          style={{
            marginTop: 14,
            marginBottom: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            참석 근로자 이름 · 서명 / 개별진행
          </div>

          <label className="checkrow" style={{ marginTop: 4, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={individualScheduled}
              onChange={(e) => {
                setIndividualScheduled(e.target.checked);
                if (e.target.checked) clearCanvas();
              }}
            />
            <span>
              <b>개별진행</b> (체크 시 서명 없이 저장되며, 근로자가 직접 들어가 교육 확인 후 서명)
            </span>
          </label>

          <div className="field" style={{ marginTop: 0 }}>
            <label>근로자 이름</label>
            <input
              className="input"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              placeholder="근로자 이름 입력"
            />
          </div>

          {!individualScheduled && (
            <div className="field" style={{ marginTop: 10, marginBottom: 10 }}>
              <label>근로자 서명</label>
              <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, background: "#fff" }}>
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={120}
                  style={{ width: "100%", height: 120, touchAction: "none", display: "block" }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#64748b" }}>서명란에 서명해 주세요</span>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={clearCanvas}
                  >
                    지우기
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn secondary"
            style={{ width: "100%" }}
            onClick={addWorkerEntry}
          >
            + 근로자 명단에 추가
          </button>

          {workerEntries.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {workerEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <b>
                      {idx + 1}. {entry.worker_name}
                    </b>{" "}
                    <span
                      className={`pill ${entry.individual_scheduled ? "wait" : "ok"}`}
                      style={{ fontSize: 11.5, marginLeft: 4 }}
                    >
                      {entry.individual_scheduled ? "개별진행 예정" : "서명 완료"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ padding: "3px 8px", fontSize: 11.5 }}
                    onClick={() => removeWorkerEntry(entry.id)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>