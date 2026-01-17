import { hash } from 'starknet';
import { CONTRACTS } from '@/lib/constants';

// Event types
export interface SpinCompletedEvent {
    sessionId: number;
    grid: number[];
    scoreGained: number;
    newTotalScore: number;
    newLevel: number;
    spinsRemaining: number;
    isActive: boolean;
    is666: boolean;
    isJackpot: boolean;
    bibliaUsed: boolean;
    currentLuck: number;
    symbolScores: number[];
}

export interface ItemPurchasedEvent {
    sessionId: number;
    itemId: number;
    price: number;
    newScore: number;
    newSpins: number;
    isCharm: boolean;
}

export interface ItemSoldEvent {
    sessionId: number;
    itemId: number;
    sellPrice: number;
    newScore: number;
}

export interface MarketRefreshedEvent {
    sessionId: number;
    newScore: number;
    slots: number[];
}

export interface RelicActivatedEvent {
    sessionId: number;
    relicId: number;
    effectType: number;
    cooldownUntilSpin: number;
}

export interface RelicEquippedEvent {
    sessionId: number;
    relicTokenId: bigint;
    relicId: number;
}

export interface CharmMintedEvent {
    player: string;
    sessionId: number;
    charmId: number;
    rarity: number;
    tokenId: bigint;
}

export interface BibliaDiscardedEvent {
    sessionId: number;
    discarded: boolean;
}

export interface ParsedEvents {
    spinCompleted: SpinCompletedEvent | null;
    itemsPurchased: ItemPurchasedEvent[];
    itemsSold: ItemSoldEvent[];
    marketRefreshed: MarketRefreshedEvent | null;
    relicActivated: RelicActivatedEvent | null;
    relicEquipped: RelicEquippedEvent | null;
    charmMinted: CharmMintedEvent | null;
    bibliaDiscarded: BibliaDiscardedEvent | null;
}

// Event selectors
const EVENT_SELECTORS = {
    SpinCompleted: hash.getSelectorFromName('SpinCompleted'),
    ItemPurchased: hash.getSelectorFromName('ItemPurchased'),
    ItemSold: hash.getSelectorFromName('ItemSold'),
    MarketRefreshed: hash.getSelectorFromName('MarketRefreshed'),
    RelicActivated: hash.getSelectorFromName('RelicActivated'),
    RelicEquipped: hash.getSelectorFromName('RelicEquipped'),
    CharmMinted: hash.getSelectorFromName('CharmMinted'),
    BibliaDiscarded: hash.getSelectorFromName('BibliaDiscarded'),
};

/**
 * Parse SpinCompleted event from receipt
 */
function parseSpinCompletedEvent(eventData: string[], keys: string[]): SpinCompletedEvent | null {
    if (!eventData || eventData.length < 16) {
        return null;
    }

    try {
        const sessionId = keys && keys[1] ? Number(keys[1]) : 0;
        const gridLength = Number(eventData[0]);
        let gridStart = 0;

        if (gridLength === 15) {
            gridStart = 1;
        }

        const grid: number[] = [];
        for (let i = 0; i < 15; i++) {
            grid.push(Number(eventData[gridStart + i]));
        }

        const offset = gridStart + 15;

        return {
            sessionId,
            grid,
            scoreGained: Number(eventData[offset] || 0),
            newTotalScore: Number(eventData[offset + 1] || 0),
            newLevel: Number(eventData[offset + 2] || 0),
            spinsRemaining: Number(eventData[offset + 3] || 0),
            isActive: eventData[offset + 4] === '0x1' || eventData[offset + 4] === '1',
            is666: eventData[offset + 5] === '0x1' || eventData[offset + 5] === '1',
            isJackpot: eventData[offset + 6] === '0x1' || eventData[offset + 6] === '1',
            bibliaUsed: eventData[offset + 7] === '0x1' || eventData[offset + 7] === '1',
            currentLuck: Number(eventData[offset + 8] || 0),
            symbolScores: [
                Number(eventData[offset + 9] || 7),
                Number(eventData[offset + 10] || 5),
                Number(eventData[offset + 11] || 4),
                Number(eventData[offset + 12] || 3),
                Number(eventData[offset + 13] || 2),
            ]
        };
    } catch (e) {
        console.error('Failed to parse SpinCompleted event:', e);
        return null;
    }
}

/**
 * Parse ItemPurchased event
 */
function parseItemPurchasedEvent(eventData: string[]): ItemPurchasedEvent | null {
    if (!eventData || eventData.length < 5) return null;

    try {
        return {
            sessionId: 0,
            itemId: Number(eventData[0]),
            price: Number(eventData[1]),
            newScore: Number(eventData[2]),
            newSpins: Number(eventData[3]),
            isCharm: eventData[4] === '0x1' || eventData[4] === '1',
        };
    } catch (e) {
        console.error('Failed to parse ItemPurchased event:', e);
        return null;
    }
}

/**
 * Parse ItemSold event
 */
