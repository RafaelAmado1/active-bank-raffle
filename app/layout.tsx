import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: '#0096DC',
}

export const metadata: Metadata = {
  title: "ActivoBank — Sorteio Lounge",
  description: "Sistema de sorteio para o ActivoBank Lounge no Mundial 2026",
  openGraph: {
    type: 'website',
    title: 'ActivoBank — Sorteio Lounge',
    description: 'Sistema de sorteio para o ActivoBank Lounge no Mundial 2026',
    locale: 'pt_PT',
  },
  twitter: {
    card: 'summary',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="pt" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-full bg-white text-[#0A0A0A]" nonce={nonce}>
        <a href="#main-content" className="skip-link">Saltar para o conteúdo principal</a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
