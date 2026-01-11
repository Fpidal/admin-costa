import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
