import type * as torii from "@dojoengine/torii-wasm";
import { ConfigModel, type Config, type RawConfig } from "@/models";
import { buildModelQuery, modelKey, parseEntities } from "@/api/torii/helpers";

export const ConfigApi = {
  keys: {
    singleton: () => ["config"] as const,
  },
  query() {
    return buildModelQuery(ConfigModel.getModelName(), ["0"], 1);
  },
  parse(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(ConfigModel.getModelName()),
      (raw) => ConfigModel.parse(raw as RawConfig),
    )[0];
  },
  async fetch(client: torii.ToriiClient): Promise<Config | undefined> {
    const result = await client.getEntities(this.query().build());
    return this.parse(result.items);
  },
};

