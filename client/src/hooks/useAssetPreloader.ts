import { useState, useEffect } from 'react';

const loadedAssets = new Set<string>();

export function useAssetPreloader(images: string[], audio: string[]) {
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let mounted = true;
        let loadedCount = 0;
        const total = images.length + audio.length;

        if (total === 0) {
            setLoaded(true);
            setProgress(100);
            return;
        }

        const increment = () => {
            if (!mounted) return;
            loadedCount++;
            setProgress(Math.round((loadedCount / total) * 100));
            if (loadedCount >= total) {
                setLoaded(true);
            }
        };

        // Preload Images
        images.forEach(src => {
            if (loadedAssets.has(src)) {
                increment();
                return;
            }

            const img = new Image();
            const finalize = () => {
                loadedAssets.add(src);
                increment();
            };

            img.decoding = 'async';
            img.src = src;
            img.onload = finalize;
            img.onerror = finalize; // Count errors as loaded to allow progress
        });

        // Preload Audio
        audio.forEach(src => {
            if (loadedAssets.has(src)) {
                increment();
                return;
            }

            const sound = new Audio();
            const finalize = () => {
                loadedAssets.add(src);
                increment();
            };

            sound.preload = 'auto';
            sound.src = src;
            sound.oncanplaythrough = finalize;
            sound.onerror = finalize;
            sound.load();
        });

        return () => {
            mounted = false;
        };
    }, []); // Only run once on mount

    return { loaded, progress };
}
