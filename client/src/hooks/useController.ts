import { useContext } from "react";
import {
    StarkZapControllerContext,
    type StarkZapControllerContextValue,
} from "@/lib/starkzapControllerContext";

export type UseControllerReturn = StarkZapControllerContextValue;

export function useController(): UseControllerReturn {
    const context = useContext(StarkZapControllerContext);
    if (!context) {
        throw new Error("useController must be used within StarkZapControllerProvider");
    }
    return context;
}
