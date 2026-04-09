import type * as torii from "@dojoengine/torii-wasm";
import { ItemModel, type Item, type RawItem } from "@/models";
import { buildModelQuery, modelKey, parseEntities } from "@/api/torii/helpers";
import { dedupeBy } from "@/models/shared";

const itemCache = new Map<number, Item>();

export const ItemApi = {
  keys: {
    byId: (itemId: number) => ["item", itemId] as const,
  },
  byIdQuery(itemId: number) {
    return buildModelQuery(ItemModel.getModelName(), [itemId.toString()], 1);
  },
  parse(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(ItemModel.getModelName()),
      (raw) => ItemModel.parse(raw as RawItem),
    );
  },
  parseOne(entities: torii.Entity[], itemId: number) {
    return this.parse(entities).find((item) => item.itemId === itemId);
  },
  async fetch(client: torii.ToriiClient, itemId: number) {
    const cached = itemCache.get(itemId);
    if (cached) {
      return cached;
    }

    const result = await client.getEntities(this.byIdQuery(itemId).build());
    const item = this.parseOne(result.items, itemId);
    if (item) {
      itemCache.set(itemId, item);
    }
    return item;
  },
  async fetchMany(client: torii.ToriiClient, itemIds: number[]) {
    const items = await Promise.all(itemIds.map((itemId) => this.fetch(client, itemId)));
    return dedupeBy(
      items.filter((item): item is Item => Boolean(item)),
      (item) => item.itemId,
    );
  },
};

