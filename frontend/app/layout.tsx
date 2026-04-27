import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flowra",
  description: "Automate, connect, and simplify web-to-API workflows.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 font-sans">{children}</body>
    </html>
  );
}
