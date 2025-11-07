/**
 * Calculate the score threshold needed to reach a specific level
 * This logic matches the contract's get_level_threshold function
 */
export function getLevelThreshold(level: number): number {
  // Phase 1: Accessible (Levels 1-6)
  const earlyThresholds = [33, 100, 250, 500, 850, 1300];

  if (level <= 6) {
    return earlyThresholds[level - 1] || 0;
  } else if (level <= 12) {
    // Phase 2: Intermediate (Levels 7-12)
    // Formula: previous × 1.4 + (level × 100)
    let threshold = 1300;
    for (let i = 7; i <= level; i++) {
      threshold = Math.floor(threshold * 1.4 + (i * 100));
    }
    return threshold;
  } else if (level <= 20) {
    // Phase 3: Advanced (Levels 13-20)
    // Formula: previous × 1.35 + (level² × 50)
    let threshold = 12500; // Level 12 final threshold
    for (let i = 13; i <= level; i++) {
      threshold = Math.floor(threshold * 1.35 + (i * i * 50));
    }
    return threshold;
  } else if (level <= 30) {
    // Phase 4: Elite (Levels 21-30)
    // Formula: previous × 1.38 + (level³ × 20)
    let threshold = 142000; // Level 20 final threshold
    for (let i = 21; i <= level; i++) {
      threshold = Math.floor(threshold * 1.38 + (i * i * i * 20));
    }
    return threshold;
  } else {
    // Phase 5: Impossible (Levels 31+)
    // Formula: previous × 1.42 + (level⁴ × 5)
    let threshold = 3500000; // Level 30 final threshold
    for (let i = 31; i <= level; i++) {
      threshold = Math.floor(threshold * 1.42 + (Math.pow(i, 4) * 5));
    }
    return threshold;
  }
}
