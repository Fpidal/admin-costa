import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
  title: "Admin Costa - Gestión de Propiedades",
  description: "Sistema de administración de propiedades y alquileres",
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
        {/* Fondo de playa fijo */}
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://dpghrdgippisgzvlahwi.supabase.co/storage/v1/object/public/Imagenes/foto%20playa%20costa.JPG)' }}
        >
          <div className="absolute inset-0 bg-costa-beige/80" />
        </div>

        <div className="flex min-h-screen max-w-full">
          <Sidebar />
          <main className="flex-1 lg:ml-0 min-w-0">
            <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
