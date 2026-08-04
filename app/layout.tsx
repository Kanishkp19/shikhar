import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shikhar — CAT 2026 Prep Companion",
  description:
    "One summit. One system. 121 days. A personal CAT 2026 prep companion — daily plan, AI tutor, topper-style notes, reminders, and weekly news digest.",
  manifest: "/manifest.json",
  applicationName: "Shikhar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Shikhar",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0075de",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-canvas-soft text-ink antialiased">
        {children}
        {/* Service worker registration — push notifications + offline shell */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {
                    // Silent fail — push is a progressive enhancement
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
