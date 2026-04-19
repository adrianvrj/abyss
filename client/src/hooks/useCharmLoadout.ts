import { useCallback, useEffect, useState } from "react";

const MAX_CHARMS = 3;

const storageKey = (address: string) => `abyss:charm-loadout:${address.toLowerCase()}`;

function readLoadout(address: string | undefined): number[] {
  if (!address || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v > 0)
      .slice(0, MAX_CHARMS);
  } catch {
    return [];
  }
}

function writeLoadout(address: string, charmIds: number[]) {
  try {
    window.localStorage.setItem(
      storageKey(address),
      JSON.stringify(charmIds.slice(0, MAX_CHARMS)),
    );
  } catch {
    /* ignore */
  }
}

export function useCharmLoadout(walletAddress: string | undefined) {
  const [loadout, setLoadout] = useState<number[]>(() => readLoadout(walletAddress));

  useEffect(() => {
    setLoadout(readLoadout(walletAddress));
  }, [walletAddress]);

  const toggle = useCallback((charmId: number) => {
    if (!walletAddress) return;
    setLoadout((prev) => {
      const next = prev.includes(charmId)
        ? prev.filter((id) => id !== charmId)
        : prev.length >= MAX_CHARMS
          ? prev
          : [...prev, charmId];
      writeLoadout(walletAddress, next);
      return next;
    });
  }, [walletAddress]);

  const set = useCallback((charmIds: number[]) => {
    if (!walletAddress) return;
    const clean = charmIds.filter((id) => Number.isInteger(id) && id > 0).slice(0, MAX_CHARMS);
    writeLoadout(walletAddress, clean);
    setLoadout(clean);
  }, [walletAddress]);

  const clear = useCallback(() => {
    if (!walletAddress) return;
    writeLoadout(walletAddress, []);
    setLoadout([]);
  }, [walletAddress]);

  return { loadout, toggle, set, clear, maxCharms: MAX_CHARMS };
}
