
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("재설정 링크를 확인하고 있습니다.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function prepare() {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      const error = params.get("error") || params.get("error_description");
      const code = params.get("code");

      if (error) {
        setMessage(
          "재설정 링크가 만료되었거나 유효하지 않습니다. 새 메일을 요청해 주세요."
        );
        return;
      }

      // 1. Supabase PKCE 인증 방식
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage("이메일 인증 실패: " + error.message);
          return;
        }

        window.history.replaceState(null, "", window.location.pathname);
        setReady(true);
        return;
      }

      // 2. URL 해시 토큰 인증 방식
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashError = hashParams.get("error");

      if (hashError) {
        setMessage(
          "재설정 링크가 만료되었거나 유효하지 않습니다. 새 메일을 요청해 주세요."
        );
        return;
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage("인증 실패: " + error.message);
          return;
        }

        window.history.replaceState(null, "", window.location.pathname);
        setReady(true);
        return;
      }

      // 3. 이미 인증 세션이 있는지 확인
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (!sessionError && data.session) {
        setReady(true);
        return;
      }

      setMessage("유효한 비밀번호 재설정 링크로 접속해 주세요.");
    }

    prepare();
  }, []);

  async function updatePassword() {
    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상 입력해 주세요.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage("비밀번호 변경 실패: " + error.message);
    } else {
      setMessage(
        "비밀번호가 변경되었습니다. 관리자 로그인 화면으로 이동합니다."
      );
      setTimeout(() => router.push("/admin"), 1500);
    }

    setSaving(false);
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 24 }}>
      <h1>관리자 비밀번호 재설정</h1>

      {ready ? (
        <>
          <p>새로운 비밀번호를 입력해 주세요. (8자 이상)</p>

          <input
            type="password"
            placeholder="새 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 12, marginBottom: 12 }}
          />

          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", padding: 12, marginBottom: 12 }}
          />

          <button
            onClick={updatePassword}
            disabled={saving}
            style={{ width: "100%", padding: 12 }}
          >
            {saving ? "변경 중..." : "비밀번호 변경"}
          </button>
        </>
      ) : (
        <p>{message}</p>
      )}

      {ready && message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
