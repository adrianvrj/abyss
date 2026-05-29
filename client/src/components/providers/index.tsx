import { PropsWithChildren } from "react";
import { StarknetProvider } from "./StarknetProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { EntitiesProvider } from "@/context/entities";
import { BundlesProvider } from "@/context/bundles";
import { PracticeProvider } from "@/context/practice";
import { ControllerProvider } from "@/context/controller";

export function Providers({ children }: PropsWithChildren) {
    return (
        <QueryClientProvider client={queryClient}>
            <StarknetProvider>
                <ControllerProvider>
                    <PracticeProvider>
                        <EntitiesProvider>
                            <BundlesProvider>
                                {children}
                            </BundlesProvider>
                        </EntitiesProvider>
                    </PracticeProvider>
                </ControllerProvider>
            </StarknetProvider>
        </QueryClientProvider>
    );
}

export default Providers;
