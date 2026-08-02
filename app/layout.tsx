import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

import AuthProvider from "@/components/providers/AuthProvider";

import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PublicChrome from "@/components/layout/PublicChrome";

const fontVariables = {
  "--font-inter": "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  "--font-poppins": "Poppins, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
} as CSSProperties;

export const metadata: Metadata = {
  title: "Bluegate Publishers",
  description: "Complete Educational Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white" style={fontVariables}>
        <AuthProvider>
          <PublicChrome>
            <TopBar />
            <Header />
          </PublicChrome>

          <main>{children}</main>

          <PublicChrome>
            <Footer />
          </PublicChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
