import { useCallback, useEffect, useState } from "react";
import { initToriiClient } from "@/api/torii/client";
import { SessionApi } from "@/api/torii/session";

type ChainLike = bigint | string | undefined | null;

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

function cleanLoadout(charmIds: number[]) {
  return charmIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, MAX_CHARMS);
}

export function useCharmLoadout(walletAddress: string | undefined, chainId?: ChainLike) {
  const [loadout, setLoadout] = useState<number[]>(() => readLoadout(walletAddress));

  useEffect(() => {
    if (!walletAddress) {
      setLoadout([]);
      return;
    }

    let cancelled = false;
    setLoadout(readLoadout(walletAddress));

    const hydrateFromChain = async () => {
      try {
        const client = await initToriiClient(chainId);
        const pending = await SessionApi.fetchPendingCharmLoadout(client, walletAddress);
        if (cancelled) return;

        const next = cleanLoadout(pending?.charmIds ?? []);
        writeLoadout(walletAddress, next);
        setLoadout(next);
      } catch (error) {
        console.warn("Failed to load pending charm loadout:", error);
      }
    };

    hydrateFromChain();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, chainId]);

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
    const clean = cleanLoadout(charmIds);
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
