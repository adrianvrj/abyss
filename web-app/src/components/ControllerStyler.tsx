"use client";

import { useEffect } from "react";

export function ControllerStyler() {
    useEffect(() => {
        const applyStyles = () => {
            // Selectors for various potential Cartridge elements
            const selectors = [
                '[id^="controller-"]',
                '[class*="cartridge"]',
                'iframe[src*="cartridge"]',
                '#dock',
                '#controller-dock',
                '#controller-ui-root'
            ];

            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach((el) => {
                    if (el instanceof HTMLElement) {
                        // Force styles with high priority
                        el.style.setProperty('bottom', 'auto', 'important');
                        el.style.setProperty('top', '10px', 'important');
                        el.style.setProperty('right', '10px', 'important');
                        el.style.setProperty('left', 'auto', 'important');
                        el.style.setProperty('position', 'fixed', 'important');
                        el.style.setProperty('z-index', '10000', 'important');
                    }
                });
            });
        };

        // Apply immediately
        applyStyles();

        // Apply on any DOM mutation (aggressive but necessary if it's dynamically injected)
        const observer = new MutationObserver((mutations) => {
            let shouldApply = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    shouldApply = true;
                    break;
                }
            }
            if (shouldApply) applyStyles();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also poll every 1s just in case
        const interval = setInterval(applyStyles, 1000);

        return () => {
            observer.disconnect();
            clearInterval(interval);
        };
    }, []);

    return null;
}
