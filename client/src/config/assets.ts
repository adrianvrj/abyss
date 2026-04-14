export const PRELOAD_IMAGES = [
    // Base UI and Backgrounds
    '/images/bg-desktop.png',
    '/images/bg-mobile.png',
    '/images/abyss-logo.png',
    '/images/slot_machine.png',
    '/images/skull_danger.png',
    '/favicon.svg',
    '/icon.png',

    // Symbols
    '/images/seven.png',
    '/images/diamond.png',
    '/images/cherry.png',
    '/images/coin.png',
    '/images/lemon.png',
    '/images/six.png',

    // Items (1-44)
    ...Array.from({ length: 44 }, (_, i) => `/images/item${i + 1}.png`),

    // Relics
    '/images/relics/inferno.png',
    '/images/relics/lucky_the_dealer.png',
    '/images/relics/mortis.png',
    '/images/relics/phantom.png',
    '/images/relics/scorcher.png',
    ...Array.from({ length: 5 }, (_, i) => `/images/relics/${i + 1}.png`),

    // Charms
    ...Array.from({ length: 20 }, (_, i) => `/images/charms/${i + 1}.png`),
    '/images/charms/abyssal_eye.png',
    '/images/charms/bone_dice.png',
    '/images/charms/broken_mirror.png',
    '/images/charms/chaos_orb.png',
    '/images/charms/cracked_skull.png',
    '/images/charms/cursed_pendant.png',
    '/images/charms/demons_tooth.png',
    '/images/charms/dusty_hourglass.png',
    '/images/charms/ethereal_chain.png',
    '/images/charms/faded_coin.png',
    '/images/charms/moth_wing.png',
    '/images/charms/phoenix_feather.png',
    '/images/charms/reapers_mark.png',
    '/images/charms/rusty_key.png',
    '/images/charms/shadow_lantern.png',
    '/images/charms/soul_fragment.png',
    '/images/charms/soul_of_abyss.png',
    '/images/charms/void_compass.png',
    '/images/charms/void_heart.png',
    '/images/charms/whisper_stone.png',
];

export const PRELOAD_AUDIO = [
    '/sounds/spin.mp3',
    '/sounds/win.wav',
    '/sounds/jackpot.mp3',
    '/sounds/game-over.mp3',
];
