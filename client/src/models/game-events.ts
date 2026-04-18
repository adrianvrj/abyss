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

export interface ParsedGameEvents {
  spinCompleted: SpinCompletedEvent | null;
  itemsPurchased: ItemPurchasedEvent[];
  itemsSold: ItemSoldEvent[];
  marketRefreshed: MarketRefreshedEvent | null;
  relicActivated: RelicActivatedEvent | null;
  relicEquipped: RelicEquippedEvent | null;
  charmMinted: CharmMintedEvent | null;
  bibliaDiscarded: BibliaDiscardedEvent | null;
  cashOutResolved: CashOutResolvedEvent | null;
}
