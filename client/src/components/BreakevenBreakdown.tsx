import { motion } from "framer-motion";

interface BreakevenBreakdownProps {
  entryUsd: number;
  chipEmissionRate: number;
  chipBoostMultiplier: number;
  chipsPerUsdc: number | null;
  isLoadingPrice: boolean;
  gameplayPoolRemaining?: bigint;
  charmPoolRemaining?: bigint;
  isLoadingRewardPools?: boolean;
}

const CHIP_BONUS_CAP = 300;
const CHIP_DECIMALS = 1_000_000_000_000_000_000n;

function getChipUnits(score: number, bonusUnits = 0): number {
  const safeScore = Math.max(0, Math.floor(score));
  const tier1 = Math.min(safeScore, 12_000);
  const tier2 = Math.max(0, Math.min(safeScore, 25_000) - 12_000);
  const tier3 = Math.max(0, safeScore - 25_000);
  return Math.floor(tier1 / 8)
    + Math.floor(tier2 / 12)
    + Math.floor(tier3 / 18)
    + Math.min(Math.max(0, Math.floor(bonusUnits)), CHIP_BONUS_CAP);
}

function getLevelThreshold(level: number): number {
  if (level <= 1) return 66;
  if (level === 2) return 220;
  if (level === 3) return 450;
  if (level === 4) return 1000;
  if (level === 5) return 2200;
  if (level === 6) return 5000;
  if (level === 7) return 9500;
  if (level === 8) return 17000;
  if (level === 9) return 24500;
  if (level === 10) return 42000;
  if (level === 11) return 70000;
  return 70000 + ((level - 11) * 50000);
}

function getChipsAtLevel(level: number, effectiveRate: number): number {
  const score = getLevelThreshold(level);
  return getChipUnits(score) * effectiveRate;
}

function getBreakevenLevel(chipsNeeded: number, effectiveRate: number): number | null {
  if (chipsNeeded <= 0) {
    return 1;
  }

  for (let level = 1; level <= 999; level += 1) {
    if (getChipsAtLevel(level, effectiveRate) >= chipsNeeded) {
      return level;
    }
  }

  return null;
}

function formatChipAmount(amount?: bigint): string {
  if (amount === undefined) {
    return "Pending";
  }

  const whole = amount / CHIP_DECIMALS;
  const remainder = amount % CHIP_DECIMALS;

  if (remainder === 0n) {
    return whole.toLocaleString();
  }

  const cents = (remainder * 100n) / CHIP_DECIMALS;
  return `${whole.toLocaleString()}.${cents.toString().padStart(2, "0")}`;
}

function RewardPoolRows({
  gameplayPoolRemaining,
  charmPoolRemaining,
  isLoadingRewardPools,
}: {
  gameplayPoolRemaining?: bigint;
  charmPoolRemaining?: bigint;
  isLoadingRewardPools?: boolean;
}) {
  const gameplayLabel = isLoadingRewardPools
    ? "Loading"
    : formatChipAmount(gameplayPoolRemaining);
  const charmLabel = isLoadingRewardPools
    ? "Loading"
    : formatChipAmount(charmPoolRemaining);

  return (
    <div style={styles.pools}>
      <div style={styles.poolRow}>
        <span style={styles.poolLabel}>Gameplay pool</span>
        <span style={styles.poolValue}>{gameplayLabel} CHIP</span>
      </div>
      <div style={styles.poolRow}>
        <span style={styles.poolLabel}>Charm pool</span>
        <span style={styles.poolValue}>{charmLabel} CHIP</span>
      </div>
    </div>
  );
}

