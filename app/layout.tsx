import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Admin Costa - Alquileres en Costa Esmeralda",
  description: "Propiedades administradas directamente por sus propietarios. Sin intermediarios.",
  openGraph: {
    title: "Admin Costa - Alquileres en Costa Esmeralda",
    description: "Propiedades administradas directamente por sus propietarios. Sin intermediarios.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${manrope.variable} antialiased overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
