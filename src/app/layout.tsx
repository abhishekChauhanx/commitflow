import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommitFlow — Automate Your GitHub Contributions",
  description: "Schedule, customize, and track your daily GitHub commits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}