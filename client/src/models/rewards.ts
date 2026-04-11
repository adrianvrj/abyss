import {
  type PrimitiveValue,
  dedupeBy,
  toAddress,
  toBigInt,
  toBoolean,
  toNumber,
} from "@/models/shared";

export const PRIZE_POOL_MODEL_NAME = "PrizePool";
export const PRIZE_TOKEN_MODEL_NAME = "PrizeToken";
export const PRIZE_CLAIMED_MODEL_NAME = "PrizeClaimed";

export interface RawPrizePool {
  world_resource: PrimitiveValue<string>;
  pool_amount: PrimitiveValue<string>;
  prizes_distributed: PrimitiveValue<boolean | string>;
  prize_tokens_count: PrimitiveValue<string>;
}

export interface PrizePool {
  worldResource: string;
  poolAmount: bigint;
  prizesDistributed: boolean;
  prizeTokensCount: number;
}

export interface RawPrizeToken {
  index: PrimitiveValue<string>;
  token_address: PrimitiveValue<string>;
}

export interface PrizeToken {
  index: number;
  tokenAddress: string;
}

export interface RawPrizeClaimed {
  player: PrimitiveValue<string>;
  claimed: PrimitiveValue<boolean | string>;
}

export interface PrizeClaimed {
  player: string;
  claimed: boolean;
}

export interface PrizeTokenBalance {
  tokenAddress: string;
  balance: bigint;
  symbol: string;
}

export const PrizePoolModel = {
  getModelName() {
    return PRIZE_POOL_MODEL_NAME;
  },
  parse(data: RawPrizePool | undefined | null): PrizePool | undefined {
    if (!data) {
      return undefined;
    }

    return {
      worldResource: `0x${toBigInt(data.world_resource).toString(16)}`,
      poolAmount: toBigInt(data.pool_amount),
      prizesDistributed: toBoolean(data.prizes_distributed),
      prizeTokensCount: toNumber(data.prize_tokens_count),
    };
  },
};

export const PrizeTokenModel = {
  getModelName() {
    return PRIZE_TOKEN_MODEL_NAME;
  },
  parse(data: RawPrizeToken | undefined | null): PrizeToken | undefined {
    if (!data) {
      return undefined;
    }

    return {
      index: toNumber(data.index),
      tokenAddress: toAddress(data.token_address),
    };
  },
  dedupe(items: PrizeToken[]) {
    return dedupeBy(items, (item) => item.index).sort(
      (left, right) => left.index - right.index,
    );
  },
};

export const PrizeClaimedModel = {
  getModelName() {
    return PRIZE_CLAIMED_MODEL_NAME;
  },
  parse(data: RawPrizeClaimed | undefined | null): PrizeClaimed | undefined {
    if (!data) {
      return undefined;
    }

    return {
      player: toAddress(data.player),
      claimed: toBoolean(data.claimed),
    };
  },
};
