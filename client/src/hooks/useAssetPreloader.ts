import { useState, useEffect } from 'react';

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
            const img = new Image();
            img.src = src;
            img.onload = increment;
            img.onerror = increment; // Count errors as loaded to allow progress
        });

        // Preload Audio
        audio.forEach(src => {
            const sound = new Audio();
            sound.src = src;
            sound.oncanplaythrough = increment;
            sound.onerror = increment;
            sound.load();
        });

        return () => {
            mounted = false;
        };
    }, []); // Only run once on mount

    return { loaded, progress };
}