function parseItemSoldEvent(eventData: string[]): ItemSoldEvent | null {
    if (!eventData || eventData.length < 3) return null;

    try {
        return {
            sessionId: 0,
            itemId: Number(eventData[0]),
            sellPrice: Number(eventData[1]),
            newScore: Number(eventData[2]),
        };
    } catch (e) {
        console.error('Failed to parse ItemSold event:', e);
        return null;
    }
}

/**
 * Parse MarketRefreshed event
 */
function parseMarketRefreshedEvent(eventData: string[]): MarketRefreshedEvent | null {
    if (!eventData || eventData.length < 7) return null;

    try {
        return {
            sessionId: 0,
            newScore: Number(eventData[0]),
            slots: [
                Number(eventData[1]),
                Number(eventData[2]),
                Number(eventData[3]),
                Number(eventData[4]),
                Number(eventData[5]),
                Number(eventData[6]),
            ],
        };
    } catch (e) {
        console.error('Failed to parse MarketRefreshed event:', e);
        return null;
    }
}

/**
 * Parse RelicActivated event
 */
function parseRelicActivatedEvent(eventData: string[]): RelicActivatedEvent | null {
    if (!eventData || eventData.length < 3) return null;

    try {
        return {
            sessionId: 0,
            relicId: Number(eventData[0]),
            effectType: Number(eventData[1]),
            cooldownUntilSpin: Number(eventData[2]),
        };
    } catch (e) {
        console.error('Failed to parse RelicActivated event:', e);
        return null;
    }
}

/**
 * Parse RelicEquipped event
 */
function parseRelicEquippedEvent(eventData: string[]): RelicEquippedEvent | null {
    if (!eventData || eventData.length < 2) return null;
    try {
        // [sessionId (key), token_id_low, token_id_high, relic_id]
        // But sessionId is usually indexed, so it's in keys.
        // Data should have token_id (u256) and relic_id (u32).
        // u256 is 2 felts.
        return {
            sessionId: 0,
            relicTokenId: BigInt(eventData[0]) + (BigInt(eventData[1]) << BigInt(128)),
            relicId: Number(eventData[2]),
        };
    } catch (e) {
        console.error('Failed to parse RelicEquipped event:', e);
        return null;
    }
}


/**
 * Parse CharmMinted event
 */
function parseCharmMintedEvent(eventData: string[]): CharmMintedEvent | null {
    if (!eventData || eventData.length < 3) return null;

    try {
        return {
            player: '',
            sessionId: 0,
            charmId: Number(eventData[0]),
            rarity: Number(eventData[1]),
            tokenId: BigInt(eventData[2] || 0),
        };
    } catch (e) {
        console.error('Failed to parse CharmMinted event:', e);
        return null;
    }
}

/**
 * Parse BibliaDiscarded event
 */
function parseBibliaDiscardedEvent(eventData: string[]): BibliaDiscardedEvent | null {
    if (!eventData || eventData.length < 1) return null;
    // Usually boolean is 1 felt.
    try {
        return {
            sessionId: 0,
            discarded: eventData[0] === '0x1' || eventData[0] === '1',
        };
    } catch (e) {
        console.error('Failed to parse BibliaDiscarded event:', e);
        return null;
    }
}


/**
 * Parse all events from a transaction receipt
 */
export function parseReceiptEvents(receipt: any): ParsedEvents {
    const result: ParsedEvents = {
        spinCompleted: null,
        itemsPurchased: [],
        itemsSold: [],
        marketRefreshed: null,
        relicActivated: null,
        relicEquipped: null,
        charmMinted: null,
        bibliaDiscarded: null,
    };

    if (!receipt?.events) {
        return result;
    }

    for (const event of receipt.events) {
        // Handle both formats of address (leading zeros or not)
        const isFromGame = BigInt(event.from_address) === BigInt(CONTRACTS.ABYSS_GAME);
        if (!isFromGame) continue;

        const selector = event.keys?.[0];

        if (selector === EVENT_SELECTORS.SpinCompleted) {
            result.spinCompleted = parseSpinCompletedEvent(event.data, event.keys);
        } else if (selector === EVENT_SELECTORS.ItemPurchased) {
            const parsed = parseItemPurchasedEvent(event.data);
            if (parsed) result.itemsPurchased.push(parsed);
        } else if (selector === EVENT_SELECTORS.ItemSold) {
            const parsed = parseItemSoldEvent(event.data);
            if (parsed) result.itemsSold.push(parsed);
        } else if (selector === EVENT_SELECTORS.MarketRefreshed) {
            result.marketRefreshed = parseMarketRefreshedEvent(event.data);
        } else if (selector === EVENT_SELECTORS.RelicActivated) {
            result.relicActivated = parseRelicActivatedEvent(event.data);
        } else if (selector === EVENT_SELECTORS.RelicEquipped) {
            result.relicEquipped = parseRelicEquippedEvent(event.data);
        } else if (selector === EVENT_SELECTORS.CharmMinted) {
            result.charmMinted = parseCharmMintedEvent(event.data);
        } else if (selector === EVENT_SELECTORS.BibliaDiscarded) {
            result.bibliaDiscarded = parseBibliaDiscardedEvent(event.data);
        }
    }

    return result;
}
