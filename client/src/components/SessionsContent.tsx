import { useState, useEffect, useCallback, useRef } from "react";
import type ControllerConnector from "@cartridge/connector/controller";
import { useNetwork } from "@starknet-react/core";
import { useController } from "@/hooks/useController";
import { useAbyssGame } from "@/hooks/useAbyssGame";
import { useBundles } from "@/context/bundles";
import { useAbyssActions } from "@/hooks/actions";
import { DEFAULT_CHAIN_ID, getCharmAddress, getSetupAddress, tryGetStreakAddress } from "@/config";
import { CONTRACTS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BundleApi } from "@/api/torii/bundle";
import { useEntities } from "@/context/entities";
import { useChipPrice } from "@/hooks/useChipPrice";
import { BreakevenBreakdown } from "@/components/BreakevenBreakdown";
import { CharmLoadoutModal } from "@/components/modals/CharmLoadoutModal";
import { useCharmLoadout } from "@/hooks/useCharmLoadout";
import { getAvailableGoldenChipRuns, getGoldenChipBalance } from "@/api/rpc/goldenChip";
import { getCharmMetadata, getPlayerCharms } from "@/api/rpc/relic";
import { STATIC_CHARM_DEFINITIONS } from "@/lib/charmCatalog";
import {
    fetchPlayerStreak,
    secondsUntilNextUtcDay,
    utcDayIndexFromMs,
    type PlayerStreakState,
} from "@/api/rpc/streak";
import { Sparkles, Flame } from "lucide-react";
import type { Bundle } from "@/models/bundle";
import { captureAbyss } from "@/lib/posthog";

interface SessionInfo {
    sessionId: number;
    level: number;
    score: number;
    spinsRemaining: number;
    isActive: boolean;
    totalSpins: number;
}

const GOLDEN_CHIP_WEEK_SECONDS = 604800;

function getGoldenChipResetMs(nowMs = Date.now()) {
    const nowSeconds = Math.floor(nowMs / 1000);
    const nextEpoch = Math.floor(nowSeconds / GOLDEN_CHIP_WEEK_SECONDS) + 1;
    return nextEpoch * GOLDEN_CHIP_WEEK_SECONDS * 1000;
}

