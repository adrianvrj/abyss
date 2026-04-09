import type * as torii from "@dojoengine/torii-wasm";

function normalizeEntities(raw: Record<string, unknown>): torii.Entity[] {
  const maybeResult = raw as { data?: torii.Entity[]; error?: Error };

  if (maybeResult.error) {
    return [];
  }
  if (Array.isArray(maybeResult.data)) {
    return maybeResult.data;
  }
  if (raw && typeof raw === "object" && "hashed_keys" in raw) {
    return [raw as unknown as torii.Entity];
  }
  return [];
}

export async function subscribeEntities(
  client: torii.ToriiClient,
  clause: torii.Clause | undefined,
  callback: (entities: torii.Entity[]) => void,
) {
  return client.onEntityUpdated(clause, [], (raw: Record<string, unknown>) => {
    const entities = normalizeEntities(raw);
    if (entities.length > 0) {
      callback(entities);
    }
  });
}

