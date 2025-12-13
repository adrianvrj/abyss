import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const ramagothic = localFont({
  src: "../public/fonts/ramagothicbold.ttf",
  variable: "--font-ramagothic",
});

export const metadata: Metadata = {
  title: "Abyss",
  description: "A thrilling roguelite slot game where skill meets luck on the blockchain. Built on Starknet. Play for free or compete for prizes.",
  keywords: "Abyss, slot machine, blockchain game, Starknet, crypto game, NFT game, decentralized gaming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${pressStart.variable} ${ramagothic.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