function formatGoldenChipResetCountdown(resetMs: number, nowMs: number) {
    const totalSeconds = Math.max(0, Math.ceil((resetMs - nowMs) / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
}

function formatHoursMinutesFromSeconds(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

const STREAK_TRACKER_DAYS = 7;

function StreakUtcDayPips(props: {
    filled: number;
    lootReady: boolean;
    muted?: boolean;
}) {
    const { filled, lootReady, muted } = props;
    const clamped = Math.min(Math.max(filled, 0), STREAK_TRACKER_DAYS);

    return (
        <div
            role="img"
            aria-label={`Streak progress ${clamped} of ${STREAK_TRACKER_DAYS} UTC calendar days`}
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${STREAK_TRACKER_DAYS}, minmax(0, 1fr))`,
                gap: 5,
                width: "100%",
                marginTop: 2,
                marginBottom: 2,
            }}
        >
            {Array.from({ length: STREAK_TRACKER_DAYS }, (_, i) => {
                const lit = i < clamped;
                const crown = lootReady && lit && i === STREAK_TRACKER_DAYS - 1;
                const baseBg = muted
                    ? "rgba(55, 48, 40, 0.45)"
                    : lit
                      ? crown
                          ? "#f0a060"
                          : "#c45a18"
                      : "rgba(255, 132, 28, 0.1)";
                const border = muted
                    ? "1px solid rgba(120, 100, 85, 0.4)"
                    : lit
                      ? crown
                          ? "1px solid rgba(255, 220, 170, 0.65)"
                          : "1px solid rgba(255, 150, 80, 0.55)"
                      : "1px solid rgba(255, 132, 28, 0.22)";

                return (
                    <div
                        key={i}
                        style={{
                            height: 9,
                            borderRadius: 2,
                            background: baseBg,
                            border,
                            opacity: muted ? 0.85 : 1,
                        }}
                    />
                );
            })}
        </div>
    );
}

function isZeroAddress(address: string | null | undefined) {
    if (!address) {
        return true;
    }

    try {
        return BigInt(address) === 0n;
    } catch {
        return address === "0x0";
    }
}

const styles = {
    container: {
        height: "100vh",
        maxHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        padding: "48px 24px",
        overflowY: "auto" as const,
        overflowX: "hidden" as const,
    },
    title: {
        fontFamily: "var(--font-title)",
        fontSize: "32px",
        color: "#FF841C",
        textTransform: "uppercase" as const,
        letterSpacing: "4px",
        marginBottom: "32px",
    },
    content: {
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "24px",
    },
    sectionTitle: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FF841C",
        marginBottom: "16px",
        opacity: 0.8,
    },
    sessionCard: {
        background: "rgba(255, 132, 28, 0.1)",
        border: "2px solid rgba(255, 132, 28, 0.3)",
        borderRadius: "8px",
        padding: "20px",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    sessionCardHover: {
        border: "2px solid #FF841C",
        boxShadow: "0 0 20px rgba(255, 132, 28, 0.3)",
    },
    sessionInfo: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sessionId: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "14px",
        color: "#FFFFFF",
    },
    sessionStats: {
        display: "flex",
        gap: "24px",
    },
    stat: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "4px",
    },
    statValue: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "16px",
        color: "#FF841C",
    },
    statLabel: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "8px",
        color: "#FFFFFF",
        opacity: 0.6,
    },
    newSessionButton: {
        background: "transparent",
        border: "none",
        fontFamily: "var(--font-title)",
        fontSize: "32px",
        color: "#FFFFFF",
        cursor: "pointer",
        padding: "8px",
        marginBottom: "32px",
        letterSpacing: "2px",
        textAlign: "center" as const,
    },
    noSessions: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FFFFFF",
        opacity: 0.5,
        textAlign: "center" as const,
        padding: "32px",
    },
    perksPanel: {
        border: "1px solid rgba(255, 132, 28, 0.35)",
        borderRadius: "12px",
        background: "#0a0402",
        padding: "14px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "12px",
        boxShadow: "0 0 0 1px rgba(255,132,28,0.08) inset",
    },
    perksHeader: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "10px",
        color: "#FF841C",
        opacity: 0.9,
        textTransform: "uppercase" as const,
        letterSpacing: "1px",
    },
    perksGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "10px",
    },
    perkCard: {
        border: "1px solid rgba(255, 132, 28, 0.25)",
        borderRadius: "10px",
        background: "#000000",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "8px",
    },
    perkTitleRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
    },
    perkTitle: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "10px",
        color: "#FFFFFF",
        textTransform: "uppercase" as const,
    },
    perkBadge: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "8px",
        color: "#FF841C",
        border: "1px solid rgba(255, 132, 28, 0.5)",
        borderRadius: "999px",
        padding: "4px 8px",
        background: "#120700",
        whiteSpace: "nowrap" as const,
    },
    perkBody: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "10px",
        lineHeight: 1.7,
        color: "rgba(255,255,255,0.72)",
    },
    perkCountdown: {
        border: "1px solid rgba(255, 211, 106, 0.28)",
        borderRadius: "6px",
        background: "#120A00",
        color: "#FFD36A",
        fontFamily: "'PressStart2P', monospace",
        fontSize: "9px",
        lineHeight: 1.6,
        padding: "8px 10px",
    },
    perkAction: {
        alignSelf: "flex-start" as const,
        background: "#160900",
        border: "1px solid #FF841C",
        borderRadius: "999px",
        color: "#FF841C",
        fontFamily: "'PressStart2P', monospace",
        fontSize: "9px",
        padding: "8px 12px",
        cursor: "pointer",
        textTransform: "uppercase" as const,
    },
    loading: {
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        color: "#FFFFFF",
        textAlign: "center" as const,
    },
    spinsWarning: {
        color: "#FF4444",
    },
    navRow: {
        width: "100%",
        maxWidth: "600px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
    },
    navButton: {
        background: "transparent",
        border: "none",
        color: "#FFFFFF",
        fontFamily: "'PressStart2P', monospace",
        fontSize: "12px",
        cursor: "pointer",
        opacity: 0.7,
    },
};

function isGoldenChipBundle(bundle: Bundle) {
    return bundle.metadata.toLowerCase().includes("golden chip");
}

function findGoldenChipBundle(availableBundles: Bundle[]) {
    return (
        (CONTRACTS.GOLDEN_CHIP_BUNDLE_ID !== null
            ? availableBundles.find((bundle) => bundle.id === CONTRACTS.GOLDEN_CHIP_BUNDLE_ID)
            : undefined) ??
        availableBundles.find((bundle) => bundle.price === 0n && isGoldenChipBundle(bundle))
    );
}

function findShareBundle(availableBundles: Bundle[]) {
    return (
        (CONTRACTS.X_SHARE_BUNDLE_ID !== null
            ? availableBundles.find((bundle) => bundle.id === CONTRACTS.X_SHARE_BUNDLE_ID)
            : undefined) ??
        availableBundles.find((bundle) =>
            bundle.price === 0n &&
            !isGoldenChipBundle(bundle) &&
            (bundle.metadata.toLowerCase().includes("twitter") || bundle.metadata.toLowerCase().includes("share"))
        ) ??
        availableBundles.find((bundle) => bundle.price === 0n && !isGoldenChipBundle(bundle))
    );
}

export function SessionsContent() {
    const navigate = useNavigate();
    const { chain } = useNetwork();
    const { account, connector, isConnected, disconnect, delegateAddress } = useController();
    const {
        getPlayerSessions,
        getSessionData,
        getSessionItems,
        getAvailableBeastSessions,
        claimBeastSession,
        isReady,
    } = useAbyssGame(account);
    const { claimFreeSessionBundle, equipCharms, setPendingCharmLoadout, claimStreakLoot, recoverStreak } =
        useAbyssActions();
    const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
    const charmLoadout = useCharmLoadout(account?.address, chainId);
    const { bundles, status: bundlesStatus, refresh: refreshBundles } = useBundles();

    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);
    const { client, config } = useEntities();
    const { chipsPerUsdc, isLoading: isLoadingPrice } = useChipPrice();
    const [beastSessions, setBeastSessions] = useState(0);
    const [configuringSession, setConfiguringSession] = useState<SessionInfo | null>(null);
    const [isPrerunLoadoutOpen, setIsPrerunLoadoutOpen] = useState(false);
    const [isSavingPrerunLoadout, setIsSavingPrerunLoadout] = useState(false);
    const [ownedCharmIds, setOwnedCharmIds] = useState<number[]>([]);
    const [sessionCharmIds, setSessionCharmIds] = useState<number[]>([]);
    const [isSealingLoadout, setIsSealingLoadout] = useState(false);
    const [goldenChipBalance, setGoldenChipBalance] = useState(0n);
    const [delegateGoldenChipBalance, setDelegateGoldenChipBalance] = useState(0n);
    const [goldenChipRuns, setGoldenChipRuns] = useState(0);
    const [nowMs, setNowMs] = useState(() => Date.now());
    const [playerStreak, setPlayerStreak] = useState<PlayerStreakState | null>(null);
    const [isStreakActionPending, setIsStreakActionPending] = useState(false);
    const sessionsListViewTrackedRef = useRef(false);
    const charmAddress = getCharmAddress(chainId);
    const charmsEnabled = Boolean(charmAddress && charmAddress !== "0x0");
    const streakFeatureEnabled = Boolean(tryGetStreakAddress(chainId));
    const hasControllerGoldenChip = goldenChipBalance > 0n || goldenChipRuns > 0;
    const hasDelegateGoldenChip = delegateGoldenChipBalance > 0n;
    const hasAnyGoldenChip = hasControllerGoldenChip || hasDelegateGoldenChip;
    const showGoldenChipResetCountdown = hasAnyGoldenChip && goldenChipRuns <= 0;
    const goldenChipResetMs = getGoldenChipResetMs(nowMs);
    const goldenChipResetCountdown = formatGoldenChipResetCountdown(goldenChipResetMs, nowMs);
    const shareMessage =
        "I'm minting my free Abyss game session!\n🎟️ @abyssdotfun\nhttps://play.abyssgame.fun";

    // Redirect to home if not connected
    useEffect(() => {
        if (!isConnected) {
            navigate("/");
        }
    }, [isConnected, navigate]);

    useEffect(() => {
        if (!showGoldenChipResetCountdown && !streakFeatureEnabled) {
            return;
        }

        setNowMs(Date.now());
        const interval = window.setInterval(() => {
            setNowMs(Date.now());
        }, 60_000);

        return () => window.clearInterval(interval);
    }, [showGoldenChipResetCountdown, streakFeatureEnabled]);

    useEffect(() => {
        if (!account?.address || !client) {
            return;
        }

        const checkIssuance = async () => {
             const shareBundle = findShareBundle(bundles);

            if (shareBundle) {
                try {
                    const issuance = await BundleApi.fetchIssuance(client, shareBundle.id, account.address);
                    
                    // If the record exists at all in BundleIssuance, it means it's been handled
                    if (issuance) {
                        setIsClaimed(true);
                    }
                } catch (error) {
                    console.warn("[ABYSS_BUNDLE] Failed to check issuance:", error);
                }
            }
        };

        checkIssuance();
    }, [account?.address, client, bundles]);

    const loadSessions = useCallback(async () => {
        if (!isReady || !account) {
            setPlayerStreak(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const delegateCandidate = delegateAddress;
            const delegateGoldenChipAddress =
                delegateCandidate &&
                !isZeroAddress(delegateCandidate) &&
                delegateCandidate.toLowerCase() !== account.address.toLowerCase()
                    ? delegateCandidate
                    : null;
            const [sessionIds, availableBeastSessions, goldenBalance, delegateGoldenBalance, availableGoldenRuns] = await Promise.all([
                getPlayerSessions(account.address),
                getAvailableBeastSessions(account.address),
                getGoldenChipBalance(chainId, account.address).catch((error) => {
                    console.warn("Failed to load Controller Golden Chip balance:", error);
                    return 0n;
                }),
                delegateGoldenChipAddress
                    ? getGoldenChipBalance(chainId, delegateGoldenChipAddress).catch((error) => {
                        console.warn("Failed to load delegate Golden Chip balance:", error);
                        return 0n;
                    })
                    : Promise.resolve(0n),
                getAvailableGoldenChipRuns(chainId, account.address).catch((error) => {
                    console.warn("Failed to load Golden Chip runs:", error);
                    return 0;
                }),
            ]);
            setBeastSessions(availableBeastSessions);
            setGoldenChipBalance(goldenBalance);
            setDelegateGoldenChipBalance(delegateGoldenBalance);
            setGoldenChipRuns(availableGoldenRuns);
            const sessionPromises = sessionIds.map(async (id: number) => {
                const data = await getSessionData(id);
                if (!data) return null;
                return {
                    sessionId: id,
                    level: data.level,
                    score: data.score,
                    spinsRemaining: data.spinsRemaining,
                    isActive: data.isActive,
                    totalSpins: data.totalSpins,
                } as SessionInfo;
            });

            const allSessions = await Promise.all(sessionPromises);
            const activeSessions = allSessions.filter((s): s is SessionInfo => s !== null && s.isActive);
            setSessions(activeSessions);

            if (tryGetStreakAddress(chainId)) {
                setPlayerStreak(await fetchPlayerStreak(chainId, account.address));
            } else {
                setPlayerStreak(null);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        isReady,
        account,
        getPlayerSessions,
        getAvailableBeastSessions,
        getSessionData,
        chainId,
        delegateAddress,
    ]);

    // Load initial data
    useEffect(() => {
        loadSessions();
    }, [isReady, account?.address, loadSessions]);

    useEffect(() => {
        if (!isConnected || isLoading) {
            return;
        }
        if (sessionsListViewTrackedRef.current) {
            return;
        }
        sessionsListViewTrackedRef.current = true;
        captureAbyss("sessions_viewed", {
            chain_id: chainId,
            active_session_count: sessions.length,
        });
    }, [isConnected, isLoading, sessions.length, chainId]);

    const handleSelectSession = useCallback(
        (sessionId: number) => {
            captureAbyss("session_selected", {
                session_id: sessionId,
                chain_id: chainId,
            });
            navigate(`/game?sessionId=${sessionId}`);
        },
        [navigate, chainId],
    );

    const loadOwnedCharms = useCallback(async () => {
        if (!charmsEnabled || !account?.address) return;
        try {
            const tokenIds = await getPlayerCharms(chainId, charmAddress, account.address);
            const ids = new Set<number>();
            for (const tokenId of tokenIds) {
                try {
                    const metadata = await getCharmMetadata(chainId, charmAddress, tokenId);
                    const cid = Number(metadata?.charmId ?? 0);
                    if (cid > 0) ids.add(cid);
                } catch {
                    /* ignore single charm errors */
                }
            }
            setOwnedCharmIds(Array.from(ids));
        } catch (error) {
            console.warn("Failed to load owned charms:", error);
        }
    }, [account?.address, chainId, charmAddress, charmsEnabled]);

    useEffect(() => {
        loadOwnedCharms();
    }, [loadOwnedCharms]);

    const handleOpenLoadout = useCallback(
        async (session: SessionInfo) => {
            setConfiguringSession(session);
            setSessionCharmIds([]);

            try {
                const items = await getSessionItems(session.sessionId);
                const equippedCharms = items
                    .filter((item) => item.item_id >= 1000)
                    .map((item) => item.item_id - 1000);
                setSessionCharmIds(equippedCharms);

                if (session.totalSpins === 0) {
                    charmLoadout.set(equippedCharms);
                }
            } catch (error) {
                console.warn("Failed to load session charms:", error);
            }

            loadOwnedCharms();
        },
        [charmLoadout, getSessionItems, loadOwnedCharms],
    );

    const handleCloseLoadout = useCallback(() => {
        setConfiguringSession(null);
        setSessionCharmIds([]);
    }, []);

    const handleSealLoadout = useCallback(async () => {
        if (!configuringSession) return;
        setIsSealingLoadout(true);
        try {
            await equipCharms(configuringSession.sessionId, charmLoadout.loadout);
            captureAbyss("charm_loadout_saved", {
                session_id: configuringSession.sessionId,
                charm_count: charmLoadout.loadout.length,
                chain_id: chainId,
                scope: "session",
            });
            setSessionCharmIds(charmLoadout.loadout);
            await loadSessions();
            setConfiguringSession(null);
        } finally {
            setIsSealingLoadout(false);
        }
    }, [charmLoadout.loadout, chainId, configuringSession, equipCharms, loadSessions]);

    const handleOpenPrerunLoadout = useCallback(() => {
        setIsPrerunLoadoutOpen(true);
        loadOwnedCharms();
    }, [loadOwnedCharms]);

    const handleClosePrerunLoadout = useCallback(() => {
        setIsPrerunLoadoutOpen(false);
    }, []);

    const handleSealPrerunLoadout = useCallback(async () => {
        setIsSavingPrerunLoadout(true);
        try {
            await setPendingCharmLoadout(charmLoadout.loadout);
            captureAbyss("charm_loadout_saved", {
                session_id: 0,
                charm_count: charmLoadout.loadout.length,
                chain_id: chainId,
                scope: "pending_prerun",
            });
            setIsPrerunLoadoutOpen(false);
        } finally {
            setIsSavingPrerunLoadout(false);
        }
    }, [chainId, charmLoadout.loadout, setPendingCharmLoadout]);

    const handleCreateSessionClick = useCallback(async () => {
        if (!account) {
            console.error("No account connected");
            return;
        }

        captureAbyss("new_session_clicked", { entry: "paid_bundle", chain_id: chainId });

        setIsCreating(true);
        let checkoutBundleId: number | null = null;
        try {
            let availableBundles = bundles;
            let sessionBundle =
                availableBundles.find((bundle) => bundle.id === CONTRACTS.SESSION_BUNDLE_ID) ??
                availableBundles.find((bundle) => bundle.price > 0n) ??
                availableBundles[0];

            if (!sessionBundle) {
                const refreshed = await refreshBundles();
                availableBundles = refreshed ?? availableBundles;
                sessionBundle =
                    availableBundles.find((bundle) => bundle.id === CONTRACTS.SESSION_BUNDLE_ID) ??
                    availableBundles.find((bundle) => bundle.price > 0n) ??
                    availableBundles[0];
            }

            if (!sessionBundle && Number.isFinite(CONTRACTS.SESSION_BUNDLE_ID)) {
                sessionBundle = {
                    id: CONTRACTS.SESSION_BUNDLE_ID,
                    referralPercentage: 0,
                    reissuable: false,
                    price: 0n,
                    paymentToken: "0x0",
                    paymentReceiver: "0x0",
                    totalIssued: 0n,
                    createdAt: 0,
                    metadata: "",
                    contract: "0x0",
                    allower: "0x0",
                };
            }

            if (!sessionBundle) {
                console.error("No session bundle found; refusing to fallback to paid create_session.");
                captureAbyss("bundle_flow_failed", {
                    stage: "no_bundle_configured",
                    chain_id: chainId,
                });
                await loadSessions();
                return;
            }

            if (!connector) {
                console.error("No controller connector available for openBundle.");
                captureAbyss("bundle_flow_failed", {
                    stage: "no_connector",
                    chain_id: chainId,
                });
                return;
            }

            const controller = connector as ControllerConnector;
            const registry = getSetupAddress(chain?.id);
            const previousSessionIds = await getPlayerSessions(account.address);

            checkoutBundleId = sessionBundle.id;
            captureAbyss("bundle_checkout_opened", {
                bundle_id: checkoutBundleId,
                bundle_kind: "session",
                price_wei: sessionBundle.price.toString(),
                chain_id: chainId,
            });

            await controller.controller.openBundle(sessionBundle.id, registry, {
                onPurchaseComplete: async () => {
                    for (let attempt = 0; attempt < 10; attempt++) {
                        const nextSessionIds = await getPlayerSessions(account.address);
                        const createdSessionId = nextSessionIds.find(
                            (sessionId) => !previousSessionIds.includes(sessionId),
                        );

                        if (createdSessionId !== undefined) {
                            captureAbyss("bundle_purchase_completed", {
                                bundle_id: checkoutBundleId,
                                new_session_id: createdSessionId,
                                bundle_kind: "session",
                                chain_id: chainId,
                            });
                            await loadSessions();
                            navigate(`/game?sessionId=${createdSessionId}`);
                            return;
                        }

                        await new Promise((resolve) => setTimeout(resolve, 400));
                    }

                    captureAbyss("bundle_flow_failed", {
                        stage: "post_purchase_poll_exhausted",
                        bundle_id: checkoutBundleId,
                        chain_id: chainId,
                    });
                    await loadSessions();
                },
            });
        } catch (error: any) {
            console.error("Failed to create session:", error);
            captureAbyss("bundle_flow_failed", {
                stage: "open_bundle_error",
                bundle_id: checkoutBundleId,
                chain_id: chainId,
                error_message: error?.message ? String(error.message) : "unknown",
            });
        } finally {
            setIsCreating(false);
        }
    }, [account, bundles, chain?.id, chainId, connector, getPlayerSessions, loadSessions, navigate, refreshBundles]);

    const handleBack = useCallback(() => {
        navigate("/");
    }, [navigate]);

    const handleLogout = useCallback(async () => {
        await disconnect();
        navigate("/");
    }, [disconnect, navigate]);

    const waitForClaimedSession = useCallback(
        async (claimFn: () => Promise<number>, flow: string) => {
            if (!account) {
                return;
            }

            const previousSessionIds = await getPlayerSessions(account.address);
            await claimFn();

            for (let attempt = 0; attempt < 10; attempt += 1) {
                const nextSessionIds = await getPlayerSessions(account.address);
                const createdSessionId = nextSessionIds.find(
                    (sessionId) => !previousSessionIds.includes(sessionId),
                );

                if (createdSessionId !== undefined) {
                    captureAbyss("session_claim_completed", {
                        flow,
                        new_session_id: createdSessionId,
                        chain_id: chainId,
                    });
                    await loadSessions();
                    navigate(`/game?sessionId=${createdSessionId}`);
                    return;
                }

                await new Promise((resolve) => setTimeout(resolve, 400));
            }

            captureAbyss("session_resolution_failed", {
                flow,
                stage: "poll_exhausted",
                chain_id: chainId,
            });
            await loadSessions();
        },
        [account, chainId, getPlayerSessions, loadSessions, navigate],
    );

    const handleShareOnX = useCallback(async () => {
        if (typeof window === "undefined" || !account || !connector) {
            return;
        }

        let availableBundles = bundles;
        let shareBundle = findShareBundle(availableBundles);

        if (!shareBundle) {
            const refreshed = await refreshBundles();
            availableBundles = refreshed ?? availableBundles;
            shareBundle = findShareBundle(availableBundles);
        }

        if (!shareBundle) {
            window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`,
                "_blank",
                "noopener,noreferrer",
            );
            captureAbyss("social_free_session_skipped", {
                reason: "no_share_bundle",
                chain_id: chainId,
            });
            return;
        }

        captureAbyss("social_free_session_started", {
            bundle_id: shareBundle.id,
            chain_id: chainId,
        });

        setIsCreating(true);
        try {
            const referralLink = `https://play.abyssgame.fun?ref=${account.address}`;
            const previousSessionIds = await getPlayerSessions(account.address);

            await claimFreeSessionBundle(shareBundle.id, referralLink, async () => {
                for (let attempt = 1; attempt <= 20; attempt += 1) {
                    const nextSessionIds = await getPlayerSessions(account.address);
                    const createdSessionId = nextSessionIds.find(
                        (sessionId) => !previousSessionIds.includes(sessionId),
                    );

                    if (createdSessionId !== undefined) {
                        captureAbyss("bundle_purchase_completed", {
                            bundle_id: shareBundle!.id,
                            new_session_id: createdSessionId,
                            bundle_kind: "social_free",
                            chain_id: chainId,
                        });
                        await loadSessions();
                        setIsCreating(false);
                        navigate(`/game?sessionId=${createdSessionId}`);
                        return;
                    }

                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
                console.warn("[ABYSS_BUNDLE] Polling timed out. Try refreshing the page.");
                captureAbyss("session_resolution_failed", {
                    flow: "social_free",
                    stage: "poll_exhausted",
                    chain_id: chainId,
                });
                await loadSessions();
                setIsCreating(false);
            });
        } catch (error) {
            console.error("Failed to open social claim bundle:", error);
            captureAbyss("bundle_flow_failed", {
                stage: "social_claim_error",
                chain_id: chainId,
                error_message: error instanceof Error ? error.message : "unknown",
            });
            setIsCreating(false);
        } finally {
            // Keep creating true until polling finishes or fails
        }
    }, [
        account,
        bundles,
        chain?.id,
        chainId,
        connector,
        getPlayerSessions,
        loadSessions,
        navigate,
        refreshBundles,
        shareMessage,
    ]);

    const handleClaimBeastSession = useCallback(async () => {
        captureAbyss("beast_session_claim_started", { chain_id: chainId });
        setIsCreating(true);
        try {
            await waitForClaimedSession(claimBeastSession, "beast");
        } catch (error) {
            console.error("Failed to claim Beast session:", error);
            captureAbyss("bundle_flow_failed", {
                stage: "beast_claim_error",
                chain_id: chainId,
                error_message: error instanceof Error ? error.message : "unknown",
            });
        } finally {
            setIsCreating(false);
        }
    }, [chainId, claimBeastSession, waitForClaimedSession]);

    const handleClaimGoldenChipRun = useCallback(async () => {
        if (!account || !connector || goldenChipRuns <= 0) {
            return;
        }

        captureAbyss("golden_chip_session_started", {
            chain_id: chainId,
            golden_chip_runs: goldenChipRuns,
        });

        setIsCreating(true);
        let goldenBundleId: number | null = null;
        try {
            let availableBundles = bundles;
            let goldenBundle = findGoldenChipBundle(availableBundles);

            if (!goldenBundle) {
                const refreshed = await refreshBundles();
                availableBundles = refreshed ?? availableBundles;
                goldenBundle = findGoldenChipBundle(availableBundles);
            }

            if (!goldenBundle) {
                console.error("Golden Chip bundle not found.");
                captureAbyss("bundle_flow_failed", {
                    stage: "golden_bundle_missing",
                    chain_id: chainId,
                });
                await loadSessions();
                return;
            }

            goldenBundleId = goldenBundle.id;
            captureAbyss("bundle_checkout_opened", {
                bundle_id: goldenBundleId,
                bundle_kind: "golden_chip",
                price_wei: goldenBundle.price.toString(),
                chain_id: chainId,
            });

            const controller = connector as ControllerConnector;
            const registry = getSetupAddress(chain?.id);
            const previousSessionIds = await getPlayerSessions(account.address);

            await controller.controller.openBundle(goldenBundle.id, registry, {
                onPurchaseComplete: async () => {
                    for (let attempt = 1; attempt <= 20; attempt += 1) {
                        const nextSessionIds = await getPlayerSessions(account.address);
                        const createdSessionId = nextSessionIds.find(
                            (sessionId) => !previousSessionIds.includes(sessionId),
                        );

                        if (createdSessionId !== undefined) {
                            captureAbyss("bundle_purchase_completed", {
                                bundle_id: goldenBundleId,
                                new_session_id: createdSessionId,
                                bundle_kind: "golden_chip",
                                chain_id: chainId,
                            });
                            await loadSessions();
                            setIsCreating(false);
                            navigate(`/game?sessionId=${createdSessionId}`);
                            return;
                        }

                        await new Promise((resolve) => setTimeout(resolve, 2000));
                    }

                    captureAbyss("bundle_flow_failed", {
                        stage: "golden_chip_poll_exhausted",
                        bundle_id: goldenBundleId,
                        chain_id: chainId,
                    });
                    await loadSessions();
                    setIsCreating(false);
                },
            });
        } catch (error) {
            console.error("Failed to claim Golden Chip run:", error);
            captureAbyss("bundle_flow_failed", {
                stage: "golden_chip_open_bundle_error",
                bundle_id: goldenBundleId,
                chain_id: chainId,
                error_message: error instanceof Error ? error.message : "unknown",
            });
            setIsCreating(false);
        }
    }, [
        account,
        bundles,
        chain?.id,
        chainId,
        connector,
        getPlayerSessions,
        goldenChipRuns,
        loadSessions,
        navigate,
        refreshBundles,
    ]);

    const handleClaimStreakLoot = useCallback(async () => {
        try {
            setIsStreakActionPending(true);
            await claimStreakLoot();
            await loadSessions();
        } catch (error) {
            console.error("Failed to claim streak loot:", error);
            captureAbyss("streak_loot_failed", {
                chain_id: chainId,
                error_message: error instanceof Error ? error.message : "unknown",
            });
        } finally {
            setIsStreakActionPending(false);
        }
    }, [chainId, claimStreakLoot, loadSessions]);

    const handleRecoverStreak = useCallback(async () => {
        try {
            setIsStreakActionPending(true);
            await recoverStreak();
            captureAbyss("streak_recover_success", { chain_id: chainId });
            await loadSessions();
        } catch (error) {
            console.error("Failed to recover streak:", error);
            captureAbyss("streak_recover_failed", {
                chain_id: chainId,
                error_message: error instanceof Error ? error.message : "unknown",
            });
        } finally {
            setIsStreakActionPending(false);
        }
    }, [chainId, recoverStreak, loadSessions]);

    const streakTodayUtc = utcDayIndexFromMs(nowMs);
    const streakUtcCountdown = formatHoursMinutesFromSeconds(secondsUntilNextUtcDay(nowMs));
    const streakLootReady =
        streakFeatureEnabled && Boolean(playerStreak && playerStreak.streakCount >= 7);
    const streakRecoverOffered =
        streakFeatureEnabled &&
        Boolean(
            playerStreak &&
                playerStreak.recoverPriorCount > 0 &&
                playerStreak.streakCount === 0 &&
                streakTodayUtc <= playerStreak.recoverDeadlineDayId,
        );
    const streakLootBarrierActive =
        streakFeatureEnabled &&
        Boolean(
            playerStreak &&
                playerStreak.streakCount === 0 &&
                playerStreak.lootClaimBarrierDayId !== 0 &&
                streakTodayUtc <= playerStreak.lootClaimBarrierDayId,
        );

    return (
        <div style={styles.container}>
            {/* Navigation Row */}
            <div style={styles.navRow}>
                <motion.button
                    style={styles.navButton}
                    onClick={handleBack}
                    whileHover={{ opacity: 1, color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    ← back
                </motion.button>
                <motion.button
                    style={styles.navButton}
                    onClick={handleLogout}
                    whileHover={{ opacity: 1, color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    logout
                </motion.button>
            </div>

            <div style={styles.content}>
                {/* Create New Session */}
                <motion.button
                    style={{
                        ...styles.newSessionButton,
                        opacity: isCreating ? 0.6 : 1,
                    }}
                    onClick={handleCreateSessionClick}
                    disabled={isCreating}
                    whileHover={{ color: "#FF841C" }}
                    whileTap={{ scale: 0.95 }}
                >
                    {isCreating ? (
                        <span>
                            &gt; OPENING...{" "}
                            <motion.span
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                                style={{ display: "inline-block" }}
                            >
                                ⟳
                            </motion.span>
                        </span>
                    ) : bundlesStatus === "loading" ? (
                        <span>&gt; LOADING RUN...</span>
                    ) : (
                        <span>&gt; NEW RUN</span>
                    )}
                </motion.button>

                {streakFeatureEnabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            ...styles.perksPanel,
                            marginTop: 8,
                            width: "100%",
                            padding: "12px 14px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                            <img
                                src="/images/streak.png"
                                alt=""
                                width={56}
                                height={56}
                                style={{
                                    flexShrink: 0,
                                    width: 56,
                                    height: 56,
                                    objectFit: "contain",
                                }}
                            />
                            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap" as const,
                                        alignItems: "baseline",
                                        justifyContent: "space-between",
                                        gap: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 9,
                                            color: "#FF841C",
                                            letterSpacing: 1,
                                            textTransform: "uppercase" as const,
                                        }}
                                    >
                                        <Flame size={14} aria-hidden strokeWidth={2.2} />
                                        <span>Streak</span>
                                    </div>
                                    <span
                                        style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: 10,
                                            color: "rgba(212,203,191,0.45)",
                                            letterSpacing: "0.06em",
                                            textTransform: "uppercase" as const,
                                        }}
                                    >
                                        UTC · 7 days
                                    </span>
                                </div>
                                {playerStreak ? (
                                    streakLootBarrierActive ? (
                                        <>
                                            <StreakUtcDayPips filled={0} lootReady={false} muted />
                                            <p
                                                style={{
                                                    margin: 0,
                                                    fontFamily: "var(--font-body)",
                                                    color: "#cbbfb0",
                                                    fontSize: 13,
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                Weekly loot claimed. Start counting again after you{' '}
                                                <strong style={{ color: "#f2ebe3" }}>finish a session</strong> on a later
                                                UTC day (the claim day does not count).
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <StreakUtcDayPips
                                                filled={
                                                    streakLootReady
                                                        ? STREAK_TRACKER_DAYS
                                                        : Math.min(playerStreak.streakCount, STREAK_TRACKER_DAYS)
                                                }
                                                lootReady={streakLootReady}
                                            />
                                            {streakLootReady ? (
                                                <div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontFamily: "'PressStart2P', monospace",
                                                            fontSize: 9,
                                                            color: "#f6efe6",
                                                            lineHeight: 1.6,
                                                        }}
                                                    >
                                                        WEEKLY LOOT READY
                                                    </p>
                                                    <p
                                                        style={{
                                                            margin: "6px 0 0",
                                                            fontFamily: "var(--font-body)",
                                                            fontSize: 13,
                                                            color: "#d4cbbf",
                                                            lineHeight: 1.45,
                                                        }}
                                                    >
                                                        One charm roll · rarity weights{' '}
                                                        <span style={{ color: "#c8baa8", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                                                            60% / 30% / 8% / 2%
                                                        </span>
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexWrap: "wrap" as const,
                                                            alignItems: "baseline",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontFamily: "'PressStart2P', monospace",
                                                                fontSize: 20,
                                                                color: "#f6efe6",
                                                                letterSpacing: 1,
                                                            }}
                                                        >
                                                            {Math.min(playerStreak.streakCount, STREAK_TRACKER_DAYS)}
                                                            <span
                                                                style={{
                                                                    fontSize: 11,
                                                                    color: "rgba(235,224,212,0.45)",
                                                                    marginLeft: 4,
                                                                    marginRight: 4,
                                                                }}
                                                            >
                                                                /
                                                            </span>
                                                            {STREAK_TRACKER_DAYS}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontFamily: "var(--font-body)",
                                                                fontSize: 12,
                                                                color: "#9a8f82",
                                                                textTransform: "uppercase" as const,
                                                                letterSpacing: "0.08em",
                                                            }}
                                                        >
                                                            days toward loot
                                                        </span>
                                                    </div>
                                                    <p
                                                        style={{
                                                            margin: 0,
                                                            fontFamily: "var(--font-body)",
                                                            fontSize: 13,
                                                            color: "#c9bfb2",
                                                            lineHeight: 1.45,
                                                        }}
                                                    >
                                                        One qualifying session per UTC day. Next boundary in{" "}
                                                        <strong style={{ color: "#e8ddcf" }}>{streakUtcCountdown}</strong>.
                                                    </p>
                                                </>
                                            )}
                                        </>
                                    )
                                ) : (
                                    <p
                                        style={{
                                            margin: 0,
                                            fontFamily: "var(--font-body)",
                                            color: "#b8a995",
                                            fontSize: 13,
                                        }}
                                    >
                                        Could not load streak. Refresh or check your connection.
                                    </p>
                                )}
                            </div>
                        </div>
                        {playerStreak &&
                            !streakLootBarrierActive &&
                            (streakLootReady ||
                                streakRecoverOffered ||
                                (playerStreak.recoverPriorCount > 0 && !streakRecoverOffered)) ? (
                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap" as const,
                                        gap: 10,
                                        paddingTop: 2,
                                        borderTop: "1px solid rgba(255, 132, 28, 0.12)",
                                    }}
                                >
                                    {streakLootReady ? (
                                        <motion.button
                                            type="button"
                                            onClick={handleClaimStreakLoot}
                                            disabled={isStreakActionPending}
                                            whileHover={{ color: "#FF841C" }}
                                            whileTap={{ scale: isStreakActionPending ? 1 : 0.98 }}
                                            style={{
                                                fontFamily: "var(--font-body)",
                                                fontSize: 14,
                                                color: "#f6efe6",
                                                background: "#1c0f07",
                                                border: "1px solid rgba(255, 132, 28, 0.55)",
                                                borderRadius: 8,
                                                padding: "10px 16px",
                                                cursor: isStreakActionPending ? "default" : "pointer",
                                                opacity: isStreakActionPending ? 0.55 : 1,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                        >
                                            <Sparkles size={16} aria-hidden strokeWidth={2} />
                                            {isStreakActionPending ? "Claiming..." : "Claim weekly loot"}
                                        </motion.button>
                                    ) : null}
                                    {streakRecoverOffered ? (
                                        <motion.button
                                            type="button"
                                            onClick={handleRecoverStreak}
                                            disabled={isStreakActionPending}
                                            whileHover={{ color: "#FF841C" }}
                                            whileTap={{ scale: isStreakActionPending ? 1 : 0.98 }}
                                            style={{
                                                fontFamily: "var(--font-body)",
                                                fontSize: 14,
                                                color: "#f6efe6",
                                                background: "#1c0f07",
                                                border: "1px solid rgba(255, 132, 28, 0.55)",
                                                borderRadius: 8,
                                                padding: "10px 16px",
                                                cursor: isStreakActionPending ? "default" : "pointer",
                                                opacity: isStreakActionPending ? 0.55 : 1,
                                            }}
                                        >
                                            {isStreakActionPending ? "Recovering..." : `Recover (${playerStreak.recoverPriorCount} days) · burn 666 CHIP`}
                                        </motion.button>
                                    ) : playerStreak.recoverPriorCount > 0 ? (
                                        <span
                                            style={{
                                                fontFamily: "var(--font-body)",
                                                fontSize: 13,
                                                color: "rgba(241,229,217,0.55)",
                                                alignSelf: "center",
                                            }}
                                        >
                                            Recovery expired — streak reset.
                                        </span>
                                    ) : null}
                                </div>
                            ) : null}
                    </motion.div>
                )}

                {/* Pre-run Charm Loadout */}
                {charmsEnabled && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                            border: "1px solid rgba(255, 132, 28, 0.35)",
                            borderRadius: 12,
                            background: "#0a0402",
                            padding: "12px 14px",
                            boxShadow: "0 0 0 1px rgba(255,132,28,0.08) inset",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: 10,
                                    color: "#FF841C",
                                    letterSpacing: 1,
                                    textTransform: "uppercase",
                                }}
                            >
                                <Sparkles size={12} />
                                Charm Loadout
                            </div>
                            <span
                                style={{
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: 8,
                                    color: charmLoadout.loadout.length > 0 ? "#4ADE80" : "rgba(255,255,255,0.45)",
                                    letterSpacing: 0.5,
                                    border: "1px solid rgba(255,132,28,0.35)",
                                    borderRadius: 999,
                                    padding: "3px 8px",
                                    background: "#120700",
                                }}
                            >
                                {charmLoadout.loadout.length}/{charmLoadout.maxCharms}
                            </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: 6,
                                    flex: 1,
                                }}
                            >
                                {Array.from({ length: charmLoadout.maxCharms }).map((_, idx) => {
                                    const charmId = charmLoadout.loadout[idx];
                                    const def = charmId ? STATIC_CHARM_DEFINITIONS[charmId] : null;
                                    return (
                                        <div
                                            key={`pre-slot-${idx}`}
                                            style={{
                                                height: 44,
                                                border: def
                                                    ? "1px solid rgba(255, 132, 28, 0.5)"
                                                    : "1px dashed rgba(255, 132, 28, 0.25)",
                                                borderRadius: 6,
                                                background: "#000",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {def ? (
                                                <img
                                                    src={def.image}
                                                    alt={def.name}
                                                    style={{
                                                        width: "70%",
                                                        height: "70%",
                                                        objectFit: "contain",
                                                        imageRendering: "pixelated",
                                                    }}
                                                />
                                            ) : (
                                                <Flame size={14} color="rgba(255, 132, 28, 0.35)" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <motion.button
                                onClick={handleOpenPrerunLoadout}
                                whileHover={{ borderColor: "#FF841C", color: "#FF841C" }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    background: "#160900",
                                    border: "1px solid rgba(255, 132, 28, 0.5)",
                                    borderRadius: 6,
                                    padding: "0 14px",
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: 9,
                                    color: "rgba(255, 132, 28, 0.9)",
                                    letterSpacing: 1,
                                    cursor: "pointer",
                                    textTransform: "uppercase",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {charmLoadout.loadout.length === 0 ? "BIND >" : "EDIT >"}
                            </motion.button>
                        </div>
                    </motion.div>
                )}

                {config && (() => {
                    const sessionBundle =
                        bundles.find((b) => b.id === CONTRACTS.SESSION_BUNDLE_ID) ??
                        bundles.find((b) => b.price > 0n);
                    const entryUsd = sessionBundle
                        ? Number(sessionBundle.price) / 1_000_000
                        : 1;
                    return (
                        <BreakevenBreakdown
                            entryUsd={entryUsd}
                            chipEmissionRate={config.chipEmissionRate}
                            chipBoostMultiplier={config.chipBoostMultiplier}
                            chipsPerUsdc={chipsPerUsdc}
                            isLoadingPrice={isLoadingPrice}
                        />
                    );
                })()}

                <motion.div
                    style={{
                        ...styles.perksPanel,
                        borderColor: hasAnyGoldenChip ? "rgba(255, 211, 106, 0.55)" : "rgba(255, 132, 28, 0.25)",
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div style={styles.perksHeader}>Golden Chip Weekly Runs</div>
                    <div style={styles.perkCard}>
                        <div style={styles.perkTitleRow}>
                            <span style={styles.perkTitle}>Golden Chip</span>
                            <span style={{
                                ...styles.perkBadge,
                                background: hasControllerGoldenChip
                                    ? goldenChipRuns > 0 ? "#2B1A00" : "#4ADE80"
                                    : hasDelegateGoldenChip ? "#2B1A00" : styles.perkBadge.background,
                                color: hasControllerGoldenChip
                                    ? goldenChipRuns > 0 ? "#FFD36A" : "#000"
                                    : hasDelegateGoldenChip ? "#FFD36A" : styles.perkBadge.color,
                                borderColor: hasAnyGoldenChip ? "rgba(255, 211, 106, 0.65)" : styles.perkBadge.border,
                            }}>
                                {hasControllerGoldenChip
                                    ? goldenChipRuns > 0
                                        ? `${goldenChipRuns} WEEKLY RUN${goldenChipRuns !== 1 ? "S" : ""}`
                                        : "CLAIMED"
                                    : hasDelegateGoldenChip
                                        ? "TRANSFER NEEDED"
                                        : "NO CHIP"}
                            </span>
                        </div>
                        <div style={styles.perkBody}>
                            {hasControllerGoldenChip
                                ? goldenChipRuns > 0
                                    ? "Your Controller has Golden Chip weekly runs available. Claim one run at a time through Cartridge."
                                    : "Your Golden Chip weekly runs are claimed for this cycle."
                                : hasDelegateGoldenChip
                                    ? "Golden Chip detected on your owner wallet. Transfer it to your Controller account to claim runs in-game."
                                    : "No Golden Chip detected on this Controller account."}
                        </div>
                        {showGoldenChipResetCountdown && (
                            <div style={styles.perkCountdown}>
                                Resets in {goldenChipResetCountdown}
                            </div>
                        )}
                        <motion.button
                            style={{
                                ...styles.perkAction,
                                opacity: (isCreating || goldenChipRuns <= 0 || !hasControllerGoldenChip) ? 0.6 : 1,
                                cursor: (isCreating || goldenChipRuns <= 0 || !hasControllerGoldenChip) ? "default" : "pointer",
                                color: "#FFD36A",
                                borderColor: "#FFD36A",
                                background: "#1B1000",
                            }}
                            onClick={handleClaimGoldenChipRun}
                            disabled={isCreating || goldenChipRuns <= 0 || !hasControllerGoldenChip}
                            whileHover={!(isCreating || goldenChipRuns <= 0 || !hasControllerGoldenChip) ? { scale: 1.03 } : {}}
                            whileTap={!(isCreating || goldenChipRuns <= 0 || !hasControllerGoldenChip) ? { scale: 0.97 } : {}}
                        >
                            {hasControllerGoldenChip
                                ? goldenChipRuns > 0 ? "Claim Golden Run" : "Claimed"
                                : hasDelegateGoldenChip ? "Move Chip to Controller" : "No Golden Chip"}
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div
                    style={styles.perksPanel}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div style={styles.perksHeader}>Abyss Perks</div>
                    <div style={styles.perksGrid}>
                        {beastSessions > 0 && (
                            <div style={styles.perkCard}>
                                <div style={styles.perkTitleRow}>
                                    <span style={styles.perkTitle}>Beast Holder Bonus</span>
                                    <span style={styles.perkBadge}>
                                        {beastSessions} FREE RUN{beastSessions !== 1 ? "S" : ""}
                                    </span>
                                </div>
                                <div style={styles.perkBody}>
                                    Your wallet holds a Beast. Claim your complimentary session directly onchain.
                                </div>
                                <motion.button
                                    style={styles.perkAction}
                                    onClick={handleClaimBeastSession}
                                    disabled={isCreating}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Claim Beast Run
                                </motion.button>
                            </div>
                        )}

                        <div style={styles.perkCard}>
                            <div style={styles.perkTitleRow}>
                                <span style={styles.perkTitle}>Whisper Abyss on X</span>
                                <span style={{
                                    ...styles.perkBadge,
                                    background: isClaimed ? "#4ADE80" : styles.perkBadge.background,
                                    color: isClaimed ? "#000" : styles.perkBadge.color,
                                }}>{isClaimed ? "CLAIMED" : "SOCIAL CLAIM"}</span>
                            </div>
                            <div style={styles.perkBody}>
                                {isClaimed 
                                    ? "You've successfully claimed your social run. Spread the word and keep surviving!"
                                    : "Share the game on X through Cartridge's social claim flow to unlock a one-time free Abyss run."}
                            </div>
                            <motion.button
                                style={{
                                    ...styles.perkAction,
                                    opacity: (isCreating || isClaimed) ? 0.6 : 1,
                                    cursor: (isCreating || isClaimed) ? "default" : "pointer",
                                }}
                                onClick={handleShareOnX}
                                disabled={isCreating || isClaimed}
                                whileHover={!(isCreating || isClaimed) ? { scale: 1.03 } : {}}
                                whileTap={!(isCreating || isClaimed) ? { scale: 0.97 } : {}}
                            >
                                {isClaimed ? "CLAIMED" : "Share on X"}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Active Sessions */}
                <div>
                    <p style={styles.sectionTitle}>active runs</p>

                    {isLoading ? (
                        <p style={styles.loading}>loading runs...</p>
                    ) : sessions.length === 0 ? (
                        <p style={styles.noSessions}>no active runs</p>
                    ) : (
                        <AnimatePresence>
                            {sessions.map((session) => {
                                const isFresh = session.totalSpins === 0;
                                const showCharms = charmAddress && charmAddress !== "0x0";
                                return (
                                    <motion.div
                                        key={session.sessionId}
                                        style={{ ...styles.sessionCard, marginBottom: 12 }}
                                        onClick={() => handleSelectSession(session.sessionId)}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={styles.sessionCardHover}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <div style={styles.sessionInfo}>
                                            <span style={styles.sessionId}>
                                                RUN #{session.sessionId}
                                            </span>
                                            <div style={styles.sessionStats}>
                                                <div style={styles.stat}>
                                                    <span style={styles.statValue}>{session.level}</span>
                                                    <span style={styles.statLabel}>LEVEL</span>
                                                </div>
                                                <div style={styles.stat}>
                                                    <span style={styles.statValue}>{session.score}</span>
                                                    <span style={styles.statLabel}>SCORE</span>
                                                </div>
                                                <div style={styles.stat}>
                                                    <span style={{
                                                        ...styles.statValue,
                                                        ...(session.spinsRemaining <= 1 ? styles.spinsWarning : {}),
                                                    }}>
                                                        {session.spinsRemaining}
                                                    </span>
                                                    <span style={styles.statLabel}>SPINS</span>
                                                </div>
                                            </div>
                                        </div>
                                        {showCharms && (
                                            <motion.button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenLoadout(session);
                                                }}
                                                whileHover={{ scale: 1.03, borderColor: "#FF841C" }}
                                                whileTap={{ scale: 0.97 }}
                                                style={{
                                                    marginTop: 12,
                                                    width: "100%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: 8,
                                                    background: isFresh
                                                        ? "linear-gradient(90deg, rgba(255,132,28,0.12), rgba(255,132,28,0.04))"
                                                        : "rgba(0,0,0,0.4)",
                                                    border: `1px solid ${isFresh ? "rgba(255,132,28,0.5)" : "rgba(255,255,255,0.12)"}`,
                                                    borderRadius: 6,
                                                    padding: "10px 12px",
                                                    fontFamily: "'PressStart2P', monospace",
                                                    fontSize: 9,
                                                    color: isFresh ? "#FF841C" : "rgba(255,255,255,0.55)",
                                                    letterSpacing: 1,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <Sparkles size={11} />
                                                {isFresh ? "CHARM LOADOUT" : "VIEW CHARMS"}
                                            </motion.button>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            <CharmLoadoutModal
                isOpen={configuringSession !== null}
                onClose={handleCloseLoadout}
                ownedCharmIds={ownedCharmIds}
                loadout={charmLoadout.loadout}
                onToggle={charmLoadout.toggle}
                onClear={charmLoadout.clear}
                onSeal={handleSealLoadout}
                isLocked={(configuringSession?.totalSpins ?? 0) > 0}
                isSubmitting={isSealingLoadout}
                alreadyEquippedIds={sessionCharmIds}
            />

            <CharmLoadoutModal
                isOpen={isPrerunLoadoutOpen}
                onClose={handleClosePrerunLoadout}
                ownedCharmIds={ownedCharmIds}
                loadout={charmLoadout.loadout}
                onToggle={charmLoadout.toggle}
                onClear={charmLoadout.clear}
                onSeal={handleSealPrerunLoadout}
                isLocked={false}
                isSubmitting={isSavingPrerunLoadout}
            />
        </div>
    );
}
