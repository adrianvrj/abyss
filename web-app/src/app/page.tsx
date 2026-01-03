"use client";

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
      }}
    >
      <p
        style={{
          fontFamily: "'PressStart2P', monospace",
          fontSize: "14px",
          color: "#FFFFFF",
        }}
      >
        Loading...
      </p>
    </div>
  );
}

const MenuContent = dynamic(() => import("@/components/MenuContent"), {
  ssr: false,
  loading: () => <MenuLoading />,
});

export default function MenuPage() {
  return <MenuContent />;
}
