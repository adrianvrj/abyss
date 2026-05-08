#!/usr/bin/env python3
"""Estimate Abyss per-session gas from snforge resource-profile rows.

This is intentionally simple: it uses the current `snforge test
--detailed-resources --tracked-resource cairo-steps` profile rows as the
source of truth and scales them by a session transaction mix.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass


OBSERVED_BUDGET_USD = 292.49
OBSERVED_TXS = 13_055
OBSERVED_SESSIONS = 430


@dataclass(frozen=True)
class ProfileRow:
    name: str
    iterations: int
    steps: int
    l2_gas: int
    l1_data_gas: int
    events: int
    event_keys: int
    event_data: int

    def per_tx(self) -> "ProfileRow":
        return ProfileRow(
            name=self.name,
            iterations=1,
            steps=round(self.steps / self.iterations),
            l2_gas=round(self.l2_gas / self.iterations),
            l1_data_gas=round(self.l1_data_gas / self.iterations),
            events=round(self.events / self.iterations),
            event_keys=round(self.event_keys / self.iterations),
            event_data=round(self.event_data / self.iterations),
        )


# Fresh local baseline from 2026-05-08 after restoring receipt-native MarketRefreshed.
PROFILES = {
    "spin": ProfileRow(
        name="profile_request_spin_world_path",
        iterations=16,
        steps=4_282_955,
        l2_gas=472_836_160,
        l1_data_gas=87_936,
        events=346,
        event_keys=1_092,
        event_data=2_909,
    ),
    "refresh": ProfileRow(
        name="profile_refresh_market_world_path",
        iterations=24,
        steps=4_964_203,
        l2_gas=541_407_680,
        l1_data_gas=61_920,
        events=209,
        event_keys=665,
        event_data=2_859,
    ),
}


SCENARIOS = {
    "all_spins": {"spin": 30, "refresh": 0},
    "mostly_spins": {"spin": 28, "refresh": 2},
    "market_heavy": {"spin": 24, "refresh": 6},
}


def weighted_totals(mix: dict[str, int]) -> dict[str, int]:
    totals = {
        "txs": sum(mix.values()),
        "steps": 0,
        "l2_gas": 0,
        "l1_data_gas": 0,
        "events": 0,
        "event_keys": 0,
        "event_data": 0,
    }
    for action, count in mix.items():
        per_tx = PROFILES[action].per_tx()
        totals["steps"] += per_tx.steps * count
        totals["l2_gas"] += per_tx.l2_gas * count
        totals["l1_data_gas"] += per_tx.l1_data_gas * count
        totals["events"] += per_tx.events * count
        totals["event_keys"] += per_tx.event_keys * count
        totals["event_data"] += per_tx.event_data * count
    return totals


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--txs", type=int, default=30)
    parser.add_argument("--scenario", choices=sorted(SCENARIOS), default="mostly_spins")
    parser.add_argument("--spins", type=int)
    parser.add_argument("--refreshes", type=int)
    args = parser.parse_args()

    if args.spins is not None or args.refreshes is not None:
        spins = args.spins or 0
        refreshes = args.refreshes or 0
        mix = {"spin": spins, "refresh": refreshes}
        scenario = "custom"
    else:
        base_mix = SCENARIOS[args.scenario]
        scale = args.txs / sum(base_mix.values())
        mix = {action: round(count * scale) for action, count in base_mix.items()}
        delta = args.txs - sum(mix.values())
        if delta:
            mix["spin"] += delta
        scenario = args.scenario

    totals = weighted_totals(mix)
    observed_usd_per_tx = OBSERVED_BUDGET_USD / OBSERVED_TXS
    observed_usd_for_tx_count = observed_usd_per_tx * totals["txs"]

    print(f"scenario={scenario}")
    print(f"mix={mix}")
    print()
    print("per_tx_profiles:")
    for action, profile in PROFILES.items():
        per_tx = profile.per_tx()
        print(
            f"  {action}: steps={per_tx.steps:,} "
            f"l2_gas={per_tx.l2_gas:,} l1_data_gas={per_tx.l1_data_gas:,} "
            f"events={per_tx.events} keys={per_tx.event_keys} data={per_tx.event_data}"
        )
    print()
    print("session_estimate:")
    print(f"  txs={totals['txs']:,}")
    print(f"  cairo_steps={totals['steps']:,}")
    print(f"  l2_gas={totals['l2_gas']:,}")
    print(f"  l1_data_gas={totals['l1_data_gas']:,}")
    print(f"  events={totals['events']:,}")
    print(f"  event_keys={totals['event_keys']:,}")
    print(f"  event_data={totals['event_data']:,}")
    print()
    print("usd_anchor:")
    print(f"  observed_tx_per_session={OBSERVED_TXS / OBSERVED_SESSIONS:.2f}")
    print(f"  observed_usd_per_tx=${observed_usd_per_tx:.4f}")
    print(f"  observed_usd_for_{totals['txs']}_txs=${observed_usd_for_tx_count:.3f}")
    print()
    print("note=USD anchor is historical wallet spend per tx, not a direct conversion from snforge gas.")


if __name__ == "__main__":
    main()
