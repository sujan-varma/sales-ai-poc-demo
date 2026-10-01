import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cortex Home",
  description: "Bondex demo enterprise sales cockpit built with Untitled UI and Covasant Design System.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
