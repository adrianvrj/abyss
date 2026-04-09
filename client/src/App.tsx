import { Suspense, useEffect, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Providers } from "@/components/providers";
import { ControllerStyler } from "@/components/ControllerStyler";
import ChipBalanceBadge from "@/components/ChipBalanceBadge";

// Lazy load components
const MenuContent = lazy(() => import("@/components/MenuContent").then(m => ({ default: m.MenuContent })));
const SessionsContent = lazy(() => import("@/components/SessionsContent").then(m => ({ default: m.SessionsContent })));
const Leaderboard = lazy(() => import("@/components/Leaderboard").then(m => ({ default: m.Leaderboard })));
const Relics = lazy(() => import("@/components/Relics").then(m => ({ default: m.Relics })));
const Charms = lazy(() => import("@/components/Charms").then(m => ({ default: m.Charms })));

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

function App() {
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

  return (
    <Providers>
      <ControllerStyler />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ChipBalanceBadge />
        <Suspense fallback={<MenuLoading />}>
          <Routes>
            <Route path="/" element={<MenuContent />} />
            <Route path="/sessions" element={<SessionsContent />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/relics" element={<Relics />} />
            <Route path="/charms" element={<Charms />} />
            <Route path="/game" element={<GameContent />} />
          </Routes>
        </Suspense>
      </Router>
    </Providers>
  );
}

export default App;
