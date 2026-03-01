'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function GameDetailsPage() {

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
        {/* Header with Back Button */}
        <header className="px-4 py-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="font-[family-name:var(--font-press-start)] text-white text-xs hover:text-primary transition-colors flex items-center gap-2"
            >
              <span>?</span> Back
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src="/images/abyss-logo.png"
                alt="Abyss Logo"
                width={35}
                height={35}
              />
              <h1 className="font-[family-name:var(--font-ramagothic)] text-white text-2xl md:text-3xl uppercase">
                ABYSS
              </h1>
            </div>
            <div className="flex items-center gap-4">
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
                X
              </a>
            </div>
          </div>
        </header>

        {/* About Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            What is Abyss?
          </h2>
          <div className="bg-black/60 border-2 border-primary p-6 md:p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs md:text-sm leading-relaxed mb-6">
              Blockchain-powered slot machine on Starknet. Two modes, leaderboards, and retro pixel art.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/40 border-2 border-white/20 p-4">
                <h3 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-3 uppercase">
                  ?? Two Game Modes
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                  <strong>Free to Play:</strong> Practice without stakes.
                </p>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed mt-2">
                  <strong>Gambling Mode:</strong> Costs 5 CHIP tokens (3 to prize pool, 2 to treasury). Compete for rewards.
                </p>
              </div>
              <div className="bg-black/40 border-2 border-white/20 p-4">
                <h3 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-3 uppercase">
                  ?? Global Leaderboard
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                  Top 10 displayed. Only top 3 can claim prizes (60%, 30%, 10%). Only competitive sessions count.
                </p>
              </div>
              <div className="bg-black/40 border-2 border-white/20 p-4">
                <h3 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-3 uppercase">
                  ?? Level Progression
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                  Unlock higher levels with increasing point thresholds. Start at Level 1 (33 pts).
                </p>
              </div>
              <div className="bg-black/40 border-2 border-white/20 p-4">
                <h3 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-3 uppercase">
                  ?? Privacy-Focused
                </h3>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                  Wallet stays on device. No data collected. True decentralized gaming.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to Play Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            How to Play
          </h2>
          
          <div className="space-y-4">
            {[
              { step: '1', title: 'Launch the App', text: 'Download and open the Abyss mobile app. Accept the Terms of Service to begin.' },
              { step: '2', title: 'Choose Your Mode', text: 'Select Free to Play for practice, or Gambling mode (costs 5 CHIP: 3 to prize pool, 2 to treasury) for competitive stakes.' },
              { step: '3', title: 'Create a Session', text: 'Start a new game session. Each session tracks your progress independently.' },
              { step: '4', title: 'Tap to Spin', text: 'Watch the 5x3 grid reveal symbols. Each spin uses one of your 5 spins per level.' },
              { step: '5', title: 'Match Patterns', text: 'Score points by matching 3+ symbols horizontally, vertically, or diagonally. Different patterns have different multipliers!' },
              { step: '6', title: 'Level Up', text: 'Reach the score threshold for your current level before running out of spins. When you level up, your spins reset to 5.' },
              { step: '7', title: 'Avoid 666', text: 'Beware! Three sixes in a row ends your game instantly. Safe in levels 1-5, then risk increases: 1.2% (6-9), 2.4% (10-13), 4.8% (14-17), 9.6% (18+).' },
              { step: '8', title: 'Use Items', text: 'Visit the item shop to purchase powerful items that boost your score, add spins, or protect against 666.' },
              { step: '9', title: 'Climb the Leaderboard', text: 'Compete for top 10 spots in competitive mode. Top 3 can claim prizes: 1st (60%), 2nd (30%), 3rd (10%)!' },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-black/60 border-2 border-white/30 p-4 md:p-6 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-primary text-black font-[family-name:var(--font-press-start)] text-xs px-3 py-1 min-w-[40px] text-center flex-shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-2 uppercase">
                      {item.title}
                    </h3>
                    <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Symbols Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            Symbols & Scoring
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              { name: 'Seven', points: 7, rarity: 'Rare', image: '/images/seven.png', description: 'The most valuable symbol. Rare but worth the most points.' },
              { name: 'Diamond', points: 5, rarity: 'Uncommon', image: '/images/diamond.png', description: 'A valuable symbol that appears less frequently.' },
              { name: 'Cherry', points: 4, rarity: 'Common', image: '/images/cherry.png', description: 'A common symbol with decent point value.' },
              { name: 'Coin', points: 3, rarity: 'Common', image: '/images/coin.png', description: 'A basic symbol found frequently in spins.' },
              { name: 'Lemon', points: 2, rarity: 'Common', image: '/images/lemon.png', description: 'The lowest value symbol, but still useful for patterns.' },
              { name: 'Six', points: 0, rarity: 'Cursed', image: '/images/six.png', description: 'The cursed symbol. Three in a row triggers instant game over!' },
            ].map((symbol) => (
              <div
                key={symbol.name}
                className={`bg-black/60 border-2 p-4 backdrop-blur-sm text-center ${
                  symbol.rarity === 'Cursed' 
                    ? 'border-[#ff4444]' 
                    : symbol.rarity === 'Rare'
                    ? 'border-primary'
                    : 'border-white/30'
                }`}
              >
                <div className="flex justify-center mb-2">
                  <Image
                    src={symbol.image}
                    alt={symbol.name}
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs mb-1">
                  {symbol.name}
                </p>
                <p className={`font-[family-name:var(--font-press-start)] text-xs mb-2 ${
                  symbol.rarity === 'Cursed' 
                    ? 'text-[#ff4444]' 
                    : 'text-primary'
                }`}>
                  {symbol.points} pts
                </p>
                <p className="font-[family-name:var(--font-press-start)] text-white/60 text-[10px] mb-2">
                  {symbol.rarity}
                </p>
                <p className="font-[family-name:var(--font-press-start)] text-white/70 text-[9px] leading-tight">
                  {symbol.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Item Shop Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            Item Shop
          </h2>
          
          <div className="bg-black/60 border-2 border-white/30 p-6 md:p-8 backdrop-blur-sm mb-6">
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs md:text-sm leading-relaxed mb-6">
              Purchase powerful items with your score to gain advantages. Each item has unique effects. You can own up to 7 unique items (only 1 of each type).
            </p>
            
            {/* Direct Score Bonus Items */}
            <div className="mb-8">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-4 uppercase">
                Direct Score Bonus Items
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 1, name: 'Chilly Pepper', desc: '+5 points to seven', price: 15, image: '/images/item1.png' },
                  { id: 2, name: 'Milk', desc: '+3 points to diamond', price: 20, image: '/images/item2.png' },
                  { id: 3, name: 'Magic Dice', desc: '+8 points to cherry', price: 30, image: '/images/item3.png' },
                  { id: 4, name: 'Old Cassette', desc: '+6 points to lemon', price: 35, image: '/images/item4.png' },
                  { id: 14, name: 'Old Wig', desc: '+4 points to lemon', price: 25, image: '/images/item14.png' },
                  { id: 13, name: 'Pig Bank', desc: '+12 points to cherry', price: 85, image: '/images/item13.png' },
                  { id: 19, name: 'Old Phone', desc: '+10 points to coin', price: 75, image: '/images/item19.png' },
                  { id: 25, name: 'Hockey Mask', desc: '+15 points to seven', price: 180, image: '/images/item25.png' },
                  { id: 26, name: 'Rune', desc: '+12 points to diamond', price: 160, image: '/images/item26.png' },
                  { id: 20, name: 'Smelly Boots', desc: '+20 points to cherry', price: 200, image: '/images/item20.png' },
                  { id: 30, name: 'Soul Contract', desc: '+18 points to lemon', price: 170, image: '/images/item30.png' },
                  { id: 32, name: 'Memory Card', desc: '+22 points to coin', price: 250, image: '/images/item32.png' },
                  { id: 33, name: 'Ticket', desc: '+25 points to seven', price: 350, image: '/images/item33.png' },
                  { id: 35, name: 'Fake Dollar', desc: '+18 points to diamond', price: 300, image: '/images/item35.png' },
                  { id: 38, name: 'Pocket Watch', desc: '+28 points to lemon', price: 320, image: '/images/item38.png' },
                  { id: 39, name: 'Knight Helmet', desc: '+5 points to coin', price: 28, image: '/images/item39.png' },
                ].map((item) => (
                  <div key={item.id} className="bg-black/40 border-2 border-primary p-3 flex items-start gap-3">
                    <Image src={item.image} alt={item.name} width={48} height={48} className="object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-1 uppercase">
                        {item.name}
                      </h4>
                      <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight mb-1">
                        {item.desc}
                      </p>
                      <p className="font-[family-name:var(--font-press-start)] text-primary/70 text-[9px]">
                        {item.price} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern Multiplier Boost Items */}
            <div className="mb-8">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-4 uppercase">
                Pattern Multiplier Boost Items
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 5, name: 'Bat Boomerang', desc: '+15% pattern multiplier', price: 40, image: '/images/item5.png' },
                  { id: 6, name: 'Holy Eye', desc: '+30% pattern multiplier', price: 90, image: '/images/item6.png' },
                  { id: 15, name: 'Amulet', desc: '+50% pattern multiplier', price: 150, image: '/images/item15.png' },
                  { id: 21, name: 'Bloody Wrench', desc: '+80% pattern multiplier', price: 280, image: '/images/item21.png' },
                  { id: 22, name: 'Car Keys', desc: '+100% pattern multiplier', price: 400, image: '/images/item22.png' },
                  { id: 24, name: 'Holy Grail', desc: '+150% pattern multiplier', price: 800, image: '/images/item24.png' },
                ].map((item) => (
                  <div key={item.id} className="bg-black/40 border-2 border-primary p-3 flex items-start gap-3">
                    <Image src={item.image} alt={item.name} width={48} height={48} className="object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-1 uppercase">
                        {item.name}
                      </h4>
                      <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight mb-1">
                        {item.desc}
                      </p>
                      <p className="font-[family-name:var(--font-press-start)] text-primary/70 text-[9px]">
                        {item.price} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Symbol Probability Boost Items */}
            <div className="mb-8">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-4 uppercase">
                Symbol Probability Boost Items
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 7, name: 'Nerd Glasses', desc: '+15% seven probability', price: 45, image: '/images/item7.png' },
                  { id: 11, name: 'Ghost Mask', desc: '+25% seven probability', price: 120, image: '/images/item11.png' },
                  { id: 34, name: 'Devil Train', desc: '+35% seven probability', price: 280, image: '/images/item34.png' },
                  { id: 8, name: 'Ace of Spades', desc: '+12% diamond probability', price: 50, image: '/images/item8.png' },
                  { id: 27, name: 'Bloody knife', desc: '+22% diamond probability', price: 130, image: '/images/item27.png' },
                  { id: 36, name: 'Bull Skull', desc: '+30% diamond probability', price: 260, image: '/images/item36.png' },
                  { id: 12, name: 'Skull', desc: '+10% cherry probability', price: 40, image: '/images/item12.png' },
                  { id: 16, name: 'Weird Hand', desc: '+18% cherry probability', price: 95, image: '/images/item16.png' },
                  { id: 28, name: 'Devil Head', desc: '+28% cherry probability', price: 220, image: '/images/item28.png' },
                  { id: 29, name: 'Cigarettes', desc: '+16% lemon probability', price: 70, image: '/images/item29.png' },
                  { id: 37, name: 'Fake Coin', desc: '+24% lemon probability', price: 120, image: '/images/item37.png' },
                  { id: 17, name: 'Golden Globe', desc: '+14% coin probability', price: 55, image: '/images/item17.png' },
                  { id: 31, name: 'Beer Can', desc: '+25% coin probability', price: 140, image: '/images/item31.png' },
                ].map((item) => (
                  <div key={item.id} className="bg-black/40 border-2 border-primary p-3 flex items-start gap-3">
                    <Image src={item.image} alt={item.name} width={48} height={48} className="object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-1 uppercase">
                        {item.name}
                      </h4>
                      <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight mb-1">
                        {item.desc}
                      </p>
                      <p className="font-[family-name:var(--font-press-start)] text-primary/70 text-[9px]">
                        {item.price} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Spin Bonus Items */}
            <div className="mb-8">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-4 uppercase">
                Spin Bonus Items
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 9, name: 'Devil Onion', desc: '+1 extra spin', price: 25, image: '/images/item9.png' },
                  { id: 10, name: 'Red Button', desc: '+3 extra spins', price: 65, image: '/images/item10.png' },
                  { id: 18, name: 'Pyramid', desc: '+5 extra spins', price: 110, image: '/images/item18.png' },
                  { id: 23, name: 'Devil Seal', desc: '+10 extra spins', price: 200, image: '/images/item23.png' },
                ].map((item) => (
                  <div key={item.id} className="bg-black/40 border-2 border-primary p-3 flex items-start gap-3">
                    <Image src={item.image} alt={item.name} width={48} height={48} className="object-contain flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-1 uppercase">
                        {item.name}
                      </h4>
                      <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight mb-1">
                        {item.desc}
                      </p>
                      <p className="font-[family-name:var(--font-press-start)] text-primary/70 text-[9px]">
                        {item.price} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Special Protection Item */}
            <div>
              <h3 className="font-[family-name:var(--font-press-start)] text-[#ff4444] text-sm mb-4 uppercase">
                Special Protection Item
              </h3>
              <div className="bg-black/40 border-2 border-[#ff4444] p-3 flex items-start gap-3">
                <Image src="/images/item40.png" alt="La Biblia" width={48} height={48} className="object-contain flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-[family-name:var(--font-press-start)] text-[#ff4444] text-xs mb-1 uppercase">
                    La Biblia
                  </h4>
                  <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight mb-1">
                    Protects from 666 once
                  </p>
                  <p className="font-[family-name:var(--font-press-start)] text-[#ff4444]/70 text-[9px]">
                    500 pts
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-black/60 border-2 border-white/30 p-6 backdrop-blur-sm">
            <h3 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-4 uppercase text-center">
              How the Shop Works
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">?</span>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs flex-1">
                  Items are purchased using your current score (points earned in the game)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">?</span>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs flex-1">
                  Each session has its own market with 6 randomly selected items
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">?</span>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs flex-1">
                  You can refresh the market (costs increase with each refresh)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">?</span>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs flex-1">
                  Items can be sold back for a portion of their purchase price
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">?</span>
                <p className="font-[family-name:var(--font-press-start)] text-white text-xs flex-1">
                  Maximum inventory size is 7 unique items (only 1 of each item type allowed)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Level Progression Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            Level Progression
          </h2>
          
          <div className="bg-black/60 border-2 border-primary p-6 md:p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs md:text-sm leading-relaxed mb-6 text-center">
              Each level requires a certain score threshold to advance. You start with 5 spins per level. If you level up, your spins reset to 5. If you run out of spins without leveling up, the game ends.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { level: 1, threshold: 33 },
                { level: 2, threshold: 100 },
                { level: 3, threshold: 250 },
                { level: 4, threshold: 500 },
                { level: 5, threshold: 850 },
                { level: 6, threshold: 1300 },
              ].map((item) => (
                <div
                  key={item.level}
                  className={`bg-black/40 border-2 p-3 text-center ${
                    item.level <= 3 ? 'border-primary' : 'border-white/30'
                  }`}
                >
                  <p className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-1">
                    Level {item.level}
                  </p>
                  <p className="font-[family-name:var(--font-press-start)] text-white text-xs">
                    {item.threshold} pts
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The 666 Pattern Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            The 666 Pattern
          </h2>
          
          <div className="bg-black/60 border-2 border-[#ff4444] p-6 md:p-8 backdrop-blur-sm">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">??</div>
              <h3 className="font-[family-name:var(--font-press-start)] text-[#ff4444] text-base mb-3 uppercase">
                Instant Game Over
              </h3>
            </div>
            
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed mb-4 text-center">
              Three Six symbols in a row ends your game immediately.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-black/40 border-2 border-[#ff4444]/50 p-3">
                <h4 className="font-[family-name:var(--font-press-start)] text-[#ff4444] text-xs mb-2 uppercase">
                  Probability by Level
                </h4>
                <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight">
                  Lv1-5: 0% | Lv6-9: 1.2% | Lv10-13: 2.4% | Lv14-17: 4.8% | Lv18+: 9.6%
                </p>
              </div>
              
              <div className="bg-black/40 border-2 border-primary/50 p-3">
                <h4 className="font-[family-name:var(--font-press-start)] text-primary text-xs mb-2 uppercase">
                  Protection
                </h4>
                <p className="font-[family-name:var(--font-press-start)] text-white text-[10px] leading-tight">
                  La Biblia (500 pts) protects once. Auto-consumed when triggered.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Prize Pool Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            Prize Pool
          </h2>
          
          <div className="bg-black/60 border-2 border-primary p-6 md:p-8 backdrop-blur-sm">
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs md:text-sm leading-relaxed mb-6 text-center">
              Each competitive session costs 5 CHIP: 3 CHIP goes to prize pool, 2 CHIP to treasury. Top 10 displayed, but only top 3 can claim prizes!
            </p>
            
            <div className="space-y-4">
              <div className="bg-black/40 border-2 border-primary p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[family-name:var(--font-press-start)] text-primary text-xs uppercase">1st Place</span>
                  <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">60%</span>
                </div>
                <p className="font-[family-name:var(--font-press-start)] text-white/80 text-[10px]">
                  Claims 60% of the prize pool
                </p>
              </div>
              
              <div className="bg-black/40 border-2 border-primary p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[family-name:var(--font-press-start)] text-primary text-xs uppercase">2nd Place</span>
                  <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">30%</span>
                </div>
                <p className="font-[family-name:var(--font-press-start)] text-white/80 text-[10px]">
                  Claims 30% of the prize pool
                </p>
              </div>
              
              <div className="bg-black/40 border-2 border-primary p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-[family-name:var(--font-press-start)] text-primary text-xs uppercase">3rd Place</span>
                  <span className="font-[family-name:var(--font-press-start)] text-primary text-xs">10%</span>
                </div>
                <p className="font-[family-name:var(--font-press-start)] text-white/80 text-[10px]">
                  Claims 10% of the prize pool
                </p>
              </div>
            </div>
            
            <p className="font-[family-name:var(--font-press-start)] text-white/70 text-[10px] text-center mt-6">
              Prize pool accumulates from competitive sessions (3 CHIP per session). Check the leaderboard in-game to see current pool size!
            </p>
          </div>
        </section>

        {/* Technical Section */}
        <section className="px-4 py-12 max-w-6xl mx-auto">
          <h2 className="font-[family-name:var(--font-ramagothic)] text-white text-4xl md:text-5xl mb-8 text-center uppercase">
            Powered by Starknet
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-black/60 border-2 border-primary p-6 backdrop-blur-sm text-center">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-3 uppercase">
                ?? Blockchain
              </h3>
              <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                All sessions recorded on-chain. Transparent and fair.
              </p>
            </div>
            <div className="bg-black/60 border-2 border-primary p-6 backdrop-blur-sm text-center">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-3 uppercase">
                ? Scalability
              </h3>
              <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                Infinite scalability. No player limits. Low transaction costs.
              </p>
            </div>
            <div className="bg-black/60 border-2 border-primary p-6 backdrop-blur-sm text-center">
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm mb-3 uppercase">
                ?? Security
              </h3>
              <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
                Keys stay on device. True self-custody. You own your progress.
              </p>
            </div>
          </div>

          {/* Cavos Section */}
          <div className="bg-black/60 border-2 border-primary p-6 backdrop-blur-sm text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Image
                src="/images/cavos_logo.png"
                alt="Cavos Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <h3 className="font-[family-name:var(--font-press-start)] text-primary text-sm uppercase">
                Also Powered by Cavos
              </h3>
            </div>
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs leading-relaxed">
              Invisible wallets for seamless Web3 interactions.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-12 border-t-2 border-white/20 mt-12">
          <div className="max-w-6xl mx-auto text-center">
            <p className="font-[family-name:var(--font-press-start)] text-white text-xs mb-4">
              Dive into the Abyss. Will you reach the top, or will the 666 claim you?
            </p>
            <p className="font-[family-name:var(--font-press-start)] text-white/60 text-[10px] mb-6">
              Made with &lt;3 by Cavos
            </p>
            <div className="flex justify-center gap-6">
              <Link
                href="/"
                className="font-[family-name:var(--font-press-start)] text-primary text-xs hover:text-[#FF9A4D] transition-colors"
              >
                Home
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
