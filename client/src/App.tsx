import { Suspense, useCallback, useEffect, useState, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Providers } from "@/components/providers";
import { usePosthogPageviews } from "@/hooks/usePosthogPageviews";
import { AssetPreloaderProvider } from "@/components/providers/AssetPreloaderProvider";
import ChipBalanceBadge from "@/components/ChipBalanceBadge";
import ControllerButton from "@/components/ControllerButton";
import NewsModal from "@/components/modals/NewsModal";
import { DEFAULT_CHAIN_ID, getToriiUrl, getWorldAddress } from "@/config";
import { CONTROLLER_RPC_URL, cartridgeSlot } from "@/lib/controllerConfig";

const NEWS_VERSION = "charms-21-27";
const NEWS_STORAGE_KEY = "abyss_seen_news_version";

// Lazy load components
const MenuContent = lazy(() => import("@/components/MenuContent").then(m => ({ default: m.MenuContent })));
const SessionsContent = lazy(() => import("@/components/SessionsContent").then(m => ({ default: m.SessionsContent })));
const Leaderboard = lazy(() => import("@/components/Leaderboard").then(m => ({ default: m.Leaderboard })));
const Relics = lazy(() => import("@/components/Relics").then(m => ({ default: m.Relics })));
const Charms = lazy(() => import("@/components/Charms").then(m => ({ default: m.Charms })));
const Market = lazy(() => import("@/components/Market").then(m => ({ default: m.Market })));

// Loading component
function MenuLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
      }}
    >
      <p
        style={{
          fontFamily: "'PressStart2P', monospace",
          fontSize: "14px",
          color: "#FFFFFF",
        }}
      >
        Initializing World...
      </p>
    </div>
  );
}

const GameContent = lazy(() => import("@/components/GameContent").then(m => ({ default: m.GameContent })));

function GameRoute() {
  return (
    <AssetPreloaderProvider>
      <GameContent />
    </AssetPreloaderProvider>
  );
}

function PosthogPageviewListener() {
  usePosthogPageviews();
  return null;
}

function App() {
  const [showNewsModal, setShowNewsModal] = useState(false);

  useEffect(() => {
    // Hard reset of local state if on localhost to avoid WASM/stale-session crashes
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      const hasReset = sessionStorage.getItem("abyss_dev_reset");
      if (!hasReset) {
        localStorage.clear();
        sessionStorage.setItem("abyss_dev_reset", "true");
        // console.log("Dev: Local state cleared for clean initialization.");
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setShowNewsModal(window.localStorage.getItem(NEWS_STORAGE_KEY) !== NEWS_VERSION);
    } catch {
      setShowNewsModal(true);
    }
  }, []);

  const handleCloseNews = useCallback(() => {
    setShowNewsModal(false);
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(NEWS_STORAGE_KEY, NEWS_VERSION);
    } catch {
      // Ignore storage failures in private browsing or sandboxed iframes.
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return;
    }

    console.log("[ABYSS_BOOT] env", {
      defaultChain: import.meta.env.VITE_DEFAULT_CHAIN,
      chainId: DEFAULT_CHAIN_ID,
      rpcUrl: import.meta.env.VITE_STARKNET_RPC_URL,
      controllerRpcUrl: CONTROLLER_RPC_URL,
      toriiUrl: getToriiUrl(DEFAULT_CHAIN_ID),
      slot: cartridgeSlot,
      worldAddress: getWorldAddress(DEFAULT_CHAIN_ID),
      sessionBundleId: import.meta.env.VITE_SESSION_BUNDLE_ID,
    });
  }, []);

  return (
    <Providers>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <PosthogPageviewListener />
        <ChipBalanceBadge />
        <ControllerButton />
        <Suspense fallback={<MenuLoading />}>
          <Routes>
            <Route path="/" element={<MenuContent />} />
            <Route path="/sessions" element={<SessionsContent />} />
            <Route path="/practice" element={<GameRoute />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/relics" element={<Relics />} />
            <Route path="/charms" element={<Charms />} />
            <Route path="/market" element={<Market />} />
            <Route path="/game" element={<GameRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        {showNewsModal && <NewsModal onClose={handleCloseNews} />}
      </Router>
    </Providers>
  );
}

export default App;
