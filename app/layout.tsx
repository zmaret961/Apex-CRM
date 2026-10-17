import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Apex — NYC Prospecting CRM",
  description: "Prospecting CRM for selling Devin to NYC enterprises.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="ambient min-h-screen font-sans text-gray-200 antialiased">
        <Nav />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
