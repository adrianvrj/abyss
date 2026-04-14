import {
  type PrimitiveValue,
  toAddress,
  toBigInt,
  toNumber,
} from "@/models/shared";

export const CONFIG_MODEL_NAME = "Config";

export interface RawConfig {
  world_resource: PrimitiveValue<string>;
  admin: PrimitiveValue<string>;
  vrf: PrimitiveValue<string>;
  pragma_oracle: PrimitiveValue<string>;
  quote_token: PrimitiveValue<string>;
  chip_token: PrimitiveValue<string>;
  charm_nft: PrimitiveValue<string>;
  relic_nft: PrimitiveValue<string>;
  beast_nft: PrimitiveValue<string>;
  treasury: PrimitiveValue<string>;
  team: PrimitiveValue<string>;
  seven_points: PrimitiveValue<string>;
  seven_prob: PrimitiveValue<string>;
  diamond_points: PrimitiveValue<string>;
  diamond_prob: PrimitiveValue<string>;
  cherry_points: PrimitiveValue<string>;
  cherry_prob: PrimitiveValue<string>;
  coin_points: PrimitiveValue<string>;
  coin_prob: PrimitiveValue<string>;
  lemon_points: PrimitiveValue<string>;
  lemon_prob: PrimitiveValue<string>;
  six_points: PrimitiveValue<string>;
  six_prob: PrimitiveValue<string>;
  pattern_h3_mult: PrimitiveValue<string>;
  pattern_h4_mult: PrimitiveValue<string>;
  pattern_h5_mult: PrimitiveValue<string>;
  pattern_v3_mult: PrimitiveValue<string>;
  pattern_d3_mult: PrimitiveValue<string>;
  probability_666: PrimitiveValue<string>;
  chip_emission_rate: PrimitiveValue<string>;
  chip_boost_multiplier: PrimitiveValue<string>;
  entry_price_usd: PrimitiveValue<string>;
  total_sessions: PrimitiveValue<string>;
  total_competitive_sessions: PrimitiveValue<string>;
  total_items: PrimitiveValue<string>;
}

export interface Config {
  worldResource: string;
  admin: string;
  vrf: string;
  pragmaOracle: string;
  quoteToken: string;
  chipToken: string;
  charmNft: string;
  relicNft: string;
  beastNft: string;
  treasury: string;
  team: string;
  sevenPoints: number;
  sevenProbability: number;
  diamondPoints: number;
  diamondProbability: number;
  cherryPoints: number;
  cherryProbability: number;
  coinPoints: number;
  coinProbability: number;
  lemonPoints: number;
  lemonProbability: number;
  sixPoints: number;
  sixProbability: number;
  patternH3Multiplier: number;
  patternH4Multiplier: number;
  patternH5Multiplier: number;
  patternV3Multiplier: number;
  patternD3Multiplier: number;
  probability666: number;
  chipEmissionRate: number;
  chipBoostMultiplier: number;
  entryPriceUsd: bigint;
  totalSessions: number;
  totalCompetitiveSessions: number;
  totalItems: number;
}

export const ConfigModel = {
  getModelName() {
    return CONFIG_MODEL_NAME;
  },
  parse(data: RawConfig | undefined | null): Config | undefined {
    if (!data) {
      return undefined;
    }

    return {
      worldResource: `0x${toBigInt(data.world_resource).toString(16)}`,
      admin: toAddress(data.admin),
      vrf: toAddress(data.vrf),
      pragmaOracle: toAddress(data.pragma_oracle),
      quoteToken: toAddress(data.quote_token),
      chipToken: toAddress(data.chip_token),
      charmNft: toAddress(data.charm_nft),
      relicNft: toAddress(data.relic_nft),
      beastNft: toAddress(data.beast_nft),
      treasury: toAddress(data.treasury),
      team: toAddress(data.team),
      sevenPoints: toNumber(data.seven_points),
      sevenProbability: toNumber(data.seven_prob),
      diamondPoints: toNumber(data.diamond_points),
      diamondProbability: toNumber(data.diamond_prob),
      cherryPoints: toNumber(data.cherry_points),
      cherryProbability: toNumber(data.cherry_prob),
      coinPoints: toNumber(data.coin_points),
      coinProbability: toNumber(data.coin_prob),
      lemonPoints: toNumber(data.lemon_points),
      lemonProbability: toNumber(data.lemon_prob),
      sixPoints: toNumber(data.six_points),
      sixProbability: toNumber(data.six_prob),
      patternH3Multiplier: toNumber(data.pattern_h3_mult),
      patternH4Multiplier: toNumber(data.pattern_h4_mult),
      patternH5Multiplier: toNumber(data.pattern_h5_mult),
      patternV3Multiplier: toNumber(data.pattern_v3_mult),
      patternD3Multiplier: toNumber(data.pattern_d3_mult),
      probability666: toNumber(data.probability_666),
      chipEmissionRate: toNumber(data.chip_emission_rate),
      chipBoostMultiplier: toNumber(data.chip_boost_multiplier),
      entryPriceUsd: toBigInt(data.entry_price_usd),
      totalSessions: toNumber(data.total_sessions),
      totalCompetitiveSessions: toNumber(data.total_competitive_sessions),
      totalItems: toNumber(data.total_items),
    };
  },
};
