import {
  type PrimitiveValue,
  toAddress,
  toBigInt,
  toBoolean,
  toNumber,
} from "@/models/shared";

export const SESSION_MODEL_NAME = "Session";
export const SPIN_RESULT_MODEL_NAME = "SpinResult";
export const SESSION_MARKET_MODEL_NAME = "SessionMarket";
export const SESSION_INVENTORY_MODEL_NAME = "SessionInventory";
export const PLAYER_SESSION_ENTRY_MODEL_NAME = "PlayerSessionEntry";
export const BEAST_SESSIONS_USED_MODEL_NAME = "BeastSessionsUsed";

export interface RawSession {
  session_id: PrimitiveValue<string>;
  player_address: PrimitiveValue<string>;
  level: PrimitiveValue<string>;
  score: PrimitiveValue<string>;
  total_score: PrimitiveValue<string>;
  spins_remaining: PrimitiveValue<string>;
  is_competitive: PrimitiveValue<boolean | string>;
  is_active: PrimitiveValue<boolean | string>;
  created_at: PrimitiveValue<string>;
  chips_claimed: PrimitiveValue<boolean | string>;
  equipped_relic: PrimitiveValue<string>;
  relic_last_used_spin: PrimitiveValue<string>;
  relic_pending_effect: PrimitiveValue<string>;
  total_spins: PrimitiveValue<string>;
  luck: PrimitiveValue<string>;
  blocked_666_this_session: PrimitiveValue<boolean | string>;
  tickets: PrimitiveValue<string>;
  score_seven: PrimitiveValue<string>;
  score_diamond: PrimitiveValue<string>;
  score_cherry: PrimitiveValue<string>;
  score_coin: PrimitiveValue<string>;
  score_lemon: PrimitiveValue<string>;
}

export interface Session {
  sessionId: number;
  playerAddress: string;
  level: number;
  score: number;
  totalScore: number;
  spinsRemaining: number;
  isCompetitive: boolean;
  isActive: boolean;
  createdAt: number;
  chipsClaimed: boolean;
  equippedRelic: bigint;
  relicLastUsedSpin: number;
  relicPendingEffect: number;
  totalSpins: number;
  luck: number;
  blocked666ThisSession: boolean;
  tickets: number;
  symbolScores: [number, number, number, number, number];
}

export interface RawSpinResult {
  session_id: PrimitiveValue<string>;
  cell_0: PrimitiveValue<string>;
  cell_1: PrimitiveValue<string>;
  cell_2: PrimitiveValue<string>;
  cell_3: PrimitiveValue<string>;
  cell_4: PrimitiveValue<string>;
  cell_5: PrimitiveValue<string>;
  cell_6: PrimitiveValue<string>;
  cell_7: PrimitiveValue<string>;
  cell_8: PrimitiveValue<string>;
  cell_9: PrimitiveValue<string>;
  cell_10: PrimitiveValue<string>;
  cell_11: PrimitiveValue<string>;
  cell_12: PrimitiveValue<string>;
  cell_13: PrimitiveValue<string>;
  cell_14: PrimitiveValue<string>;
  score: PrimitiveValue<string>;
  patterns_count: PrimitiveValue<string>;
  is_666: PrimitiveValue<boolean | string>;
  is_jackpot: PrimitiveValue<boolean | string>;
  is_pending: PrimitiveValue<boolean | string>;
  biblia_used: PrimitiveValue<boolean | string>;
}

export interface SpinResult {
  sessionId: number;
  grid: number[];
  score: number;
  patternsCount: number;
  is666: boolean;
  isJackpot: boolean;
  isPending: boolean;
  bibliaUsed: boolean;
}

export interface RawSessionMarket {
  session_id: PrimitiveValue<string>;
  refresh_count: PrimitiveValue<string>;
  item_slot_1: PrimitiveValue<string>;
  item_slot_2: PrimitiveValue<string>;
  item_slot_3: PrimitiveValue<string>;
  item_slot_4: PrimitiveValue<string>;
  item_slot_5: PrimitiveValue<string>;
  item_slot_6: PrimitiveValue<string>;
}

export interface SessionMarket {
  sessionId: number;
  refreshCount: number;
  slots: [number, number, number, number, number, number];
}

export interface RawSessionInventory {
  session_id: PrimitiveValue<string>;
  item_id: PrimitiveValue<string>;
  quantity: PrimitiveValue<string>;
}

export interface SessionInventory {
  sessionId: number;
  itemId: number;
  quantity: number;
}

export interface RawPlayerSessionEntry {
  player: PrimitiveValue<string>;
  index: PrimitiveValue<string>;
  session_id: PrimitiveValue<string>;
}

