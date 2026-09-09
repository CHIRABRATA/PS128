import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { SyncStatusBadge } from "@/components/offline/SyncStatusBadge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "मैत्री (Maitri) — Livestock Health & Veterinary Surveillance Platform",
  description: "Livestock disease early detection, rural field surveillance, and clinical decision support for farmers, veterinarians, and district authorities.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FAF8F3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#FAF8F3] text-[#191F1C] selection:bg-emerald-700 selection:text-white pb-16 lg:pb-0">
        <ClerkProvider>
          <PwaRegister />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <SyncStatusBadge />
          <MobileNav />
        </ClerkProvider>
      </body>
    </html>
  );
}