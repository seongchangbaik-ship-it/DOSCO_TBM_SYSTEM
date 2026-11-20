import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOSCO TBM SYSTEM",
  description: "동아스틸 TBM 교육 및 실시 이력 관리 시스템"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