export interface PlayerSessionEntry {
  player: string;
  index: number;
  sessionId: number;
}

export interface RawBeastSessionsUsed {
  player: PrimitiveValue<string>;
  count: PrimitiveValue<string>;
}

export interface BeastSessionsUsed {
  player: string;
  count: number;
}

export const SessionModel = {
  getModelName() {
    return SESSION_MODEL_NAME;
  },
  parse(data: RawSession | undefined | null): Session | undefined {
    if (!data) {
      return undefined;
    }

    return {
      sessionId: toNumber(data.session_id),
      playerAddress: toAddress(data.player_address),
      level: toNumber(data.level),
      score: toNumber(data.score),
      totalScore: toNumber(data.total_score),
      spinsRemaining: toNumber(data.spins_remaining),
      isCompetitive: toBoolean(data.is_competitive),
      isActive: toBoolean(data.is_active),
      createdAt: toNumber(data.created_at),
      chipsClaimed: toBoolean(data.chips_claimed),
      equippedRelic: toBigInt(data.equipped_relic),
      relicLastUsedSpin: toNumber(data.relic_last_used_spin),
      relicPendingEffect: toNumber(data.relic_pending_effect),
      totalSpins: toNumber(data.total_spins),
      luck: toNumber(data.luck),
      blocked666ThisSession: toBoolean(data.blocked_666_this_session),
      tickets: toNumber(data.tickets),
      symbolScores: [
        toNumber(data.score_seven),
        toNumber(data.score_diamond),
        toNumber(data.score_cherry),
        toNumber(data.score_coin),
        toNumber(data.score_lemon),
      ],
    };
  },
};

export const SpinResultModel = {
  getModelName() {
    return SPIN_RESULT_MODEL_NAME;
  },
  parse(data: RawSpinResult | undefined | null): SpinResult | undefined {
    if (!data) {
      return undefined;
    }

    return {
      sessionId: toNumber(data.session_id),
      grid: [
        toNumber(data.cell_0),
        toNumber(data.cell_1),
        toNumber(data.cell_2),
        toNumber(data.cell_3),
        toNumber(data.cell_4),
        toNumber(data.cell_5),
        toNumber(data.cell_6),
        toNumber(data.cell_7),
        toNumber(data.cell_8),
        toNumber(data.cell_9),
        toNumber(data.cell_10),
        toNumber(data.cell_11),
        toNumber(data.cell_12),
        toNumber(data.cell_13),
        toNumber(data.cell_14),
      ],
      score: toNumber(data.score),
      patternsCount: toNumber(data.patterns_count),
      is666: toBoolean(data.is_666),
      isJackpot: toBoolean(data.is_jackpot),
      isPending: toBoolean(data.is_pending),
      bibliaUsed: toBoolean(data.biblia_used),
    };
  },
};

export const SessionMarketModel = {
  getModelName() {
    return SESSION_MARKET_MODEL_NAME;
  },
  parse(data: RawSessionMarket | undefined | null): SessionMarket | undefined {
    if (!data) {
      return undefined;
    }

    return {
      sessionId: toNumber(data.session_id),
      refreshCount: toNumber(data.refresh_count),
      slots: [
        toNumber(data.item_slot_1),
        toNumber(data.item_slot_2),
        toNumber(data.item_slot_3),
        toNumber(data.item_slot_4),
        toNumber(data.item_slot_5),
        toNumber(data.item_slot_6),
      ],
    };
  },
};

export const SessionInventoryModel = {
  getModelName() {
    return SESSION_INVENTORY_MODEL_NAME;
  },
  parse(data: RawSessionInventory | undefined | null): SessionInventory | undefined {
    if (!data) {
      return undefined;
    }

    return {
      sessionId: toNumber(data.session_id),
      itemId: toNumber(data.item_id),
      quantity: toNumber(data.quantity),
    };
  },
};

export const PlayerSessionEntryModel = {
  getModelName() {
    return PLAYER_SESSION_ENTRY_MODEL_NAME;
  },
  parse(
    data: RawPlayerSessionEntry | undefined | null,
  ): PlayerSessionEntry | undefined {
    if (!data) {
      return undefined;
    }

    return {
      player: toAddress(data.player),
      index: toNumber(data.index),
      sessionId: toNumber(data.session_id),
    };
  },
};

export const BeastSessionsUsedModel = {
  getModelName() {
    return BEAST_SESSIONS_USED_MODEL_NAME;
  },
  parse(
    data: RawBeastSessionsUsed | undefined | null,
  ): BeastSessionsUsed | undefined {
    if (!data) {
      return undefined;
    }

    return {
      player: toAddress(data.player),
      count: toNumber(data.count),
    };
  },
};

