import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "Apex — NYC Prospecting CRM",
  description: "Prospecting CRM for selling Devin to NYC enterprises.",
  icons: {
    icon: [
      { url: "/apex-mark.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="ambient min-h-screen font-sans text-gray-200 antialiased">
        <Nav />
        <CommandPalette />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
