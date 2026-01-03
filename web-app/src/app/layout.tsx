import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

import { ControllerStyler } from "@/components/ControllerStyler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Abyss - On-Chain Slot Machine Game",
    template: "%s | Abyss"
  },
  description: "Play the first fully on-chain slot machine game on Starknet. Spin to win, compete for prizes, and collect powerful NFT relics. Provably fair with Cartridge VRF.",
  keywords: [
    "Abyss",
    "slot machine",
    "blockchain game",
    "Starknet",
    "on-chain gaming",
    "NFT relics",
    "crypto game",
    "play to earn",
    "verifiable random",
    "Web3 game",
    "Cairo",
    "decentralized gaming"
  ],
  authors: [{ name: "Abyss Team" }],
  creator: "Abyss",
  publisher: "Abyss",
  metadataBase: new URL("https://play.abyssgame.fun"),
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://play.abyssgame.fun",
    siteName: "Abyss",
    title: "Abyss - On-Chain Slot Machine Game on Starknet",
    description: "Play the first fully on-chain slot machine game. Spin to win, compete for real prizes, and collect powerful NFT relics. Provably fair with Cartridge VRF.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Abyss - On-Chain Slot Machine Game"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@abyssdotfun",
    creator: "@abyssdotfun",
    title: "Abyss - On-Chain Slot Machine Game",
    description: "Play the first fully on-chain slot machine game on Starknet. Spin to win, compete for prizes!",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png"
  },
  manifest: "/manifest.json",
  category: "games"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
