import type { Metadata, Viewport } from "next";
import { Roboto, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Roboto is Grant Thornton's digital typeface.
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rajasthan Agri-Intelligence Platform",
  description:
    "Predictive advisory, FPO aggregation and buyer marketplace for Rajasthan agriculture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f2d7f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${roboto.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
