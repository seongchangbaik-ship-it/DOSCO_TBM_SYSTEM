
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("Supabase URL 확인:", supabaseUrl);
console.log("Secret key 확인:", serviceKey ? "읽기 성공" : "읽기 실패");
if (!supabaseUrl || !serviceKey) {
  console.error("Supabase URL 또는 Secret key 설정을 확인해 주세요.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const userId = "1bff209b-2a97-4f2c-9599-dd342aa492e4";

const rl = readline.createInterface({ input, output });

try {
  const password = await rl.question("새 관리자 비밀번호를 입력하세요: ");
  const confirm = await rl.question("비밀번호를 다시 입력하세요: ");

  if (password.length < 8) {
    throw new Error("비밀번호는 8자 이상이어야 합니다.");
  }

  if (password !== confirm) {
    throw new Error("두 비밀번호가 일치하지 않습니다.");
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (error) {
    throw error;
  }

  console.log("관리자 비밀번호 변경 성공!");
} catch (error) {
  console.error("비밀번호 변경 실패:", error.message);
} finally {
  rl.close();
}
