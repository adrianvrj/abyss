"use client";

import { PropsWithChildren } from "react";
import dynamic from "next/dynamic";

// CRITICAL: Load StarknetProvider with ssr: false to prevent SSR issues with ControllerConnector
const StarknetProviderClient = dynamic(
    () => import("./StarknetProvider").then((mod) => mod.StarknetProvider),
    { ssr: false }
);

// Load ControllerButton with ssr: false since it uses controller
const ControllerButton = dynamic(
    () => import("@/components/ControllerButton"),
    { ssr: false }
);

export function Providers({ children }: PropsWithChildren) {
    return (
        <StarknetProviderClient>
            {children}
            <ControllerButton />
        </StarknetProviderClient>
    );
}
