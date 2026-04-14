import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAssetPreloader } from '@/hooks/useAssetPreloader';
import { PRELOAD_IMAGES, PRELOAD_AUDIO } from '@/config/assets';

interface AssetPreloaderContextType {
    isLoaded: boolean;
    progress: number;
}

const AssetPreloaderContext = createContext<AssetPreloaderContextType | undefined>(undefined);

export function AssetPreloaderProvider({ children }: { children: ReactNode }) {
    // We start preloading all assets immediately when this provider mounts
    const { loaded, progress } = useAssetPreloader(PRELOAD_IMAGES, PRELOAD_AUDIO);

    const value = useMemo(() => ({
        isLoaded: loaded,
        progress: progress
    }), [loaded, progress]);

    return (
        <AssetPreloaderContext.Provider value={value}>
            {children}
        </AssetPreloaderContext.Provider>
    );
}

export function useAssets() {
    const context = useContext(AssetPreloaderContext);
    if (context === undefined) {
        throw new Error('useAssets must be used within an AssetPreloaderProvider');
    }
    return context;
}
