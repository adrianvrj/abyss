import { initGrpcClient } from "@/api/torii/client";

type ChainLike = bigint | string | undefined | null;

// Bumped to 2 to wipe the leaderboard for a new season. When bumping again,
// keep this in sync with `LEADERBOARD_ID` in `dojo/src/systems/play.cairo`.
const LEADERBOARD_ID = Number(import.meta.env.VITE_LEADERBOARD_ID ?? "2");

type SqlValue = string | number | bigint | null | undefined;

type AggregatedRow = {
  player?: SqlValue;
  username?: SqlValue;
  session_id?: SqlValue;
  games_played?: SqlValue;
  best_score?: SqlValue;
  total_score?: SqlValue;
};

type InventoryRow = {
  session_id?: SqlValue;
  item_id?: SqlValue;
  quantity?: SqlValue;
};

type CharmLoadoutRow = {
  session_id?: SqlValue;
  charm_id_1?: SqlValue;
  charm_id_2?: SqlValue;
  charm_id_3?: SqlValue;
};

const TOP_LIMIT = 25;
export type LeaderboardWindow = "all-time" | "weekly";

export interface LeaderboardEntry {
  username: string;
  player: string;
  sessionId: number;
  gamesPlayed: number;
  gamesPlayedDay: number;
  gamesPlayedWeek: number;
  bestScore: number;
  bestScoreDay: number | null;
  bestScoreWeek: number | null;
  totalScore: number;
  totalScoreDay: number | null;
  totalScoreWeek: number | null;
  itemIds: number[];
  charmIds: number[];
}

function toNumberish(value: SqlValue): number {
  if (value == null || value === "") {
    return 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }

  const text = String(value).trim();
  if (!text) {
    return 0;
  }

  try {
    return Number(BigInt(text));
  } catch {
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

function toAddress(value: SqlValue): string {
  if (value == null || value === "") {
    return "";
  }

  const text = String(value);
  if (text.startsWith("0x")) {
    return text.toLowerCase();
  }

  try {
    return `0x${BigInt(text).toString(16)}`;
  } catch {
    return text.toLowerCase();
  }
}

function mapAggregated(rows: AggregatedRow[]): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];
  for (const row of rows) {
    const player = toAddress(row.player);
    if (!player) continue;
    entries.push({
      username: String(row.username ?? "").trim(),
      player,
      sessionId: toNumberish(row.session_id),
      gamesPlayed: toNumberish(row.games_played),
      gamesPlayedDay: 0,
      gamesPlayedWeek: 0,
      bestScore: toNumberish(row.best_score),
      bestScoreDay: null,
      bestScoreWeek: null,
      totalScore: toNumberish(row.total_score),
      totalScoreDay: null,
      totalScoreWeek: null,
      itemIds: [],
      charmIds: [],
    });
  }
  return entries;
}

function sessionIdPredicate(alias: string, sessionIds: number[]) {
  const values = new Set<string>();
  for (const id of sessionIds) {
    if (!Number.isFinite(id) || id <= 0) continue;
    values.add(String(id));
    values.add(`'${id}'`);
    values.add(`'0x${id.toString(16)}'`);
    values.add(`'0x${id.toString(16).padStart(64, "0")}'`);
  }
  return values.size > 0 ? `${alias}.session_id IN (${Array.from(values).join(",")})` : "1 = 0";
}

async function hydrateBuilds(
  client: ReturnType<typeof initGrpcClient>,
  entries: LeaderboardEntry[],
): Promise<LeaderboardEntry[]> {
  const sessionIds = Array.from(new Set(entries.map((entry) => entry.sessionId).filter((id) => id > 0)));
  if (sessionIds.length === 0) {
    return entries;
  }

  const inventoryBySession = new Map<number, number[]>();
  const charmBySession = new Map<number, number[]>();
  const predicate = sessionIdPredicate("s", sessionIds);

  try {
    const rows = (await client.executeSql(`
      SELECT s.session_id, s.item_id, s.quantity
      FROM "ABYSS-SessionInventory" AS s
      WHERE ${predicate};
    `)) as InventoryRow[];

    for (const row of rows) {
      const sessionId = toNumberish(row.session_id);
      const itemId = toNumberish(row.item_id);
      const quantity = toNumberish(row.quantity);
      if (sessionId <= 0 || itemId <= 0 || quantity <= 0) continue;
      const current = inventoryBySession.get(sessionId) ?? [];
      current.push(itemId);
      inventoryBySession.set(sessionId, current);
    }
  } catch (error) {
    console.warn("Leaderboard inventory hydration failed:", error);
  }

  try {
    const rows = (await client.executeSql(`
      SELECT s.session_id, s.charm_id_1, s.charm_id_2, s.charm_id_3
      FROM "ABYSS-SessionCharmLoadout" AS s
      WHERE ${predicate};
    `)) as CharmLoadoutRow[];

    for (const row of rows) {
      const sessionId = toNumberish(row.session_id);
      const charmIds = [
        toNumberish(row.charm_id_1),
        toNumberish(row.charm_id_2),
        toNumberish(row.charm_id_3),
      ].filter((id) => id > 0);
      if (sessionId <= 0 || charmIds.length === 0) continue;
      charmBySession.set(sessionId, charmIds);
    }
  } catch (error) {
    console.warn("Leaderboard charm loadout hydration failed:", error);
  }

  return entries.map((entry) => ({
    ...entry,
    itemIds: inventoryBySession.get(entry.sessionId) ?? [],
    charmIds: charmBySession.get(entry.sessionId) ?? [],
  }));
}

