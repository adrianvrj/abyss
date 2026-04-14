import { initGrpcClient } from "@/api/torii/client";

type ChainLike = bigint | string | undefined | null;

type SqlValue = string | number | bigint | null | undefined;

type RawLeaderboardScoreRow = {
  leaderboard_id?: SqlValue;
  username?: SqlValue;
  player?: SqlValue;
  game_id?: SqlValue;
  score?: SqlValue;
  timestamp?: SqlValue;
  internal_executed_at?: SqlValue;
};

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

function isSameDay(date: Date, now: Date) {
  return date.getUTCFullYear() === now.getUTCFullYear()
    && date.getUTCMonth() === now.getUTCMonth()
    && date.getUTCDate() === now.getUTCDate();
}

function getWeekKey(date: Date) {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const days = Math.floor((date.getTime() - firstDay.getTime()) / 86_400_000);
  return `${date.getUTCFullYear()}-${Math.floor((days + firstDay.getUTCDay()) / 7)}`;
}

function getExecutedDate(row: RawLeaderboardScoreRow) {
  const executedAt = row.internal_executed_at ? String(row.internal_executed_at) : "";
  const parsedExecutedAt = executedAt ? new Date(executedAt) : undefined;
  if (parsedExecutedAt && !Number.isNaN(parsedExecutedAt.getTime())) {
    return parsedExecutedAt;
  }

  const timestamp = toNumberish(row.timestamp);
  if (timestamp > 0) {
    return new Date(timestamp * 1000);
  }

  return undefined;
}

function aggregate(rows: RawLeaderboardScoreRow[]): LeaderboardEntry[] {
  const now = new Date();
  const currentWeek = getWeekKey(now);
  const entries = new Map<string, LeaderboardEntry>();

  for (const row of rows) {
    const player = toAddress(row.player);
    if (!player) {
      continue;
    }

    const score = toNumberish(row.score);
    const date = getExecutedDate(row);
    const isToday = date ? isSameDay(date, now) : false;
    const isThisWeek = date ? getWeekKey(date) === currentWeek : false;

    const current = entries.get(player) ?? {
      username: String(row.username || ""),
      player,
      gamesPlayed: 0,
      gamesPlayedDay: 0,
      gamesPlayedWeek: 0,
      bestScore: 0,
      bestScoreDay: null,
      bestScoreWeek: null,
      totalScore: 0,
      totalScoreDay: null,
      totalScoreWeek: null,
    };

    if (!current.username && row.username) {
      current.username = String(row.username);
    }

    current.gamesPlayed += 1;
    current.bestScore = Math.max(current.bestScore, score);
    current.totalScore += score;

    if (isToday) {
      current.gamesPlayedDay += 1;
      current.bestScoreDay = Math.max(current.bestScoreDay ?? 0, score);
      current.totalScoreDay = (current.totalScoreDay ?? 0) + score;
    }

    if (isThisWeek) {
      current.gamesPlayedWeek += 1;
      current.bestScoreWeek = Math.max(current.bestScoreWeek ?? 0, score);
      current.totalScoreWeek = (current.totalScoreWeek ?? 0) + score;
    }

    entries.set(player, current);
  }

  return [...entries.values()].sort((left, right) => {
    if (right.bestScore !== left.bestScore) {
      return right.bestScore - left.bestScore;
    }
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }
    return left.player.localeCompare(right.player);
  });
}

export const LeaderboardApi = {
  keys: {
    all: (chainId?: ChainLike) => ["leaderboard", chainId?.toString() ?? "default"] as const,
  },
  async fetchAll(chainId?: ChainLike): Promise<LeaderboardEntry[]> {
    const client = initGrpcClient(chainId);
    const submittedScoresQuery = `
      SELECT
        s.leaderboard_id,
        c.username,
        s.player,
        s.game_id,
        s.score,
        s.timestamp,
        s.internal_executed_at
      FROM "ABYSS-LeaderboardScore" AS s
      LEFT JOIN controllers AS c ON lower(c.address) = lower(s.player)
      ORDER BY s.score DESC, s.timestamp ASC;
    `;

    try {
      const rows = (await client.executeSql(submittedScoresQuery)) as RawLeaderboardScoreRow[];
      const leaderboardRows = rows.filter((row) => toNumberish(row.leaderboard_id) === 1);
      if (leaderboardRows.length > 0) {
        return aggregate(leaderboardRows);
      }
    } catch (error) {
      console.warn("LeaderboardScore SQL unavailable, falling back to Session rows:", error);
    }

    const sessionsQuery = `
      SELECT
        c.username,
        s.player_address AS player,
        s.session_id AS game_id,
        s.total_score AS score,
        s.created_at AS timestamp,
        s.internal_executed_at
      FROM "ABYSS-Session" AS s
      LEFT JOIN controllers AS c ON lower(c.address) = lower(s.player_address)
      ORDER BY s.total_score DESC, s.created_at ASC;
    `;

    const rows = (await client.executeSql(sessionsQuery)) as RawLeaderboardScoreRow[];
    return aggregate(rows.filter((row) => toNumberish(row.score) > 0));
  },
};
