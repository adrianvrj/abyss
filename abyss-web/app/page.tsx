'use client';

import Image from 'next/image';
import Link from 'next/link';

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
