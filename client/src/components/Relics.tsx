import { useState, useEffect, useCallback } from "react";
import { useNetwork } from "@starknet-react/core";
import { useController } from "@/hooks/useController";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    DEFAULT_CHAIN_ID,
    getChipAddress,
    getRelicNftAddress,
} from "@/config";
import { CHIP_TOKEN_IMAGE_URL } from "@/lib/constants";
import { getRpcProvider } from "@/api/rpc/provider";
import { ArrowLeft } from "lucide-react";

// Relic data matching the contract configuration
const RELICS = [
    {
        id: 1,
        name: "Mortis",
        description: "Gentleman of Death - Forces a random jackpot",
        effect: "Force Random Jackpot",
        price: 44444,
        maxSupply: 30,
        rarity: "Mythic",
        image: "/images/relics/mortis.png",
        cooldown: 15,
        stats: { luck: 1, vitality: 1 },
    },
    {
        id: 2,
        name: "Phantom",
        description: "The Timeless Specter - Resets to Max Spins",
        effect: "Reset to Max Spins",
        price: 33333,
        maxSupply: 40,
        rarity: "Mythic",
        image: "/images/relics/phantom.png",
        cooldown: 15,
        stats: { wisdom: 1 },
    },
    {
        id: 3,
        name: "Lucky the Dealer",
        description: "Doubles down on every bet - 5x next spin score",
        effect: "Double Next Spin",
        price: 22222,
        maxSupply: 60,
        rarity: "Legendary",
        image: "/images/relics/lucky_the_dealer.png",
        cooldown: 9,
        stats: { charisma: 1 },
    },
    {
        id: 4,
        name: "Scorcher",
        description: "Master of the cursed 666 - Immediately End Session",
        effect: "End Session",
        price: 15555,
        maxSupply: 60,
        rarity: "Legendary",
        image: "/images/relics/scorcher.png",
        cooldown: 9,
        stats: { intelligence: 1 },
    },
    {
        id: 5,
        name: "Inferno",
        description: "Hell's marketplace demon - Free market refresh",
        effect: "Free Market Refresh",
        price: 11111,
        maxSupply: 100,
        rarity: "Legendary",
        image: "/images/relics/inferno.png",
        cooldown: 9,
        stats: { dexterity: 1 },
    },
];

const RARITY_COLORS: Record<string, string> = {
    Mythic: "#FF4444",
    Legendary: "#FFD700",
};

function formatChipPrice(price: number) {
    return price.toLocaleString("en-US");
}

function parseUint256(result: readonly string[]) {
    const low = BigInt(result[0] ?? "0");
    const high = BigInt(result[1] ?? "0");
    return low + (high << 128n);
}

