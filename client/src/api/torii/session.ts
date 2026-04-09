import type * as torii from "@dojoengine/torii-wasm";
import {
  BeastSessionsUsedModel,
  PlayerSessionEntryModel,
  SessionInventoryModel,
  SessionMarketModel,
  SessionModel,
  SpinResultModel,
  type BeastSessionsUsed,
  type PlayerSessionEntry,
  type RawBeastSessionsUsed,
  type RawPlayerSessionEntry,
  type RawSession,
  type RawSessionInventory,
  type RawSessionMarket,
  type RawSpinResult,
  type Session,
  type SessionInventory,
  type SessionMarket,
  type SpinResult,
} from "@/models";
import { buildModelQuery, modelKey, parseEntities } from "@/api/torii/helpers";
import { dedupeBy } from "@/models/shared";

export const SessionApi = {
  keys: {
    playerEntries: (address: string) => ["session-entries", address] as const,
    session: (sessionId: number) => ["session", sessionId] as const,
    spinResult: (sessionId: number) => ["spin-result", sessionId] as const,
    market: (sessionId: number) => ["session-market", sessionId] as const,
    inventory: (sessionId: number) => ["session-inventory", sessionId] as const,
    beastSessions: (address: string) => ["beast-sessions", address] as const,
  },
  playerEntriesQuery(address: string) {
    return buildModelQuery(
      PlayerSessionEntryModel.getModelName(),
      [address, undefined],
      256,
    );
  },
  sessionQuery(sessionId: number) {
    return buildModelQuery(SessionModel.getModelName(), [sessionId.toString()], 1);
  },
  spinResultQuery(sessionId: number) {
    return buildModelQuery(
      SpinResultModel.getModelName(),
      [sessionId.toString()],
      1,
    );
  },
  marketQuery(sessionId: number) {
    return buildModelQuery(
      SessionMarketModel.getModelName(),
      [sessionId.toString()],
      1,
    );
  },
  inventoryQuery(sessionId: number) {
    return buildModelQuery(
      SessionInventoryModel.getModelName(),
      [sessionId.toString(), undefined],
      256,
    );
  },
  beastSessionsQuery(address: string) {
    return buildModelQuery(
      BeastSessionsUsedModel.getModelName(),
      [address],
      1,
    );
  },
  parsePlayerEntries(entities: torii.Entity[]) {
    return dedupeBy(
      parseEntities(
        entities,
        modelKey(PlayerSessionEntryModel.getModelName()),
        (raw) => PlayerSessionEntryModel.parse(raw as RawPlayerSessionEntry),
      ),
      (item) => `${item.player}-${item.index}`,
    ).sort((left, right) => left.index - right.index);
  },
  parseSession(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(SessionModel.getModelName()),
      (raw) => SessionModel.parse(raw as RawSession),
    )[0];
  },
  parseSpinResult(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(SpinResultModel.getModelName()),
      (raw) => SpinResultModel.parse(raw as RawSpinResult),
    )[0];
  },
  parseMarket(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(SessionMarketModel.getModelName()),
      (raw) => SessionMarketModel.parse(raw as RawSessionMarket),
    )[0];
  },
  parseInventory(entities: torii.Entity[]) {
    return dedupeBy(
      parseEntities(
        entities,
        modelKey(SessionInventoryModel.getModelName()),
        (raw) => SessionInventoryModel.parse(raw as RawSessionInventory),
      ),
      (item) => `${item.sessionId}-${item.itemId}`,
    ).sort((left, right) => left.itemId - right.itemId);
  },
  parseBeastSessions(entities: torii.Entity[]) {
    return parseEntities(
      entities,
      modelKey(BeastSessionsUsedModel.getModelName()),
      (raw) => BeastSessionsUsedModel.parse(raw as RawBeastSessionsUsed),
    )[0];
  },
  async fetchPlayerEntries(
    client: torii.ToriiClient,
    address: string,
  ): Promise<PlayerSessionEntry[]> {
    const result = await client.getEntities(this.playerEntriesQuery(address).build());
    return this.parsePlayerEntries(result.items);
  },
  async fetchSession(
    client: torii.ToriiClient,
    sessionId: number,
  ): Promise<Session | undefined> {
    const result = await client.getEntities(this.sessionQuery(sessionId).build());
    return this.parseSession(result.items);
  },
  async fetchSpinResult(
    client: torii.ToriiClient,
    sessionId: number,
  ): Promise<SpinResult | null> {
    const result = await client.getEntities(this.spinResultQuery(sessionId).build());
    return this.parseSpinResult(result.items) ?? null;
  },
  async fetchMarket(
    client: torii.ToriiClient,
    sessionId: number,
  ): Promise<SessionMarket | undefined> {
    const result = await client.getEntities(this.marketQuery(sessionId).build());
    return this.parseMarket(result.items);
  },
  async fetchInventory(
    client: torii.ToriiClient,
    sessionId: number,
  ): Promise<SessionInventory[]> {
    const result = await client.getEntities(this.inventoryQuery(sessionId).build());
    return this.parseInventory(result.items).filter((item) => item.quantity > 0);
  },
  async fetchBeastSessionsUsed(
    client: torii.ToriiClient,
    address: string,
  ): Promise<BeastSessionsUsed | undefined> {
    const result = await client.getEntities(this.beastSessionsQuery(address).build());
    return this.parseBeastSessions(result.items);
  },
};
