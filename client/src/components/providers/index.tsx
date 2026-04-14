import { PropsWithChildren } from "react";
import { StarknetProvider } from "./StarknetProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { EntitiesProvider } from "@/context/entities";
import { BundlesProvider } from "@/context/bundles";
import { PracticeProvider } from "@/context/practice";
import { AssetPreloaderProvider } from "./AssetPreloaderProvider";

export function Providers({ children }: PropsWithChildren) {
    return (
        <QueryClientProvider client={queryClient}>
            <StarknetProvider>
                <AssetPreloaderProvider>
                    <PracticeProvider>
                        <EntitiesProvider>
                            <BundlesProvider>
                                {children}
                            </BundlesProvider>
                        </EntitiesProvider>
                    </PracticeProvider>
                </AssetPreloaderProvider>
            </StarknetProvider>
        </QueryClientProvider>
    );
}

export default Providers;
