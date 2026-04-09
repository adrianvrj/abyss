import type * as torii from "@dojoengine/torii-wasm";
import {
  LeaderboardEntryModel,
  type LeaderboardEntry,
  type RawLeaderboardEntry,
} from "@/models";
import { buildModelQuery, modelKey, parseEntities } from "@/api/torii/helpers";

export const LeaderboardApi = {
  keys: {
    all: () => ["leaderboard"] as const,
  },
  query() {
    return buildModelQuery(LeaderboardEntryModel.getModelName(), [undefined], 64);
  },
  parse(entities: torii.Entity[]) {
    return LeaderboardEntryModel.dedupe(
      parseEntities(
        entities,
        modelKey(LeaderboardEntryModel.getModelName()),
        (raw) => LeaderboardEntryModel.parse(raw as RawLeaderboardEntry),
      ),
    );
  },
  async fetchAll(client: torii.ToriiClient): Promise<LeaderboardEntry[]> {
    const result = await client.getEntities(this.query().build());
    return this.parse(result.items);
  },
};

