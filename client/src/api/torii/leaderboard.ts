import { initGrpcClient } from "@/api/torii/client";

type ChainLike = bigint | string | undefined | null;

// Bumped to 2 to wipe the leaderboard for a new season. When bumping again,
// keep this in sync with `LEADERBOARD_ID` in `dojo/src/systems/play.cairo`.
const LEADERBOARD_ID = Number(import.meta.env.VITE_LEADERBOARD_ID ?? "2");

type SqlValue = string | number | bigint | null | undefined;

type AggregatedRow = {
  player?: SqlValue;
  username?: SqlValue;
  games_played?: SqlValue;
  best_score?: SqlValue;
  total_score?: SqlValue;
};

const TOP_LIMIT = 25;

export interface LeaderboardEntry {
  username: string;
  player: string;
  gamesPlayed: number;
  gamesPlayedDay: number;
  gamesPlayedWeek: number;
  bestScore: number;
  bestScoreDay: number | null;
  bestScoreWeek: number | null;
  totalScore: number;
  totalScoreDay: number | null;
  totalScoreWeek: number | null;
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
      gamesPlayed: toNumberish(row.games_played),
      gamesPlayedDay: 0,
      gamesPlayedWeek: 0,
      bestScore: toNumberish(row.best_score),
      bestScoreDay: null,
      bestScoreWeek: null,
      totalScore: toNumberish(row.total_score),
      totalScoreDay: null,
      totalScoreWeek: null,
    });
  }
  return entries;
}

export const LeaderboardApi = {
  keys: {
    all: (chainId?: ChainLike) => ["leaderboard", chainId?.toString() ?? "default"] as const,
  },
  async fetchAll(chainId?: ChainLike): Promise<LeaderboardEntry[]> {
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
      WITH agg AS (
        SELECT
          lower(s.player) AS player_lc,
          COUNT(*) AS games_played,
          MAX(s.score) AS best_score
        FROM "ABYSS-LeaderboardScore" AS s
        WHERE ${leaderboardIdMatch}
        GROUP BY lower(s.player)
        ORDER BY best_score DESC, games_played DESC
        LIMIT ${TOP_LIMIT}
      )
      SELECT
        agg.player_lc AS player,
        c.username AS username,
        agg.games_played,
        agg.best_score,
        agg.best_score AS total_score
      FROM agg
      LEFT JOIN controllers AS c ON lower(c.address) = agg.player_lc
      ORDER BY agg.best_score DESC, agg.games_played DESC;
    `;

    try {
      const rows = (await client.executeSql(aggregatedQuery)) as AggregatedRow[];
      if (rows.length > 0) {
        return mapAggregated(rows);
      }
    } catch (error) {
      console.warn("LeaderboardScore SQL unavailable, falling back to Session rows:", error);
    }

    // u32 fields are usually stored as plain integers by Torii, but use
    // MAX on the raw value so we work regardless of encoding (text MAX of
    // zero-padded hex still sorts correctly).
    const sessionsQuery = `
      WITH agg AS (
        SELECT
          lower(s.player_address) AS player_lc,
          COUNT(*) AS games_played,
          MAX(s.total_score) AS best_score
        FROM "ABYSS-Session" AS s
        WHERE s.total_score IS NOT NULL
        GROUP BY lower(s.player_address)
        ORDER BY best_score DESC, games_played DESC
        LIMIT ${TOP_LIMIT}
      )
      SELECT
        agg.player_lc AS player,
        c.username AS username,
        agg.games_played,
        agg.best_score,
        agg.best_score AS total_score
      FROM agg
      LEFT JOIN controllers AS c ON lower(c.address) = agg.player_lc
      ORDER BY agg.best_score DESC, agg.games_played DESC;
    `;

    const rows = (await client.executeSql(sessionsQuery)) as AggregatedRow[];
    return mapAggregated(rows);
  },
};
