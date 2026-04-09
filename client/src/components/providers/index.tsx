import { PropsWithChildren } from "react";
import { StarknetProvider } from "./StarknetProvider";
import ControllerButton from "@/components/ControllerButton";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { EntitiesProvider } from "@/context/entities";
import { BundlesProvider } from "@/context/bundles";

export function Providers({ children }: PropsWithChildren) {
    return (
        <QueryClientProvider client={queryClient}>
            <StarknetProvider>
                <EntitiesProvider>
                    <BundlesProvider>
                        {children}
                        <ControllerButton />
                    </BundlesProvider>
                </EntitiesProvider>
            </StarknetProvider>
        </QueryClientProvider>
    );
}

export default Providers;