export function BreakevenBreakdown({
  entryUsd,
  chipEmissionRate,
  chipBoostMultiplier,
  chipsPerUsdc,
  isLoadingPrice,
  gameplayPoolRemaining,
  charmPoolRemaining,
  isLoadingRewardPools = false,
}: BreakevenBreakdownProps) {
  const effectiveRate = chipEmissionRate * chipBoostMultiplier;
  const poolRows = (
    <RewardPoolRows
      gameplayPoolRemaining={gameplayPoolRemaining}
      charmPoolRemaining={charmPoolRemaining}
      isLoadingRewardPools={isLoadingRewardPools}
    />
  );

  if (effectiveRate === 0) {
    return (
      <motion.div style={styles.container} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div style={styles.header}>CHIP Rewards</div>
        <div style={styles.card}>
          <span style={styles.muted}>Rewards currently paused</span>
          {poolRows}
        </div>
      </motion.div>
    );
  }

  if (entryUsd === 0) {
    return (
      <motion.div style={styles.container} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div style={styles.header}>CHIP Rewards</div>
        <div style={styles.card}>
          <span style={{ ...styles.muted, color: "#4ADE80", fontSize: "10px" }}>FREE SESSION</span>
          <span style={styles.muted}>All CHIP earned is profit</span>
          {poolRows}
        </div>
      </motion.div>
    );
  }

  const hasPrice = chipsPerUsdc !== null && chipsPerUsdc > 0;

  if (isLoadingPrice) {
    return (
      <motion.div style={styles.container} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div style={styles.header}>CHIP Rewards</div>
        <div style={styles.card}>
          <span style={styles.muted}>Loading CHIP price...</span>
          {poolRows}
        </div>
      </motion.div>
    );
  }

  if (!hasPrice) {
    return (
      <motion.div style={styles.container} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div style={styles.header}>CHIP Rewards</div>
        <div style={styles.card}>
          <div style={styles.row}>
            <span style={styles.label}>Rate</span>
            <span style={styles.muted}>Tiered CHIP rewards</span>
          </div>
          <span style={{ ...styles.muted, fontSize: "8px" }}>CHIP price unavailable</span>
          {poolRows}
        </div>
      </motion.div>
    );
  }

  const chipPriceUsd = 1 / chipsPerUsdc!;
  const chipsNeeded = chipsPerUsdc! * entryUsd;
  const breakevenLevel = getBreakevenLevel(chipsNeeded, effectiveRate);
  const trackEndLevel = breakevenLevel && breakevenLevel > 10 ? breakevenLevel : 10;
  const trackStartLevel = Math.max(1, trackEndLevel - 9);
  const levels = Array.from({ length: trackEndLevel - trackStartLevel + 1 }, (_, index) => (
    trackStartLevel + index
  ));
  const trackRange = Math.max(1, trackEndLevel - trackStartLevel);
  const breakevenOffset = breakevenLevel === null
    ? null
    : ((breakevenLevel - trackStartLevel) / trackRange) * 100;

  return (
    <motion.div style={styles.container} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={styles.header}>Break Even</div>
        <div style={styles.badge}>LVL {breakevenLevel ?? "?"}</div>
      </div>

      <div style={styles.card}>
        {/* Big number */}
        <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
          <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: "18px", color: "#FF841C", lineHeight: 1.4 }}>
            {Math.ceil(chipsNeeded).toLocaleString()} CHIP
          </div>
          <div style={{ fontFamily: "'PressStart2P', monospace", fontSize: "8px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
            to recover ${entryUsd.toFixed(2)} entry
          </div>
        </div>

        {/* Level track */}
        <div style={{ padding: "12px 0 0" }}>
          {/* Track bar */}
          <div style={{ position: "relative", height: "4px", background: "rgba(255,132,28,0.15)", borderRadius: "2px" }}>
            {/* Filled portion up to breakeven */}
            {breakevenOffset !== null && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${breakevenOffset}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  background: "#FF841C",
                  borderRadius: "2px",
                }}
              />
            )}
            {/* Breakeven marker */}
            {breakevenOffset !== null && (
              <div
                style={{
                  position: "absolute",
                  left: `${breakevenOffset}%`,
                  top: "-5px",
                  width: "14px",
                  height: "14px",
                  background: "#FF841C",
                  borderRadius: "50%",
                  border: "2px solid #000",
                  transform: "translateX(-50%)",
                  boxShadow: "none",
                }}
              />
            )}
          </div>

          {/* Level labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            {levels.map((l) => (
              <span
                key={l}
                style={{
                  fontFamily: "'PressStart2P', monospace",
                  fontSize: "7px",
                  color: l === breakevenLevel ? "#FF841C" : "rgba(255,255,255,0.25)",
                  width: `${100 / levels.length}%`,
                  textAlign: "center",
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div style={{ borderTop: "1px solid rgba(255,132,28,0.12)", marginTop: "8px", paddingTop: "8px" }}>
          <div style={styles.row}>
            <span style={styles.muted}>
              1 CHIP = {chipPriceUsd < 0.01 ? chipPriceUsd.toFixed(5) : chipPriceUsd.toFixed(4)} USD
            </span>
            <span style={styles.muted}>
              Tiered curve
            </span>
          </div>
        </div>

        {poolRows}
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: "1px solid rgba(255, 132, 28, 0.35)",
    borderRadius: "12px",
    background: "#0a0402",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    boxShadow: "none",
  },
  header: {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "10px",
    color: "#FF841C",
    opacity: 0.9,
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  badge: {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "9px",
    color: "#FFFFFF",
    background: "#FF841C",
    padding: "4px 10px",
    borderRadius: "4px",
    letterSpacing: "0.5px",
  },
  card: {
    border: "1px solid rgba(255, 132, 28, 0.25)",
    borderRadius: "10px",
    background: "#000000",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  pools: {
    borderTop: "1px solid rgba(255,132,28,0.12)",
    marginTop: "8px",
    paddingTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  poolRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  poolLabel: {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "7px",
    color: "rgba(255,255,255,0.35)",
    lineHeight: 1.5,
    textTransform: "uppercase",
  },
  poolValue: {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "7px",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.5,
    textAlign: "right",
  },
  label: {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "8px",
    color: "#FFFFFF",
    opacity: 0.6,
    textTransform: "uppercase",
  },
  muted: {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "8px",
    color: "rgba(255,255,255,0.4)",
  },
};
