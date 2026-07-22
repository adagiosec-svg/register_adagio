import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수강신청 시스템",
  description: "아다지오 동호회 수강신청 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
