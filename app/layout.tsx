import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

import AuthProvider from "@/components/providers/AuthProvider";

import TopBar from "@/components/layout/TopBar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Bluegate Publishers",
  description: "Complete Educational Solutions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} min-h-screen bg-white`}
      >
        <AuthProvider>
          <TopBar />

          <Header />

          <main>{children}</main>

          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}