export const LeaderboardApi = {
  keys: {
    all: (chainId?: ChainLike, window: LeaderboardWindow = "all-time") =>
      ["leaderboard", chainId?.toString() ?? "default", window] as const,
  },
  async fetchAll(
    chainId?: ChainLike,
    window: LeaderboardWindow = "all-time",
  ): Promise<LeaderboardEntry[]> {
    const client = initGrpcClient(chainId);

    // Torii stores felt252 fields as zero-padded hex strings (e.g.
    // "0x000...0002"). Match any plausible encoding the indexer might use.
    const hexId = LEADERBOARD_ID.toString(16);
    const paddedHexId = `0x${hexId.padStart(64, "0")}`;
    const leaderboardIdMatch = `s.leaderboard_id IN (
      ${LEADERBOARD_ID},
      '${LEADERBOARD_ID}',
      '0x${hexId}',
      '${paddedHexId}'
    )`;
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const weekHex = `0x${sevenDaysAgo.toString(16)}`;
    const paddedWeekHex = `0x${sevenDaysAgo.toString(16).padStart(16, "0")}`;
    const leaderboardScoreWindowWhere = window === "weekly"
      ? `AND (
          (s.timestamp LIKE '0x%' AND (s.timestamp >= '${weekHex}' OR s.timestamp >= '${paddedWeekHex}'))
          OR (s.timestamp NOT LIKE '0x%' AND CAST(s.timestamp AS INTEGER) >= ${sevenDaysAgo})
        )`
      : "";
    const sessionWindowWhere = window === "weekly"
      ? `AND (
          (s.created_at LIKE '0x%' AND (s.created_at >= '${weekHex}' OR s.created_at >= '${paddedWeekHex}'))
          OR (s.created_at NOT LIKE '0x%' AND CAST(s.created_at AS INTEGER) >= ${sevenDaysAgo})
        )`
      : "";

    // Aggregate in SQL and only return the top players. This means the join
    // against `controllers` happens against a tiny grouped result instead of
    // every raw score row, and the network payload is ~LIMIT rows instead of
    // up to 500. Day/week breakdowns aren't needed by the current UI so we
    // skip them entirely — re-introduce per-row aggregation only if those
    // fields become consumed somewhere.
    // Note: `score` is a u64 which Torii stores as a 0x-prefixed,
    // zero-padded 16-char hex string. SQLite can't CAST that to an integer
    // (it would silently return 0), but for fixed-width zero-padded hex,
    // lexicographic comparison equals numeric comparison — so `MAX(score)`
    // on the raw text yields the highest score. We return it as text and
    // parse to a real number in JS via `toNumberish` (which handles hex).
    // `SUM` would require numeric values; the current UI doesn't render
    // `totalScore` for the top-N view, so we skip it here.
    const aggregatedQuery = `
      WITH ranked AS (
        SELECT
          lower(s.player) AS player_lc,
          s.game_id AS session_id,
          s.score AS best_score,
          COUNT(*) OVER (PARTITION BY lower(s.player)) AS games_played,
          ROW_NUMBER() OVER (
            PARTITION BY lower(s.player)
            ORDER BY s.score DESC, s.game_id DESC
          ) AS rank
        FROM "ABYSS-LeaderboardScore" AS s
        WHERE ${leaderboardIdMatch}
          ${leaderboardScoreWindowWhere}
      )
      SELECT
        ranked.player_lc AS player,
        c.username AS username,
        ranked.session_id,
        ranked.games_played,
        ranked.best_score,
        ranked.best_score AS total_score
      FROM ranked
      LEFT JOIN controllers AS c ON lower(c.address) = ranked.player_lc
      WHERE ranked.rank = 1
        ORDER BY best_score DESC, games_played DESC
      LIMIT ${TOP_LIMIT};
    `;

    try {
      const rows = (await client.executeSql(aggregatedQuery)) as AggregatedRow[];
      if (rows.length > 0) {
        return hydrateBuilds(client, mapAggregated(rows));
      }
    } catch (error) {
      console.warn("LeaderboardScore SQL unavailable, falling back to Session rows:", error);
    }

    // u32 fields are usually stored as plain integers by Torii, but use
    // MAX on the raw value so we work regardless of encoding (text MAX of
    // zero-padded hex still sorts correctly).
    const sessionsQuery = `
      WITH ranked AS (
        SELECT
          lower(s.player_address) AS player_lc,
          s.session_id,
          s.total_score AS best_score,
          COUNT(*) OVER (PARTITION BY lower(s.player_address)) AS games_played,
          ROW_NUMBER() OVER (
            PARTITION BY lower(s.player_address)
            ORDER BY s.total_score DESC, s.session_id DESC
          ) AS rank
        FROM "ABYSS-Session" AS s
        WHERE s.total_score IS NOT NULL
          ${sessionWindowWhere}
      )
      SELECT
        ranked.player_lc AS player,
        c.username AS username,
        ranked.session_id,
        ranked.games_played,
        ranked.best_score,
        ranked.best_score AS total_score
      FROM ranked
      LEFT JOIN controllers AS c ON lower(c.address) = ranked.player_lc
      WHERE ranked.rank = 1
        ORDER BY best_score DESC, games_played DESC
      LIMIT ${TOP_LIMIT};
    `;

    const rows = (await client.executeSql(sessionsQuery)) as AggregatedRow[];
    return hydrateBuilds(client, mapAggregated(rows));
  },
};
