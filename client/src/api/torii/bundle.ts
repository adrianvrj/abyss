import type * as torii from "@dojoengine/torii-wasm";
import { Bundle, type RawBundle } from "@/models/bundle";
import { buildModelQuery, modelKey, parseEntities } from "@/api/torii/helpers";

export const BundleApi = {
  keys: {
    all: () => ["bundles"] as const,
  },
  query() {
    return buildModelQuery(Bundle.getModelName(), [undefined], 256);
  },
  parse(entities: torii.Entity[]) {
    return Bundle.dedupe(
      parseEntities(
        entities,
        modelKey(Bundle.getModelName()),
        (raw) => Bundle.parse(raw as RawBundle),
      ),
    ).sort((left, right) => left.id - right.id);
  },
  async fetchAll(client: torii.ToriiClient) {
    const result = await client.getEntities(this.query().build());
    return this.parse(result.items);
  },
};

