import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "行政書士クエスト",
  description: "行政書士試験の学習をゲーム化するMVPアプリ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
