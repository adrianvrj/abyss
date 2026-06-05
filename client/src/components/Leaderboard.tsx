import { useMemo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard, LeaderboardEntry } from "@/utils/abyssContract";
import { LeaderboardApi, type LeaderboardWindow } from "@/api/torii/leaderboard";
import { getActiveSeason, type RpcSeason } from "@/api/rpc/season";
import { ArrowLeft, Trophy, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useController } from "@/hooks/useController";
import { useAbyssActions } from "@/hooks/actions";
import { useEntities } from "@/context/entities";
import { STATIC_CHARM_DEFINITIONS } from "@/lib/charmCatalog";
import { getItemImage } from "@/utils/itemImages";

const headerStyle: React.CSSProperties = {
    fontFamily: "'PressStart2P', monospace",
    fontSize: "10px",
    color: "#FF841C",
};

const DISCORD_INVITE_URL = "https://discord.gg/UspD94Z5p7";

function formatCountdown(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Leaderboard() {
    const navigate = useNavigate();
    const { address, connector } = useController();
    const { chainId } = useEntities();
    const [selectedWindow, setSelectedWindow] = useState<LeaderboardWindow>("weekly");
    const [now, setNow] = useState(() => Date.now());
    const { claimPrize, seasonAddress } = useAbyssActions();
    const [claiming, setClaiming] = useState(false);
    const [claimMessage, setClaimMessage] = useState<string | null>(null);

    // Active season drives the tournament tab: its on-chain leaderboard_id scopes
    // the board, its end_ts the countdown, and its pool the prize amounts.
    const { data: season } = useQuery<RpcSeason>({
        queryKey: ["season", "active", chainId?.toString() ?? "default"],
        queryFn: () => getActiveSeason(chainId),
        enabled: Boolean(seasonAddress),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const seasonLeaderboardId = useMemo(() => {
        if (!season?.leaderboardId) return undefined;
        try {
            return Number(BigInt(season.leaderboardId));
        } catch {
            return undefined;
        }
    }, [season?.leaderboardId]);

    const isTournament = selectedWindow === "tournament";

    const { data: entries = [], isLoading } = useQuery<LeaderboardEntry[]>({
        queryKey: [
            ...LeaderboardApi.keys.all(
                chainId,
                isTournament ? "all-time" : selectedWindow,
                isTournament ? seasonLeaderboardId : undefined,
            ),
            "top10",
        ],
        // Tournament board is scoped purely by the season's leaderboard_id (each
        // season has a fresh id), so query "all-time" with that id.
        queryFn: () =>
            getLeaderboard(
                chainId,
                isTournament ? "all-time" : selectedWindow,
                isTournament ? seasonLeaderboardId : undefined,
            ),
        enabled: !isTournament || seasonLeaderboardId !== undefined,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    });

    const leaderboardData = useMemo(() => entries.slice(0, 10), [entries]);
    const loading = isLoading;

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const handleOpenProfile = useCallback(() => {
        try {
            const ctrl = connector as any;
            if (ctrl?.controller?.openProfile) {
                ctrl.controller.openProfile();
            } else if (ctrl?.openProfile) {
                ctrl.openProfile();
            }
        } catch (e) {
            console.log("Controller profile not available:", e);
        }
    }, [connector]);

    const formatAddress = (addr: string) => {
        if (address && addr.toLowerCase() === address.toLowerCase()) {
            return "you";
        }
        if (addr.length <= 10) return addr;
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const isCurrentUser = (addr: string) => {
        return address && addr.toLowerCase() === address.toLowerCase();
    };

    const handleDiscord = useCallback(() => {
        window.open(DISCORD_INVITE_URL, "_blank", "noopener,noreferrer");
    }, []);

    const seasonEndMs = season ? season.endTs * 1000 : null;
    const seasonEnded = seasonEndMs != null && now >= seasonEndMs;
    const poolUsdc = season ? Number(season.poolAmount) / 1e6 : 0;

    const tournamentPrizes = useMemo(() => {
        const splits: [string, number][] = [["1st", 0.5], ["2nd", 0.3], ["3rd", 0.2]];
        return splits.map(([place, pct]) => ({
            place,
            prize: poolUsdc > 0 ? `${(poolUsdc * pct).toFixed(2)} USDC` : `${pct * 100}%`,
        }));
    }, [poolUsdc]);

    // The connected player's rank in the current season board (0-indexed). Only
    // the top 3 can claim, and only once the season has ended.
    const userRank = useMemo(() => {
        if (!address) return -1;
        return leaderboardData.findIndex(
            (e) => e.player_address.toLowerCase() === address.toLowerCase(),
        );
    }, [address, leaderboardData]);
    const canClaim = isTournament && seasonEnded && userRank >= 0 && userRank < 3;

    const handleClaim = useCallback(async () => {
        if (!season) return;
        setClaiming(true);
        setClaimMessage(null);
        try {
            const receipt = await claimPrize(season.seasonId);
            const amt = receipt.events.prizeClaimed?.amount ?? 0n;
            setClaimMessage(`Claimed ${(Number(amt) / 1e6).toFixed(2)} USDC 🎉`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setClaimMessage(msg.includes("No prize") ? "Nothing to claim" : "Claim failed");
        } finally {
            setClaiming(false);
        }
    }, [season, claimPrize]);

    const getWindowDescription = () => {
        if (selectedWindow === "weekly") return "Best runs from the last 7 days.";
        if (selectedWindow === "tournament") {
            if (!season) return "Loading season…";
            if (seasonEndMs != null && now < seasonEndMs) {
                return `SEASON ${season.seasonId} ENDS: ${formatCountdown(seasonEndMs - now)}`;
            }
            return `SEASON ${season.seasonId} ENDED`;
        }
        return "Best runs across the current season.";
    };

    const renderBuild = (entry: LeaderboardEntry) => {
        const charms = (entry.charm_ids ?? []).slice(0, 3);
        const items = (entry.item_ids ?? []).filter((id) => id > 0 && id < 1000).slice(0, 7);

        if (charms.length === 0 && items.length === 0) {
            return (
                <span style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: 7,
                    color: "rgba(255,255,255,0.35)",
                    textTransform: "uppercase",
                }}>
                    No build
                </span>
            );
        }

        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
                {charms.map((charmId) => {
                    const charm = STATIC_CHARM_DEFINITIONS[charmId];
                    return (
                        <img
                            key={`charm-${charmId}`}
                            src={charm?.image ?? `/images/charms/${charmId}.png`}
                            alt={charm?.name ?? `Charm ${charmId}`}
                            title={charm?.name ?? `Charm #${charmId}`}
                            width={22}
                            height={22}
                            loading="lazy"
                            style={{
                                width: 24,
                                height: 24,
                                objectFit: "contain",
                                imageRendering: "pixelated",
                            }}
                        />
                    );
                })}
                {items.map((itemId) => (
                    <img
                        key={`item-${itemId}`}
                        src={getItemImage(itemId)}
                        alt={`Item ${itemId}`}
                        title={`Item #${itemId}`}
                        width={22}
                        height={22}
                        loading="lazy"
                        style={{
                            width: 24,
                            height: 24,
                            objectFit: "contain",
                            imageRendering: "pixelated",
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#000",
            padding: "20px",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
        }}>
            {/* Header */}
            <div style={{
                width: "100%",
                maxWidth: "600px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "24px",
            }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF841C",
                        cursor: "pointer",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{
                    fontFamily: "'PressStart2P', monospace",
                    fontSize: "14px",
                    color: "#FF841C",
                    margin: 0,
                    letterSpacing: "2px",
                }}>
                    LEADERBOARD
                </h1>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        onClick={handleOpenProfile}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#FF841C",
                            cursor: "pointer",
                            padding: "8px",
                        }}
                    >
                        <User size={20} />
                    </button>
                </div>
            </div>

            <div style={{ width: "100%", maxWidth: "600px" }}>
                <div
                    role="tablist"
                    aria-label="Leaderboard window"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 8,
                        marginBottom: 14,
                        padding: 4,
                        border: "1px solid rgba(255, 132, 28, 0.35)",
                        borderRadius: 8,
                        background: "rgba(255, 132, 28, 0.06)",
                    }}
                >
                    {([
                        ["tournament", "Tournament"],
                        ["weekly", "Weekly"],
                        ["all-time", "All time"],
                    ] as [LeaderboardWindow, string][]).map(([window, label]) => {
                        const active = selectedWindow === window;
                        return (
                            <button
                                key={window}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setSelectedWindow(window)}
                                style={{
                                    minHeight: 38,
                                    border: active ? "1px solid #FF841C" : "1px solid transparent",
                                    borderRadius: 6,
                                    background: active ? "#1c0f07" : "transparent",
                                    color: active ? "#f6efe6" : "rgba(255,255,255,0.62)",
                                    cursor: "pointer",
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: label.length > 9 ? 7 : 9,
                                    textTransform: "uppercase",
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
                <div
                    style={{
                        marginBottom: 12,
                        fontFamily: "var(--font-body)",
                        fontSize: 13,
                        color: "rgba(212,203,191,0.72)",
                        textAlign: "center",
                        lineHeight: 1.55,
                    }}
                >
                    {getWindowDescription()}
                </div>
                {isTournament && (
                    <div
                        style={{
                            marginBottom: 14,
                            padding: 12,
                            border: "1px solid rgba(255, 132, 28, 0.28)",
                            borderRadius: 8,
                            background: "rgba(255, 132, 28, 0.045)",
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                gap: 8,
                                marginBottom: 12,
                            }}
                        >
                            {tournamentPrizes.map((reward) => (
                                <div
                                    key={reward.place}
                                    style={{
                                        minHeight: 54,
                                        padding: "10px 6px",
                                        border: "1px solid rgba(255, 132, 28, 0.24)",
                                        borderRadius: 6,
                                        background: "rgba(0,0,0,0.22)",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 8,
                                            color: "rgba(255,132,28,0.88)",
                                        }}
                                    >
                                        {reward.place}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'PressStart2P', monospace",
                                            fontSize: 9,
                                            color: "rgba(246,239,230,0.86)",
                                            textAlign: "center",
                                            lineHeight: 1.45,
                                        }}
                                    >
                                        {reward.prize}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {seasonEnded ? (
                            <button
                                type="button"
                                onClick={handleClaim}
                                disabled={!canClaim || claiming}
                                style={{
                                    width: "100%",
                                    minHeight: 38,
                                    border: "1px solid rgba(255,132,28,0.5)",
                                    borderRadius: 6,
                                    background: canClaim ? "rgba(255,132,28,0.18)" : "rgba(255,255,255,0.035)",
                                    color: canClaim ? "#FF841C" : "rgba(246,239,230,0.5)",
                                    cursor: canClaim && !claiming ? "pointer" : "default",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    fontFamily: "var(--font-body)",
                                    fontSize: 12,
                                }}
                            >
                                <Trophy size={16} aria-hidden="true" />
                                {claiming
                                    ? "Claiming…"
                                    : claimMessage
                                        ? claimMessage
                                        : canClaim
                                            ? `Claim prize (#${userRank + 1})`
                                            : "Only the top 3 can claim"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDiscord}
                                style={{
                                    width: "100%",
                                    minHeight: 38,
                                    border: "1px solid rgba(255,255,255,0.16)",
                                    borderRadius: 6,
                                    background: "rgba(255,255,255,0.035)",
                                    color: "rgba(246,239,230,0.78)",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 8,
                                    fontFamily: "var(--font-body)",
                                    fontSize: 12,
                                }}
                            >
                                <svg width="18" height="18" aria-hidden="true">
                                    <use href="/icons.svg#discord-icon" />
                                </svg>
                                Join Discord for season updates
                            </button>
                        )}
                    </div>
                )}
                {loading ? (
                    <div style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        alignItems: "center",
                        justifyContent: "center",
                        height: "50vh",
                        gap: "16px",
                    }}>
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            style={{
                                width: "32px",
                                height: "32px",
                                border: "3px solid #FF841C",
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                            }} 
                        />
                        <span style={{
                            fontFamily: "'PressStart2P', monospace",
                            fontSize: "10px",
                            color: "#FF841C",
                        }}>
                            Loading...
                        </span>
                    </div>
                ) : (
                    <>
                        <div style={{
                            display: "flex",
                            padding: "12px 16px",
                            borderBottom: "2px solid #FF841C",
                            marginBottom: "8px",
                        }}>
                            <span style={{ ...headerStyle, width: "40px" }}>#</span>
                            <span style={{ ...headerStyle, flex: 1 }}>Player</span>
                            <span style={{ ...headerStyle, width: "160px", textAlign: "center" }}>Build</span>
                            <span style={{ ...headerStyle, width: "80px", textAlign: "right" }}>Best</span>
                        </div>

                        <AnimatePresence>
                            {leaderboardData.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px",
                                    color: "rgba(255,255,255,0.5)",
                                    fontFamily: "'PressStart2P', monospace",
                                    fontSize: "10px",
                                }}>
                                    No entries yet
                                </div>
                            ) : (
                                leaderboardData.map((entry, index) => {
                                    const isPodium = index < 3;
                                    const isCurrent = isCurrentUser(entry.player_address);
                                    const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
                                    const prize = isTournament ? TOURNAMENT_PRIZES[index]?.prize : undefined;
                                    const podiumBorder = isTournament ? "rgba(255, 132, 28, 0.28)" : medalColors[index];
                                    const podiumScoreColor = isTournament ? "#FF841C" : "#FFD700";

                                    return (
                                        <motion.div
                                            key={`${entry.player_address}-${index}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.03, duration: 0.2 }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "12px 16px",
                                                marginBottom: "8px",
                                                background: isCurrent
                                                    ? "rgba(255, 132, 28, 0.15)"
                                                    : isPodium
                                                        ? isTournament ? "rgba(255, 132, 28, 0.055)" : "rgba(255, 215, 0, 0.05)"
                                                        : "rgba(255, 255, 255, 0.03)",
                                                borderRadius: "8px",
                                                border: isCurrent
                                                    ? "2px solid #FF841C"
                                                    : isPodium
                                                        ? `2px solid ${podiumBorder}`
                                                        : "1px solid rgba(255, 255, 255, 0.1)",
                                            }}
                                        >
                                            <div style={{
                                                width: "32px",
                                                height: "32px",
                                                borderRadius: "50%",
                                                background: isPodium
                                                    ? isTournament ? "rgba(255,132,28,0.16)" : medalColors[index]
                                                    : "rgba(255, 255, 255, 0.1)",
                                                border: isPodium && isTournament ? "1px solid rgba(255,132,28,0.34)" : "none",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginRight: "12px",
                                            }}>
                                                {isPodium ? (
                                                    <Trophy size={14} color={isTournament ? "#FF841C" : index === 0 ? "#000" : "#fff"} />
                                                ) : (
                                                    <span style={{
                                                        fontFamily: "'PressStart2P', monospace",
                                                        fontSize: "10px",
                                                        color: "#fff",
                                                    }}>
                                                        {index + 1}
                                                    </span>
                                                )}
                                            </div>

                                            <span style={{
                                                flex: 1,
                                                fontFamily: "'PressStart2P', monospace",
                                                fontSize: "10px",
                                                color: isCurrent ? "#FF841C" : "#fff",
                                            }}>
                                                {entry.username || formatAddress(entry.player_address)}
                                            </span>

                                            <div style={{ width: "160px", minHeight: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                {renderBuild(entry)}
                                            </div>

                                            <div style={{
                                                width: "80px",
                                                textAlign: "right",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-end",
                                                gap: 4,
                                            }}>
                                                <span style={{
                                                    fontFamily: "'PressStart2P', monospace",
                                                    fontSize: isPodium ? "12px" : "10px",
                                                    color: isPodium ? podiumScoreColor : "#fff",
                                                    fontWeight: isPodium ? "bold" : "normal",
                                                }}>
                                                    {entry.best_score}
                                                </span>
                                                {prize && (
                                                    <span style={{
                                                        fontFamily: "'PressStart2P', monospace",
                                                        fontSize: 7,
                                                        color: "rgba(255,132,28,0.74)",
                                                        lineHeight: 1.2,
                                                    }}>
                                                        {prize}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
}
