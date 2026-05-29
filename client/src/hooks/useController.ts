import { useContext } from "react";
import {
    ControllerContext,
    type ControllerContextValue,
} from "@/lib/controllerContext";

export type UseControllerReturn = ControllerContextValue;

export function useController(): UseControllerReturn {
    const context = useContext(ControllerContext);
    if (!context) {
        throw new Error("useController must be used within ControllerProvider");
    }
    return context;
}
