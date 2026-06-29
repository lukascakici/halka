import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NetworkBanner } from "@/components/NetworkBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Halka — On-chain savings circles on Stellar",
  description:
    "Halka turns the trusted savings circle (ROSCA) into a transparent, on-chain protocol on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('halka:theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          <Header />
          <NetworkBanner />
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-12 pt-6 sm:pt-8">
            {children}
          </main>
          <Footer />
        </WalletProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
