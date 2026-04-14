import { ClauseBuilder, ToriiQueryBuilder } from "@dojoengine/sdk";
import type * as torii from "@dojoengine/torii-wasm";
import { NAMESPACE } from "@/config";

export const DEFAULT_QUERY_LIMIT = 10_000;

export function modelKey(modelName: string) {
  return `${NAMESPACE}-${modelName}` as `${string}-${string}`;
}

export function buildModelQuery(
  modelName: string,
  keys: Array<string | undefined>,
  limit: number = DEFAULT_QUERY_LIMIT,
) {
  const clause = new ClauseBuilder().keys(
    [modelKey(modelName)],
    keys,
    "FixedLen",
  );

  return new ToriiQueryBuilder()
    .withClause(clause.build())
    .includeHashedKeys()
    .withLimit(limit);
}

export function parseEntities<T>(
  entities: torii.Entity[],
  key: string,
  parser: (data: unknown) => T | undefined,
) {
  const parsed: T[] = [];

  for (const entity of entities) {
    const raw = entity.models[key];
    if (!raw) {
      continue;
    }

    const value = parser(raw);
    if (value) {
      parsed.push(value);
    }
  }

  return parsed;
}

