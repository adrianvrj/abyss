import type * as torii from "@dojoengine/torii-wasm";
import {
  PrizeClaimedModel,
  PrizePoolModel,
  PrizeTokenModel,
  type PrizeClaimed,
  type PrizePool,
  type PrizeToken,
  type RawPrizeClaimed,
  type RawPrizePool,
  type RawPrizeToken,
} from "@/models";
import { buildModelQuery, modelKey, parseEntities } from "@/api/torii/helpers";

export const RewardsApi = {
  keys: {
    prizePool: () => ["prize-pool"] as const,
    prizeTokens: () => ["prize-tokens"] as const,
    claimed: (address: string) => ["prize-claimed", address] as const,
  },
  prizePoolQuery() {
    return buildModelQuery(PrizePoolModel.getModelName(), ["0"], 1);
  },
  prizeTokensQuery() {
    return buildModelQuery(PrizeTokenModel.getModelName(), [undefined], 64);
  },
  claimedQuery(address: string) {
    return buildModelQuery(PrizeClaimedModel.getModelName(), [address], 1);
  },
  parsePrizePool(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(PrizePoolModel.getModelName()),
      (raw) => PrizePoolModel.parse(raw as RawPrizePool),
    )[0];
  },
  parsePrizeTokens(entities: torii.Entity[]) {
    return PrizeTokenModel.dedupe(
      parseEntities(
        entities,
        modelKey(PrizeTokenModel.getModelName()),
        (raw) => PrizeTokenModel.parse(raw as RawPrizeToken),
      ),
    );
  },
  parseClaimed(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(PrizeClaimedModel.getModelName()),
      (raw) => PrizeClaimedModel.parse(raw as RawPrizeClaimed),
    )[0];
  },
  async fetchPrizePool(client: torii.ToriiClient): Promise<PrizePool | undefined> {
    const result = await client.getEntities(this.prizePoolQuery().build());
    return this.parsePrizePool(result.items);
  },
  async fetchPrizeTokens(client: torii.ToriiClient): Promise<PrizeToken[]> {
    const result = await client.getEntities(this.prizeTokensQuery().build());
    return this.parsePrizeTokens(result.items);
  },
  async fetchClaimed(
    client: torii.ToriiClient,
    address: string,
  ): Promise<PrizeClaimed | undefined> {
    const result = await client.getEntities(this.claimedQuery(address).build());
    return this.parseClaimed(result.items);
  },
};
