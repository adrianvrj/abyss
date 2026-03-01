'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, Skull, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/bg-welcome.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Overlay for better text readability */}
      <div className="fixed inset-0 z-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-4 py-20">
          <div className="text-center mb-12 animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-8">
              <h1 className="font-[family-name:var(--font-ramagothic)] text-white text-6xl md:text-8xl lg:text-[110px] uppercase tracking-tight">
                ABYSS
              </h1>
              <Image
                src="/images/abyss-logo.png"
                alt="Abyss Logo"
                width={55}
                height={55}
                className="mt-4"
                priority
              />
            </div>
            <p className="font-[family-name:var(--font-press-start)] text-white text-lg md:text-xl mb-4">
              Dive into the Abyss
            </p>
            <p className="font-[family-name:var(--font-press-start)] text-primary text-sm md:text-base">
              A Blockchain-Powered Slot Machine Game
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col md:flex-row gap-4 mb-12 animate-fade-in-delay">
            <Link
              href="/game-details"
              className="px-8 py-4 bg-primary text-black font-[family-name:var(--font-press-start)] text-sm uppercase tracking-wide hover:bg-[#FF9A4D] transition-colors border-2 border-primary shadow-[4px_4px_0px_0px_rgba(255,132,28,0.5)] text-center"
            >
              Get Started
            </Link>
            <a
              href="https://t.me/+JB4RkO3eZrFhNjYx"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-transparent text-white font-[family-name:var(--font-press-start)] text-sm uppercase tracking-wide border-2 border-white hover:bg-white/10 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]"
            >
              Join Telegram
            </a>
            <a
              href="https://x.com/abyssdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-transparent text-white font-[family-name:var(--font-press-start)] text-sm uppercase tracking-wide border-2 border-white hover:bg-white/10 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]"
            >
              Join X
            </a>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-black/50 backdrop-blur-sm border-y border-white/10">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-5xl md:text-7xl mb-16 text-center uppercase tracking-wide text-shadow-glow">
              Game Features
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="border-2 border-white/20 p-8 bg-black/40 hover:border-primary/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/40 transition-colors">
                  <ShoppingBag className="text-primary w-6 h-6" />
                </div>
                <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm md:text-base mb-4 uppercase leading-relaxed">
                  Strategic Item Shop
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white/70 text-xs leading-relaxed">
                  Visit the market to buy items like &quot;Symbol Probability Boost&quot; or &quot;Score Multiplier&quot;. Craft your own strategy to top the leaderboards.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="border-2 border-white/20 p-8 bg-black/40 hover:border-red-500/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-full bg-red-900/20 flex items-center justify-center mb-6 group-hover:bg-red-900/40 transition-colors">
                  <Skull className="text-red-500 w-6 h-6" />
                </div>
                <h3 className="font-[family-name:var(--font-press-start)] text-red-500 text-sm md:text-base mb-4 uppercase leading-relaxed">
                  High Stakes Logic
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white/70 text-xs leading-relaxed">
                  Spin the reels to win, but beware the <span className="text-red-500">666</span> pattern. If it appears, it claims your entire score. High risk, high reward.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="border-2 border-white/20 p-8 bg-black/40 hover:border-blue-400/80 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-full bg-blue-900/20 flex items-center justify-center mb-6 group-hover:bg-blue-900/40 transition-colors">
                  <Zap className="text-blue-400 w-6 h-6" />
                </div>
                <h3 className="font-[family-name:var(--font-press-start)] text-blue-400 text-sm md:text-base mb-4 uppercase leading-relaxed">
                  Winning Patterns
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white/70 text-xs leading-relaxed">
                   Match symbols in horizontal rows, vertical columns, or diagonals. Combine patterns for massive multipliers and epic wins.
                </p>
              </div>
            </div>

            <div className="mt-16 text-center max-w-3xl mx-auto border border-white/10 p-6 bg-white/5 rounded-sm">
              <p className="font-[family-name:var(--font-press-start)] text-white/50 text-[10px] leading-relaxed uppercase">
                <span className="text-primary">Note:</span> Abyss is strictly for entertainment purposes. No real money or monetary value is involved. 
                By playing, you agree to our Terms of Service.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-12 border-t-2 border-white/20">
          <div className="max-w-6xl mx-auto text-center">
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs mb-4">
              Dive into the Abyss. Will you reach the top, or will the 666 claim you?
            </p>
            <p className="font-[family-name:var(--font-press-start)] text-white/60 text-[10px] mb-6">
              Made with &lt;3 by Cavos
            </p>
            <div className="flex justify-center gap-6">
              <Link
                href="/game-details"
                className="font-[family-name:var(--font-press-start)] text-primary text-xs hover:text-[#FF9A4D] transition-colors"
              >
                Game Details
              </Link>
              <a
                href="https://t.me/+JB4RkO3eZrFhNjYx"
                target="_blank"
                rel="noopener noreferrer"
                className="font-[family-name:var(--font-press-start)] text-primary text-xs hover:text-[#FF9A4D] transition-colors"
              >
                Telegram
              </a>
              <a
                href="https://x.com/abyssdotfun"
                target="_blank"
                rel="noopener noreferrer"
                className="font-[family-name:var(--font-press-start)] text-primary text-xs hover:text-[#FF9A4D] transition-colors"
              >
                X (Twitter)
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
