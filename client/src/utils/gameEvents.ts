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
    chipBonusUnits: number;
}

export interface ItemPurchasedEvent {
    sessionId: number;
    itemId: number;
    price: number;
    newScore: number;
    newSpins: number;
    newTickets: number;
    isCharm: boolean;
    currentLuck: number;
}

export interface ItemSoldEvent {
    sessionId: number;
    itemId: number;
    sellPrice: number;
    newScore: number;
    newTickets: number;
    currentLuck: number;
}

export interface MarketRefreshedEvent {
    sessionId: number;
    newScore: number;
    slots: number[];
    currentLuck: number;
}

export interface RelicActivatedEvent {
    sessionId: number;
    relicId: number;
    effectType: number;
    cooldownUntilSpin: number;
    currentLuck: number;
}

export interface PhantomActivatedEvent {
    sessionId: number;
    bonusSpins: number;
    newSpins: number;
}

export interface RelicEquippedEvent {
    sessionId: number;
    relicTokenId: bigint;
    relicId: number;
    currentLuck: number;
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

export interface CashOutResolvedEvent {
    sessionId: number;
    succeeded: boolean;
}

export interface ParsedEvents {
    spinCompleted: SpinCompletedEvent | null;
    itemsPurchased: ItemPurchasedEvent[];
    itemsSold: ItemSoldEvent[];
    marketRefreshed: MarketRefreshedEvent | null;
    relicActivated: RelicActivatedEvent | null;
    phantomActivated: PhantomActivatedEvent | null;
    relicEquipped: RelicEquippedEvent | null;
    charmMinted: CharmMintedEvent | null;
    bibliaDiscarded: BibliaDiscardedEvent | null;
    cashOutResolved: CashOutResolvedEvent | null;
}

type RawEvent = {
    fromAddress?: string | bigint | number | null;
    keys: Array<string | bigint | number>;
    data: Array<string | bigint | number>;
};

export interface ReceiptEventSummary {
    index: number;
    fromAddress: string | null;
    keys: string[];
    dataPreview: string[];
    dataLength: number;
}

type DojoEventEnvelope = {
    keyValues: Array<string | bigint | number>;
    fieldValues: Array<string | bigint | number>;
};

// Event selectors
const EVENT_SELECTORS = {
    SpinCompleted: hash.getSelectorFromName('SpinCompleted'),
    ItemPurchased: hash.getSelectorFromName('ItemPurchased'),
    ItemSold: hash.getSelectorFromName('ItemSold'),
    MarketRefreshed: hash.getSelectorFromName('MarketRefreshed'),
    RelicActivated: hash.getSelectorFromName('RelicActivated'),
    PhantomActivated: hash.getSelectorFromName('PhantomActivated'),
    RelicEquipped: hash.getSelectorFromName('RelicEquipped'),
    CharmMinted: hash.getSelectorFromName('CharmMinted'),
    BibliaDiscarded: hash.getSelectorFromName('BibliaDiscarded'),
    CashOutResolved: hash.getSelectorFromName('CashOutResolved'),
};

function feltToNumber(value: string | bigint | number | undefined | null, fallback = 0): number {
    if (value === undefined || value === null) {
        return fallback;
    }

    try {
        return Number(value);
    } catch {
        return fallback;
    }
}

function feltToBigInt(value: string | bigint | number | undefined | null, fallback = 0n): bigint {
    if (value === undefined || value === null) {
        return fallback;
    }

    try {
        return BigInt(value);
    } catch {
        return fallback;
    }
}

function normalizeAddress(value: string | bigint | number | undefined | null): string | null {
    if (value === undefined || value === null) {
        return null;
    }

    try {
        return BigInt(value).toString();
    } catch {
        return null;
    }
}

function isTruthyFelt(value: string | bigint | number | undefined | null): boolean {
    if (value === undefined || value === null) {
        return false;
    }

    if (typeof value === 'bigint') {
        return value === 1n;
    }

    if (typeof value === 'number') {
        return value === 1;
    }

    return value === '1' || value === '0x1';
}

function normalizeEvent(event: any): RawEvent {
    const content = event?.event_content ?? event ?? {};

    return {
        fromAddress:
            event?.from_address ??
            event?.fromAddress ??
            content?.from_address ??
            content?.fromAddress ??
            null,
        keys: Array.isArray(content?.keys) ? content.keys : [],
        data: Array.isArray(content?.data) ? content.data : [],
    };
}

function normalizeReceiptEvents(receipt: any): RawEvent[] {
    const events =
        receipt?.events ??
        receipt?.value?.events ??
        receipt?.transaction_receipt?.events ??
        [];

    if (!Array.isArray(events)) {
        return [];
    }

    return events.map(normalizeEvent);
}

function unwrapDojoEventData(eventData: Array<string | bigint | number>): DojoEventEnvelope | null {
    if (!eventData || eventData.length < 4) {
        return null;
    }

    const keyCount = feltToNumber(eventData[0], -1);
    if (keyCount < 0) {
        return null;
    }

    const keysStart = 1;
    const keysEnd = keysStart + keyCount;
    if (eventData.length <= keysEnd) {
        return null;
    }

    const fieldCount = feltToNumber(eventData[keysEnd], -1);
    if (fieldCount < 0) {
        return null;
    }

    const fieldsStart = keysEnd + 1;
    const fieldsEnd = fieldsStart + fieldCount;
    if (eventData.length < fieldsEnd) {
        return null;
    }

    return {
        keyValues: eventData.slice(keysStart, keysEnd),
        fieldValues: eventData.slice(fieldsStart, fieldsEnd),
    };
}

function feltToDebugString(value: string | bigint | number | undefined | null): string {
    if (value === undefined || value === null) {
        return 'null';
    }

    try {
        return `0x${BigInt(value).toString(16)}`;
    } catch {
        return String(value);
    }
}

/**
 * Parse SpinCompleted event from receipt
 */
function parseSpinCompletedEvent(
    eventData: Array<string | bigint | number>,
    keys: Array<string | bigint | number>,
): SpinCompletedEvent | null {
    if (!eventData || eventData.length < 16) {
        return null;
    }

    try {
        const sessionId = readSessionIdFromKeys(keys, EVENT_SELECTORS.SpinCompleted);
        const gridLength = feltToNumber(eventData[0]);
        let gridStart = 0;

        if (gridLength === 15) {
            gridStart = 1;
        }

        const grid: number[] = [];
        for (let i = 0; i < 15; i++) {
            grid.push(feltToNumber(eventData[gridStart + i]));
        }

        const offset = gridStart + 15;

        return {
            sessionId,
            grid,
            scoreGained: feltToNumber(eventData[offset]),
            newTotalScore: feltToNumber(eventData[offset + 1]),
            newLevel: feltToNumber(eventData[offset + 2]),
            spinsRemaining: feltToNumber(eventData[offset + 3]),
            isActive: isTruthyFelt(eventData[offset + 4]),
            is666: isTruthyFelt(eventData[offset + 5]),
            isJackpot: isTruthyFelt(eventData[offset + 6]),
            bibliaUsed: isTruthyFelt(eventData[offset + 7]),
            currentLuck: feltToNumber(eventData[offset + 8]),
            symbolScores: [
                feltToNumber(eventData[offset + 9], 7),
                feltToNumber(eventData[offset + 10], 5),
                feltToNumber(eventData[offset + 11], 4),
                feltToNumber(eventData[offset + 12], 3),
                feltToNumber(eventData[offset + 13], 2),
            ],
            chipBonusUnits: eventData.length > offset + 14 ? feltToNumber(eventData[offset + 14]) : 0,
        };
    } catch (e) {
        console.error('Failed to parse SpinCompleted event:', e);
        return null;
    }
}

/**
 * Parse ItemPurchased event
 */
function parseItemPurchasedEvent(eventData: Array<string | bigint | number>): ItemPurchasedEvent | null {
    if (!eventData || eventData.length < 7) return null;

    try {
        return {
            sessionId: 0,
            itemId: feltToNumber(eventData[0]),
            price: feltToNumber(eventData[1]),
            newScore: feltToNumber(eventData[2]),
            newSpins: feltToNumber(eventData[3]),
            newTickets: feltToNumber(eventData[4]),
            isCharm: isTruthyFelt(eventData[5]),
            currentLuck: feltToNumber(eventData[6]),
        };
    } catch (e) {
        console.error('Failed to parse ItemPurchased event:', e);
        return null;
    }
}

/**
 * Parse ItemSold event
 */
function parseItemSoldEvent(eventData: Array<string | bigint | number>): ItemSoldEvent | null {
    if (!eventData || eventData.length < 5) return null;

    try {
        return {
            sessionId: 0,
            itemId: feltToNumber(eventData[0]),
            sellPrice: feltToNumber(eventData[1]),
            newScore: feltToNumber(eventData[2]),
            newTickets: feltToNumber(eventData[3]),
            currentLuck: feltToNumber(eventData[4]),
        };
    } catch (e) {
        console.error('Failed to parse ItemSold event:', e);
        return null;
    }
}

/**
 * Parse MarketRefreshed event
 */
function parseMarketRefreshedEvent(eventData: Array<string | bigint | number>): MarketRefreshedEvent | null {
    if (!eventData || eventData.length < 8) return null;

    try {
        return {
            sessionId: 0,
            newScore: feltToNumber(eventData[0]),
            slots: [
                feltToNumber(eventData[1]),
                feltToNumber(eventData[2]),
                feltToNumber(eventData[3]),
                feltToNumber(eventData[4]),
                feltToNumber(eventData[5]),
                feltToNumber(eventData[6]),
            ],
            currentLuck: feltToNumber(eventData[7]),
        };
    } catch (e) {
        console.error('Failed to parse MarketRefreshed event:', e);
        return null;
    }
}

/**
 * Parse RelicActivated event
 */
function parseRelicActivatedEvent(eventData: Array<string | bigint | number>): RelicActivatedEvent | null {
    if (!eventData || eventData.length < 4) return null;

    try {
        return {
            sessionId: 0,
            relicId: feltToNumber(eventData[0]),
            effectType: feltToNumber(eventData[1]),
            cooldownUntilSpin: feltToNumber(eventData[2]),
            currentLuck: feltToNumber(eventData[3]),
        };
    } catch (e) {
        console.error('Failed to parse RelicActivated event:', e);
        return null;
    }
}

function parsePhantomActivatedEvent(eventData: Array<string | bigint | number>): PhantomActivatedEvent | null {
    if (!eventData || eventData.length < 2) return null;

    try {
        return {
            sessionId: 0,
            bonusSpins: feltToNumber(eventData[0]),
            newSpins: feltToNumber(eventData[1]),
        };
    } catch (e) {
        console.error('Failed to parse PhantomActivated event:', e);
        return null;
    }
}

/**
 * Parse RelicEquipped event
 */
function parseRelicEquippedEvent(eventData: Array<string | bigint | number>): RelicEquippedEvent | null {
    if (!eventData || eventData.length < 4) return null;
    try {
        return {
            sessionId: 0,
            relicTokenId: feltToBigInt(eventData[0]) + (feltToBigInt(eventData[1]) << BigInt(128)),
            relicId: feltToNumber(eventData[2]),
            currentLuck: feltToNumber(eventData[3]),
        };
    } catch (e) {
        console.error('Failed to parse RelicEquipped event:', e);
        return null;
    }
}

function findSelectorIndex(keys: Array<string | bigint | number> | undefined, selector: string): number {
    if (!keys?.length) {
        return -1;
    }

    return keys.findIndex((key) => {
        try {
            return BigInt(key) === BigInt(selector);
        } catch {
            return key === selector;
        }
    });
}

function readSessionIdFromKeys(
    keys: Array<string | bigint | number> | undefined,
    selector: string,
): number {
    if (!keys?.length) {
        return 0;
    }

    const selectorIndex = findSelectorIndex(keys, selector);
    if (selectorIndex >= 0 && keys[selectorIndex + 1]) {
        return feltToNumber(keys[selectorIndex + 1]);
    }

    if (keys.length <= 2 && keys[0]) {
        return feltToNumber(keys[0]);
    }

    if (keys[1]) {
        return feltToNumber(keys[1]);
    }

    return 0;
}


/**
 * Parse CharmMinted event
 */
function parseCharmMintedEvent(eventData: Array<string | bigint | number>): CharmMintedEvent | null {
    if (!eventData || eventData.length < 4) return null;

    try {
        return {
            player: '',
            sessionId: 0,
            charmId: feltToNumber(eventData[0]),
            rarity: feltToNumber(eventData[1]),
            tokenId: feltToBigInt(eventData[2]) + (feltToBigInt(eventData[3]) << BigInt(128)),
        };
    } catch (e) {
        console.error('Failed to parse CharmMinted event:', e);
        return null;
    }
}

/**
 * Parse BibliaDiscarded event
 */
function parseBibliaDiscardedEvent(eventData: Array<string | bigint | number>): BibliaDiscardedEvent | null {
    if (!eventData || eventData.length < 1) return null;
    try {
        return {
            sessionId: 0,
            discarded: isTruthyFelt(eventData[0]),
        };
    } catch (e) {
        console.error('Failed to parse BibliaDiscarded event:', e);
        return null;
    }
}

function parseCashOutResolvedEvent(eventData: Array<string | bigint | number>): CashOutResolvedEvent | null {
    if (!eventData || eventData.length < 1) return null;
    try {
        return {
            sessionId: 0,
            succeeded: isTruthyFelt(eventData[0]),
        };
    } catch (e) {
        console.error('Failed to parse CashOutResolved event:', e);
        return null;
    }
}

export function hasParsedEvents(events: ParsedEvents): boolean {
    return Boolean(
        events.spinCompleted ||
        events.marketRefreshed ||
        events.relicActivated ||
        events.phantomActivated ||
        events.relicEquipped ||
        events.charmMinted ||
        events.bibliaDiscarded ||
        events.cashOutResolved ||
        events.itemsPurchased.length > 0 ||
        events.itemsSold.length > 0,
    );
}

function parseNormalizedEvents(
    events: RawEvent[],
    sourceAddresses?: string | string[],
): ParsedEvents {
    const result: ParsedEvents = {
        spinCompleted: null,
        itemsPurchased: [],
        itemsSold: [],
        marketRefreshed: null,
        relicActivated: null,
        phantomActivated: null,
        relicEquipped: null,
        charmMinted: null,
        bibliaDiscarded: null,
        cashOutResolved: null,
    };

    const allowedAddresses = sourceAddresses
        ? new Set(
            (Array.isArray(sourceAddresses) ? sourceAddresses : [sourceAddresses]).map((address) =>
                BigInt(address).toString(),
            ),
        )
        : null;

    const sourceList = Array.isArray(sourceAddresses) ? sourceAddresses : sourceAddresses ? [sourceAddresses] : [];
    const playAddress = normalizeAddress(sourceList[1]);
    const marketAddress = normalizeAddress(sourceList[2]);
    const relicAddress = normalizeAddress(sourceList[3]);

    for (const event of events) {
        if (allowedAddresses && event.fromAddress !== null && event.fromAddress !== undefined) {
            try {
                if (!allowedAddresses.has(BigInt(event.fromAddress).toString())) {
                    continue;
                }
            } catch {
                // If an address can't be normalized, keep going and try parsing by selector.
            }
        }

        if (findSelectorIndex(event.keys, EVENT_SELECTORS.SpinCompleted) >= 0) {
            result.spinCompleted = parseSpinCompletedEvent(event.data, event.keys);
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.ItemPurchased) >= 0) {
            const parsed = parseItemPurchasedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.ItemPurchased);
                result.itemsPurchased.push(parsed);
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.ItemSold) >= 0) {
            const parsed = parseItemSoldEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.ItemSold);
                result.itemsSold.push(parsed);
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.MarketRefreshed) >= 0) {
            const parsed = parseMarketRefreshedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.MarketRefreshed);
                result.marketRefreshed = parsed;
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.RelicActivated) >= 0) {
            const parsed = parseRelicActivatedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.RelicActivated);
                result.relicActivated = parsed;
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.PhantomActivated) >= 0) {
            const parsed = parsePhantomActivatedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.PhantomActivated);
                result.phantomActivated = parsed;
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.RelicEquipped) >= 0) {
            const parsed = parseRelicEquippedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.RelicEquipped);
                result.relicEquipped = parsed;
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.CharmMinted) >= 0) {
            const parsed = parseCharmMintedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.CharmMinted);
                result.charmMinted = parsed;
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.BibliaDiscarded) >= 0) {
            const parsed = parseBibliaDiscardedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.BibliaDiscarded);
                result.bibliaDiscarded = parsed;
            }
        } else if (findSelectorIndex(event.keys, EVENT_SELECTORS.CashOutResolved) >= 0) {
            const parsed = parseCashOutResolvedEvent(event.data);
            if (parsed) {
                parsed.sessionId = readSessionIdFromKeys(event.keys, EVENT_SELECTORS.CashOutResolved);
                result.cashOutResolved = parsed;
            }
        } else {
            const dojoEvent = unwrapDojoEventData(event.data);
            const emitterAddress = normalizeAddress(event.keys[2]);

            if (!dojoEvent || !emitterAddress) {
                continue;
            }

            if (emitterAddress === playAddress && dojoEvent.fieldValues.length === 30) {
                result.spinCompleted = parseSpinCompletedEvent(dojoEvent.fieldValues, dojoEvent.keyValues);
            } else if (emitterAddress === marketAddress && dojoEvent.fieldValues.length === 7) {
                const parsed = parseItemPurchasedEvent(dojoEvent.fieldValues);
                if (parsed) {
                    parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.ItemPurchased);
                    result.itemsPurchased.push(parsed);
                }
            } else if (emitterAddress === marketAddress && dojoEvent.fieldValues.length === 5) {
                const parsed = parseItemSoldEvent(dojoEvent.fieldValues);
                if (parsed) {
                    parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.ItemSold);
                    result.itemsSold.push(parsed);
                }
            } else if (
                (emitterAddress === marketAddress || emitterAddress === relicAddress) &&
                dojoEvent.fieldValues.length === 8
            ) {
                const parsed = parseMarketRefreshedEvent(dojoEvent.fieldValues);
                if (parsed) {
                    parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.MarketRefreshed);
                    result.marketRefreshed = parsed;
                }
            } else if (emitterAddress === relicAddress && dojoEvent.fieldValues.length === 4) {
                const maybeActivated = parseRelicActivatedEvent(dojoEvent.fieldValues);
                const maybeEquipped = parseRelicEquippedEvent(dojoEvent.fieldValues);

                if (maybeActivated && maybeActivated.effectType <= 16) {
                    maybeActivated.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.RelicActivated);
                    result.relicActivated = maybeActivated;
                } else if (maybeEquipped) {
                    maybeEquipped.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.RelicEquipped);
                    result.relicEquipped = maybeEquipped;
                }
            } else if (emitterAddress === relicAddress && dojoEvent.fieldValues.length === 2) {
                const parsed = parsePhantomActivatedEvent(dojoEvent.fieldValues);
                if (parsed) {
                    parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.PhantomActivated);
                    result.phantomActivated = parsed;
                }
            } else if (emitterAddress === playAddress && dojoEvent.fieldValues.length === 4) {
                const parsed = parseCharmMintedEvent(dojoEvent.fieldValues);
                if (parsed) {
                    parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.CharmMinted);
                    result.charmMinted = parsed;
                }
            } else if (emitterAddress === playAddress && dojoEvent.fieldValues.length === 1) {
                if (findSelectorIndex(dojoEvent.keyValues, EVENT_SELECTORS.CashOutResolved) >= 0) {
                    const parsed = parseCashOutResolvedEvent(dojoEvent.fieldValues);
                    if (parsed) {
                        parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.CashOutResolved);
                        result.cashOutResolved = parsed;
                    }
                } else {
                    const parsed = parseBibliaDiscardedEvent(dojoEvent.fieldValues);
                    if (parsed) {
                        parsed.sessionId = readSessionIdFromKeys(dojoEvent.keyValues, EVENT_SELECTORS.BibliaDiscarded);
                        result.bibliaDiscarded = parsed;
                    }
                }
            }
        }
    }

    return result;
}


