import type { Metadata, Viewport } from "next";
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

// Dirección pública del sitio, para que el link compartido muestre la imagen de marca
const sitio = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

// Marca Costa Directo: ícono de la pestaña, del botón en el celular y del link compartido
export const metadata: Metadata = {
  metadataBase: new URL(sitio),
  title: "Costa Directo - Alquileres en Costa Esmeralda",
  description: "Propiedades administradas directamente por sus propietarios. Sin intermediarios.",
  applicationName: "Costa Directo",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Costa Directo", statusBarStyle: "default" },
  openGraph: {
    title: "Costa Directo - Alquileres en Costa Esmeralda",
    description: "Propiedades administradas directamente por sus propietarios. Sin intermediarios.",
    type: "website",
    siteName: "Costa Directo",
    images: [{ url: "/og-image-1200x630.png", width: 1200, height: 630, alt: "Costa Directo" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0E3B4A",
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