export function Relics() {
    const navigate = useNavigate();
    const { chain } = useNetwork();
    const { account } = useController();
    const [ownedRelics, setOwnedRelics] = useState<number[]>([]);
    const [supplyData, setSupplyData] = useState<Record<number, { current: number; max: number }>>({});
    const [chipBalance, setChipBalance] = useState<bigint>(BigInt(0));
    const [chipPrices, setChipPrices] = useState<Record<number, bigint>>({});
    const [minting, setMinting] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
    const chipAddress = getChipAddress(chainId);
    const relicNftAddress = getRelicNftAddress(chainId);
    const provider = getRpcProvider(chainId);

    const loadData = useCallback(async () => {
        if (!account || !chipAddress || !relicNftAddress) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            // Load CHIP balance
            const chipResult = await provider.callContract({
                contractAddress: chipAddress,
                entrypoint: "balance_of",
                calldata: [account.address],
            });
            setChipBalance(parseUint256(chipResult) / BigInt(10 ** 18));

            // Load supply
            const supplies: Record<number, { current: number; max: number }> = {};
            const prices: Record<number, bigint> = {};
            for (const relic of RELICS) {
                try {
                    const res = await provider.callContract({
                        contractAddress: relicNftAddress,
                        entrypoint: "get_supply_info",
                        calldata: [relic.id.toString()],
                    });
                    supplies[relic.id] = {
                        current: Number(res[0]),
                        max: Number(res[1]),
                    };
                } catch (e) {
                    supplies[relic.id] = { current: 0, max: relic.maxSupply };
                }

                try {
                    const chipPriceResult = await provider.callContract({
                        contractAddress: relicNftAddress,
                        entrypoint: "get_relic_cost_in_token",
                        calldata: [relic.id.toString(), chipAddress],
                    });
                    prices[relic.id] = parseUint256(chipPriceResult);
                } catch (e) {
                    prices[relic.id] = BigInt(relic.price) * (10n ** 18n);
                }
            }
            setSupplyData(supplies);
            setChipPrices(prices);

            // Load owned
            const ownedTokensResult = await provider.callContract({
                contractAddress: relicNftAddress,
                entrypoint: "get_player_relics",
                calldata: [account.address],
            });

            const length = Number(ownedTokensResult[0]);
            const ownedIds = new Set<number>();
            for (let i = 0; i < length; i++) {
                const rLow = BigInt(ownedTokensResult[1 + i * 2]);
                const rHigh = BigInt(ownedTokensResult[1 + i * 2 + 1]);
                try {
                    const metaResult = await provider.callContract({
                        contractAddress: relicNftAddress,
                        entrypoint: "get_relic_metadata",
                        calldata: [rLow.toString(), rHigh.toString()]
                    });
                    const rId = Number(metaResult[0]);
                    if (rId > 0) ownedIds.add(rId);
                } catch (err) { /* ignore */ }
            }
            setOwnedRelics(Array.from(ownedIds));
        } catch (e) {
            console.error("Failed to load relic data:", e);
        } finally {
            setIsLoading(false);
        }
    }, [account, chainId, chipAddress, provider, relicNftAddress]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleMintWithChip = useCallback(async (relicId: number, amountWei: bigint) => {
        if (!account || !chipAddress) return;
        setMinting(relicId);
        try {
            const low = amountWei & ((1n << 128n) - 1n);
            const high = amountWei >> 128n;

            const tx = await account.execute([
                {
                    contractAddress: chipAddress,
                    entrypoint: "approve",
                    calldata: [relicNftAddress, low.toString(), high.toString()],
                },
                {
                    contractAddress: relicNftAddress,
                    entrypoint: "mint_relic_with_token",
                    calldata: [relicId.toString(), chipAddress],
                },
            ]);

            await provider.waitForTransaction(tx.transaction_hash);
            loadData();
        } catch (e) {
            console.error("Mint failed:", e);
        } finally {
            setMinting(null);
        }
    }, [account, chipAddress, loadData, provider, relicNftAddress]);

    return (
        <div style={{
            height: "100vh",
            overflowY: "auto",
            minHeight: "100vh",
            background: "#000",
            padding: "24px",
            fontFamily: "'PressStart2P', monospace",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
        }}>
            {isLoading && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.9)',
                    zIndex: 9999,
                    color: '#FF841C',
                }}>
                    Loading...
                </div>
            )}

            {/* Header */}
            <div style={{
                width: "100%",
                maxWidth: "1200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "32px",
            }}>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF841C",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 style={{ fontSize: "20px", color: "#FF841C", margin: 0 }}>RELICS</h1>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#FFD700",
                }}>
                    <img
                        src={CHIP_TOKEN_IMAGE_URL}
                        alt="CHIP"
                        width={25}
                        height={25}
                    />
                    <span>{chipBalance.toString()}</span>
                </div>
            </div>

            {/* Relic Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "24px",
                width: "100%",
                maxWidth: "1200px",
            }}>
                {RELICS.map((relic) => {
                    const supply = supplyData[relic.id] || { current: 0, max: relic.maxSupply };
                    const priceWei = chipPrices[relic.id] ?? BigInt(relic.price) * (10n ** 18n);
                    const chipPrice = priceWei / (10n ** 18n);
                    const isSoldOut = supply.current >= supply.max;
                    const canAffordChip = chipBalance >= chipPrice;
                    const isOwned = ownedRelics.includes(relic.id);
                    const rarityColor = RARITY_COLORS[relic.rarity];

                    return (
                        <motion.div
                            key={relic.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: "rgba(255, 132, 28, 0.05)",
                                border: `2px solid ${isOwned ? rarityColor : "rgba(255, 132, 28, 0.2)"}`,
                                borderRadius: "16px",
                                padding: "20px",
                                position: "relative",
                            }}
                        >
                            <div style={{
                                position: "absolute",
                                top: "12px",
                                right: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "8px",
                                background: rarityColor,
                                color: "#000",
                            }}>
                                {relic.rarity.toUpperCase()}
                            </div>

                            {isOwned && (
                                <div style={{
                                    position: "absolute",
                                    top: "12px",
                                    left: "12px",
                                    padding: "4px 8px",
                                    background: "#4ade80",
                                    borderRadius: "4px",
                                    fontSize: "8px",
                                    color: "#000",
                                }}>
                                    OWNED
                                </div>
                            )}

                            <div style={{
                                width: "100%",
                                height: "120px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "16px",
                            }}>
                                <img
                                    src={relic.image}
                                    alt={relic.name}
                                    style={{
                                        maxHeight: "100px",
                                        filter: isOwned ? "none" : "grayscale(100%) opacity(0.5)",
                                    }}
                                />
                            </div>

                            <h3 style={{ fontSize: "14px", color: isOwned ? "#fff" : "#888", marginBottom: "8px" }}>
                                {relic.name}
                            </h3>

                            <p style={{ fontSize: "9px", color: isOwned ? rarityColor : "#666", marginBottom: "12px" }}>
                                {relic.effect}
                            </p>

                            <p style={{ fontSize: "8px", color: "#666", lineHeight: "1.6", marginBottom: "16px", height: "40px" }}>
                                {relic.description}
                            </p>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "8px", color: "#666" }}>
                                <span>CD: {relic.cooldown}</span>
                                <span style={{ color: isSoldOut ? "#ef4444" : "#4ade80" }}>
                                    {isSoldOut ? "SOLD OUT" : `${supply.current}/${supply.max}`}
                                </span>
                            </div>

                            {!isOwned ? (
                                <>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        fontSize: "11px",
                                        color: "#FFD700",
                                        marginBottom: "12px",
                                        textAlign: "center",
                                    }}>
                                        <img
                                            src={CHIP_TOKEN_IMAGE_URL}
                                            alt="CHIP"
                                            width={18}
                                            height={18}
                                            style={{ objectFit: "contain" }}
                                        />
                                        <span>{formatChipPrice(Number(chipPrice))}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleMintWithChip(relic.id, priceWei)}
                                        disabled={isSoldOut || !canAffordChip || minting !== null}
                                        style={{
                                            width: "100%",
                                            padding: "12px",
                                            background: isSoldOut || !canAffordChip ? "rgba(255, 132, 28, 0.1)" : "#FF841C",
                                            border: "none",
                                            borderRadius: "8px",
                                            color: isSoldOut || !canAffordChip ? "#666" : "#000",
                                            fontSize: "10px",
                                            cursor: isSoldOut || !canAffordChip ? "not-allowed" : "pointer",
                                            fontFamily: "'PressStart2P', monospace",
                                        }}
                                    >
                                        {minting === relic.id
                                            ? "MINTING..."
                                            : isSoldOut
                                                ? "SOLD OUT"
                                                : !canAffordChip
                                                    ? "NEED CHIPS"
                                                    : "MINT"}
                                    </button>
                                </>
                            ) : (
                                <div style={{
                                    width: "100%",
                                    padding: "12px",
                                    background: "rgba(74, 222, 128, 0.1)",
                                    border: "1px solid #4ade80",
                                    borderRadius: "8px",
                                    color: "#4ade80",
                                    fontSize: "10px",
                                    textAlign: "center",
                                }}>
                                    IN COLLECTION
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
