import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter for all reading text. Page titles use the classic serif and data
// chips the typewriter mono, both defined in globals.css (--font-display, --font-mono).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Semantic Job Match",
  description: "Campus placement platform with semantic resume–job matching (PostgreSQL + pgvector)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
