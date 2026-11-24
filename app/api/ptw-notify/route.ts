import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.PTW_NOTIFY_EMAIL;

    if (!apiKey || !toEmail) {
      return NextResponse.json({ ok: false, reason: "Email env not configured" });
    }

    const body = await req.json();
    const {
      isEdit,
      companyName,
      projectName,
      workDate,
      workTime,
      workLocation,
      workTypes,
      siteManager,
      contact,
      adminUrl,
    } = body;

    const badge = isEdit ? "수정 재제출" : "신규 접수";
    const subject = `[DOSCO PTW ${badge}] ${companyName} - ${projectName}`;

    const html = `
      <div style="font-family: 'Malgun Gothic', sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; color: #1e293b;">
        <div style="font-size: 12px; color: #2563eb; font-weight: bold; margin-bottom: 4px;">DONG-A STEEL · SAFETY PTW</div>
        <h2 style="margin: 0 0 16px 0; font-size: 20px;">안전작업허가서 ${badge} 알림</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr>
            <th style="text-align: left; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1; width: 130px;">업체명</th>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;"><b>${companyName || "-"}</b></td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1;">공사명(작업명)</th>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${projectName || "-"}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1;">작업일시</th>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${workDate || "-"} (${workTime || "-"})</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1;">작업장소</th>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${workLocation || "-"}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1;">작업종류</th>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${Array.isArray(workTypes) ? workTypes.join(", ") : "-"}</td>
          </tr>
          <tr>
            <th style="text-align: left; padding: 8px 10px; background: #f8fafc; border: 1px solid #cbd5e1;">현장관리감독자</th>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1;">${siteManager || "-"} (${contact || "연락처 미입력"})</td>
          </tr>
        </table>
        ${
          adminUrl
            ? `<a href="${adminUrl}" style="display: inline-block; background: #1e3a8a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">허가서 관리자 페이지에서 검토·승인하기 →</a>`
            : ""
        }
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DOSCO PTW 알림 <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ ok: false, error: errText }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}