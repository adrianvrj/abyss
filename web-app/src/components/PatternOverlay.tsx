import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pattern } from '@/utils/patternDetector';

interface PatternOverlayProps {
    patterns: Pattern[];
    onPatternShow?: () => void; // Callback to play sound per pattern
}

export default function PatternOverlay({ patterns, onPatternShow }: PatternOverlayProps) {
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [phase, setPhase] = useState<'highlight' | 'score'>('highlight');
    const [flash, setFlash] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Reset when patterns input changes (new spin)
    useEffect(() => {
        if (patterns && patterns.length > 0) {
            setCurrentIndex(0);
            setPhase('highlight');
        } else {
            setCurrentIndex(-1);
        }
    }, [patterns]);

    // Manage Sequence
    useEffect(() => {
        if (currentIndex === -1 || !patterns || currentIndex >= patterns.length) return;

        // 1. Play sound at start of pattern
        if (onPatternShow) onPatternShow();

        // Trigger Flash
        setFlash(true);
        const flashTimer = setTimeout(() => setFlash(false), 100);

        // 2. Show score VERY quickly after highlight
        const timerScore = setTimeout(() => {
            setPhase('score');
        }, 100); // 0.1s pause (was 0.2s)

        // 3. Move to next pattern fast
        const timerNext = setTimeout(() => {
            if (currentIndex < patterns.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setPhase('highlight'); // Reset phase for next
            } else {
                setCurrentIndex(-1); // Finished
            }
        }, 600); // 0.6s total duration per pattern (was 1.2s)

        return () => {
            clearTimeout(flashTimer);
            clearTimeout(timerScore);
            clearTimeout(timerNext);
        };
    }, [currentIndex, patterns]);

    const renderFlash = () => {
        if (!mounted || !flash) return null;
        return createPortal(
            <div style={{
                position: 'fixed', /* Fixed relative to viewport */
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#fff',
                opacity: 0.15,
                zIndex: 99999, /* Top of the world */
                pointerEvents: 'none',
                animation: 'flashFade 0.1s ease-out forwards'
            }}>
                <style jsx>{`
                    @keyframes flashFade {
                        from { opacity: 0.3; }
                        to { opacity: 0; }
                    }
                `}</style>
            </div>,
            document.body
        );
    };

    if (currentIndex === -1 || !patterns || !patterns[currentIndex]) return null;

    const pattern = patterns[currentIndex];
    const animKey = `${currentIndex}`;

    return (
        <>
            {renderFlash()}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 50
            }}>
                <div key={animKey} style={{ position: 'absolute', width: '100%', height: '100%' }}>
                    {/* Highlight Boxes - Visible in 'highlight' and 'score' phases */}
                    {pattern.positions.map(([row, col]) => (
                        <div
                            key={`box-${row}-${col}`}
                            className="anim-box"
                            style={{
                                position: 'absolute',
                                top: `${(row / 3) * 100}%`,
                                left: `${(col / 5) * 100}%`,
                                width: '20%',
                                height: '33.33%',
                                padding: '4px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: `fadeInPulse 0.2s ease-out forwards`
                            }}
                        >
                            <div style={{
                                width: '100%',
                                height: '100%',
                                border: '3px solid #FF841C',
                                borderRadius: '8px',
                                /* Solid Style */
                                background: 'rgba(255, 132, 28, 0.1)',
                            }} />
                        </div>
                    ))}

                    {/* Score Popup - Visible only in 'score' phase */}
                    {phase === 'score' && (
                        <div
                            className="anim-popup"
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: '#000',
                                border: '3px solid #FF841C',
                                borderRadius: '12px',
                                padding: '12px 24px',
                                zIndex: 100,
                                boxShadow: '0 8px 20px rgba(0,0,0,0.8)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                minWidth: '80px',
                                animation: `popInCenter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
                            }}
                        >
                            <span style={{
                                fontFamily: "'PressStart2P', monospace",
                                color: '#FFEA00',
                                fontSize: '3vmin',
                                textShadow: '2px 2px 0px #000'
                            }}>+{pattern.score}</span>
                        </div>
                    )}
                </div>

                <style jsx>{`
                    @keyframes fadeInPulse {
                        0% { opacity: 0; transform: scale(0.9); }
                        100% { opacity: 1; transform: scale(1); }
                    }

                    @keyframes popInCenter {
                        0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
                        60% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                        100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    }
                `}</style>
            </div>
        </>
    );
}
