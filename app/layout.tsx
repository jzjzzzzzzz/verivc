import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriVC",
  description: "Evidence-driven AI startup due-diligence copilot for fast human-reviewed investment analysis.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
