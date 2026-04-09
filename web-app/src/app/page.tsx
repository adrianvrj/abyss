"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

// Loading component while the actual menu loads
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
        className="animate-pulse"
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

export default function MenuPage() {
  return <></>;
}
