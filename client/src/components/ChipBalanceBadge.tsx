import { useEffect, useMemo, useState } from "react";
import { useNetwork } from "@starknet-react/core";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { DEFAULT_CHAIN_ID, getChipAddress } from "@/config";
import { readTokenSymbol, readUint256Balance } from "@/api/rpc/token";
import { useController } from "@/hooks/useController";
import { CHIP_TOKEN_IMAGE_URL } from "@/lib/constants";

const DECIMALS = 10n ** 18n;

function formatChipBalance(balance: bigint) {
  const whole = balance / DECIMALS;
  const fraction = balance % DECIMALS;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionString = fraction.toString().padStart(18, "0").slice(0, 2);
  return `${whole.toString()}.${fractionString}`;
}

export function ChipBalanceBadge() {
  const { isConnected, address } = useController();
  const { chain } = useNetwork();
  const { pathname } = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const chainId = chain?.id ?? DEFAULT_CHAIN_ID;
  const chipAddress = getChipAddress(chainId);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { data } = useQuery({
    queryKey: ["chip-balance", chainId.toString(), chipAddress, address],
    enabled: Boolean(isConnected && address),
    queryFn: async () => {
      if (!address) {
        return { balance: 0n, symbol: "CHIP" };
      }

      const [balance, symbol] = await Promise.all([
        readUint256Balance(chainId, chipAddress, address),
        readTokenSymbol(chainId, chipAddress),
      ]);

      return { balance, symbol };
    },
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const formattedBalance = useMemo(
    () => formatChipBalance(data?.balance ?? 0n),
    [data?.balance],
  );

  if (!isConnected || !address || pathname !== "/") {
    return null;
  }

  const mobilePlacement = {
    top: "16px",
    right: "auto",
    bottom: "auto",
    left: "16px",
    transform: "none",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: isMobile ? mobilePlacement.top : "24px",
        right: isMobile ? mobilePlacement.right : "auto",
        bottom: isMobile ? mobilePlacement.bottom : "auto",
        left: isMobile ? mobilePlacement.left : "24px",
        transform: isMobile ? mobilePlacement.transform : "none",
        zIndex: 950,
        pointerEvents: "none",
        maxWidth: isMobile ? "calc(100vw - 24px)" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "6px" : "10px",
          padding: isMobile ? "7px 10px" : "10px 12px",
          background: isMobile ? "rgba(0, 0, 0, 0.95)" : "rgba(0, 0, 0, 0.88)",
          border: "2px solid #FF841C",
          borderRadius: isMobile ? "12px" : "10px",
          boxShadow: isMobile
            ? "0 6px 18px rgba(0,0,0,0.35)"
            : "0 0 0 1px rgba(255, 132, 28, 0.12), 0 10px 24px rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          minWidth: isMobile ? "unset" : undefined,
        }}
      >
        <img
          src={CHIP_TOKEN_IMAGE_URL}
          alt="CHIP"
          width={isMobile ? 16 : 22}
          height={isMobile ? 16 : 22}
          style={{ flexShrink: 0, objectFit: "contain" }}
        />
        {isMobile ? (
          <span
            style={{
              fontFamily: "'PressStart2P', monospace",
              fontSize: "10px",
              color: "#FFB347",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {formattedBalance} {data?.symbol ?? "CHIP"}
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: "8px",
                color: "rgba(255,255,255,0.55)",
                letterSpacing: "1px",
                lineHeight: 1.2,
              }}
            >
              CHIP
            </span>
            <span
              style={{
                fontFamily: "'PressStart2P', monospace",
                fontSize: "11px",
                color: "#FFB347",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {formattedBalance} {data?.symbol ?? "CHIP"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChipBalanceBadge;
