import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quloi AI Orchestration",
  description: "Internal Product Team tool: transcripts to reviewable BRD drafts and action items.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <a href="/" className="app-title">Quloi AI Orchestration</a>
          <span className="app-subtitle">Internal Product Team tool -- MVP vertical slice</span>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
