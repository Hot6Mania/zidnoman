import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zidnoman - 지듣노, 함께 듣다",
  description: "실시간 음악 공유 플랫폼. YouTube, SoundCloud, 니코동 지원",
  icons: {
    icon: '/infinity-icon.svg',
    apple: '/infinity-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