/**
 * Parse all events from a transaction receipt
 */
export function parseReceiptEvents(
    receipt: any,
    sourceAddresses: string | string[] = CONTRACTS.ABYSS_GAME,
): ParsedEvents {
    const events = normalizeReceiptEvents(receipt);

    if (!events.length) {
        return {
            spinCompleted: null,
            itemsPurchased: [],
            itemsSold: [],
            marketRefreshed: null,
            relicActivated: null,
            phantomActivated: null,
            relicEquipped: null,
            charmMinted: null,
            bibliaDiscarded: null,
            cashOutResolved: null,
        };
    }

    const filtered = parseNormalizedEvents(events, sourceAddresses);
    if (hasParsedEvents(filtered)) {
        return filtered;
    }

    // Fallback: parse by selector across the whole receipt if the source address changed
    // or the upstream provider wrapped events in a way that obscured `from_address`.
    return parseNormalizedEvents(events);
}

export function summarizeReceiptEvents(receipt: any, maxEvents = 12): ReceiptEventSummary[] {
    return normalizeReceiptEvents(receipt)
        .slice(0, maxEvents)
        .map((event, index) => ({
            index,
            fromAddress:
                event.fromAddress === undefined || event.fromAddress === null
                    ? null
                    : feltToDebugString(event.fromAddress),
            keys: event.keys.slice(0, 6).map((key) => feltToDebugString(key)),
            dataPreview: event.data.slice(0, 8).map((value) => feltToDebugString(value)),
            dataLength: event.data.length,
        }));
}
