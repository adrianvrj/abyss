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
    top: "84px",
    right: "auto",
    bottom: "auto",
    left: "50%",
    transform: "translateX(-50%)",
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
          gap: isMobile ? "8px" : "10px",
          padding: isMobile ? "8px 10px" : "10px 12px",
          background: "rgba(0, 0, 0, 0.88)",
          border: "2px solid #FF841C",
          borderRadius: isMobile ? "999px" : "10px",
          boxShadow: "0 0 0 1px rgba(255, 132, 28, 0.12), 0 10px 24px rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
        }}
      >
        <img
          src={CHIP_TOKEN_IMAGE_URL}
          alt="CHIP"
          width={isMobile ? 18 : 22}
          height={isMobile ? 18 : 22}
          style={{ flexShrink: 0, objectFit: "contain" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span
            style={{
              fontFamily: "'PressStart2P', monospace",
              fontSize: isMobile ? "7px" : "8px",
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
              fontSize: isMobile ? "10px" : "11px",
              color: "#FFB347",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
            }}
          >
            {formattedBalance} {data?.symbol ?? "CHIP"}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ChipBalanceBadge;
